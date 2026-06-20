from playwright.sync_api import sync_playwright


PNG_1X1 = bytes.fromhex(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489"
    "0000000d49444154789c6360f8cfc000000301010018dd8db10000000049454e44ae426082"
)


def local_png(name):
    return {"name": name, "mimeType": "image/png", "buffer": PNG_1X1}


def capture_from_camera(page, entry_button, split="train"):
    entry_button.click()
    dialog = page.get_by_role("dialog", name="摄像头采集图片")
    dialog.wait_for()
    assert "请勿拍摄人脸" in dialog.inner_text()
    if split == "test":
        dialog.locator(".el-radio-button").filter(has_text="测试图片").click()
    dialog.get_by_role("button", name="开启摄像头").click()
    page.wait_for_function("document.querySelector('[data-testid=camera-video]').videoWidth > 0")
    dialog.get_by_role("button", name="拍摄", exact=True).click()
    page.get_by_test_id("camera-preview").wait_for()
    dialog.get_by_test_id("confirm-camera-capture").click()
    dialog.wait_for(state="hidden")


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(
        headless=True,
        args=["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"]
    )
    context = browser.new_context(viewport={"width": 1365, "height": 900})
    context.grant_permissions(["camera"], origin="http://127.0.0.1:5173")
    page = context.new_page()
    console_errors = []
    page_errors = []
    page.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    page.add_init_script("""
      window.__cameraTrackStops = 0;
      if (window.MediaStreamTrack && !MediaStreamTrack.prototype.__stopInstrumented) {
        const originalStop = MediaStreamTrack.prototype.stop;
        MediaStreamTrack.prototype.stop = function () {
          window.__cameraTrackStops += 1;
          return originalStop.call(this);
        };
        MediaStreamTrack.prototype.__stopInstrumented = true;
      }
    """)

    page.goto("http://127.0.0.1:5173/lab/sample-count")
    page.wait_for_load_state("networkidle")

    first_class = page.locator(".class-card").nth(0)
    second_class = page.locator(".class-card").nth(1)
    capture_from_camera(page, first_class.get_by_test_id("camera-button"))
    assert "1 张训练图片" in first_class.locator(".class-meta").inner_text()
    assert first_class.get_by_test_id("class-image-thumb").count() == 1
    assert "camera-" in first_class.locator(".thumb-image").get_attribute("alt")

    first_class.get_by_test_id("class-image-upload").set_input_files([local_png("banana-local.png")])
    second_class.get_by_test_id("class-image-upload").set_input_files([
        local_png("apple-local-01.png"), local_png("apple-local-02.png")
    ])
    for _ in range(19):
        page.locator(".param-row .stepper button").first.click()
    page.get_by_test_id("start-real-training").click()
    page.locator(".status-pill").filter(has_text="已完成").wait_for(timeout=60000)

    capture_from_camera(page, first_class.get_by_test_id("camera-button"), split="test")
    assert "测试 1 张" in page.locator(".dataset-row").nth(0).inner_text()
    assert page.get_by_test_id("test-image-thumb").count() == 1

    batch_groups = page.locator(".batch-item")
    batch_groups.nth(1).locator("input[type=file]").set_input_files([local_png("apple-test.png")])
    page.get_by_role("button", name="执行模型 1.0批量测试").click()
    page.locator(".metric-grid strong").nth(0).filter(has_text="2").wait_for(timeout=30000)

    page.get_by_test_id("test-image-thumb").first.locator(".thumb-remove").click()
    assert "测试 0 张" in page.locator(".dataset-row").nth(0).inner_text()
    first_class.get_by_test_id("class-image-thumb").first.locator(".thumb-remove").click()
    assert "1 张训练图片" in first_class.locator(".class-meta").inner_text()

    first_class.get_by_test_id("camera-button").click()
    dialog = page.get_by_role("dialog", name="摄像头采集图片")
    dialog.get_by_role("button", name="开启摄像头").click()
    page.wait_for_function("document.querySelector('[data-testid=camera-video]').videoWidth > 0")
    dialog.get_by_role("button", name="关闭", exact=True).click()
    dialog.wait_for(state="hidden")
    assert page.evaluate("window.__cameraTrackStops") >= 3

    page.evaluate("""() => {
      Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
        configurable: true,
        value: () => Promise.reject(new DOMException('permission denied for test', 'NotAllowedError'))
      });
      return true;
    }""")
    first_class.get_by_test_id("camera-button").click()
    dialog = page.get_by_role("dialog", name="摄像头采集图片")
    dialog.get_by_role("button", name="开启摄像头").click()
    error_text = page.get_by_test_id("camera-error")
    error_text.wait_for()
    assert "检查浏览器摄像头权限" in error_text.inner_text()
    dialog.get_by_role("button", name="关闭", exact=True).click()

    assert not page_errors, f"browser page errors: {page_errors}"
    assert not console_errors, f"browser console errors: {console_errors}"
    context.close()
    browser.close()
