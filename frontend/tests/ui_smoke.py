import json
import re
from playwright.sync_api import sync_playwright


PNG_1X1 = bytes.fromhex(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489"
    "0000000d49444154789c6360f8cfc000000301010018dd8db10000000049454e44ae426082"
)


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1365, "height": 900})
    console_errors = []
    page_errors = []
    page.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)
    page.on("pageerror", lambda error: page_errors.append(str(error)))

    page.goto("http://127.0.0.1:5173/lab/sample-count")
    page.wait_for_load_state("networkidle")
    page.locator(".project-info-grid .pi-input").nth(0).fill("刷新恢复测试")
    page.locator(".project-info-grid .pi-input").nth(1).fill("持久化小组")
    page.locator("#lab-step-project .pi-textarea").nth(1).fill("刷新后基础信息仍然存在")
    page.locator(".class-card input[type=file]").nth(0).set_input_files([
        {"name": "apple-01.png", "mimeType": "image/png", "buffer": PNG_1X1},
        {"name": "apple-02.png", "mimeType": "image/png", "buffer": PNG_1X1},
    ])
    page.locator(".class-card input[type=file]").nth(1).set_input_files([
        {"name": "banana-01.png", "mimeType": "image/png", "buffer": PNG_1X1},
        {"name": "banana-02.png", "mimeType": "image/png", "buffer": PNG_1X1},
    ])
    for _ in range(19):
        page.locator(".param-row .stepper button").first.click()
    page.get_by_test_id("start-real-training").click()
    page.locator(".status-pill").filter(has_text="已完成").wait_for(timeout=60000)
    page.wait_for_timeout(900)

    saved_session = page.evaluate("localStorage.getItem('tuiangfenlei:lab-session:sample-count')")
    assert saved_session and "刷新恢复测试" in saved_session
    assert json.loads(saved_session)["runtimeModelInfo"]

    variable_step = page.locator(".stem-step-chip").nth(1)
    variable_step.click()
    page.wait_for_timeout(400)
    assert variable_step.get_attribute("aria-current") == "step"
    assert page.locator("#lab-step-variable").bounding_box()["y"] < 220

    page.reload(wait_until="networkidle")
    assert page.get_by_text("已恢复上次实验", exact=True).is_visible()
    assert page.locator(".project-info-grid .pi-input").nth(0).input_value() == "刷新恢复测试"
    assert page.locator(".project-info-grid .pi-input").nth(1).input_value() == "持久化小组"
    assert page.locator(".thumb-item").count() == 4
    restored_status = page.locator(".status-pill").inner_text()
    if restored_status != "已完成":
        print("model restore status:", restored_status)
        print("model restore alerts:", page.locator(".el-alert").all_inner_texts())
        print("model restore page errors:", page_errors)
    assert restored_status == "已完成"
    assert "当前模型均已" in page.locator(".recovery-banner p").inner_text()
    assert page.get_by_role("button", name="进入模型 2.0").is_disabled()

    page.evaluate("""
      const key = 'tuiangfenlei:lab-session:sample-count';
      const session = JSON.parse(localStorage.getItem(key));
      session.batchTestResult = {
        summary: { testCount: 2, testCorrectCount: 1, testAccuracy: 0.5 },
        classMetrics: [], confusionMatrix: null, errorSamples: []
      };
      localStorage.setItem(key, JSON.stringify(session));
    """)
    page.route("**/api/**", lambda route: route.fulfill(status=503, content_type="application/json", body='{"error":"offline"}'))
    page.reload(wait_until="networkidle")
    try:
        page.wait_for_selector(".project-info-grid .pi-input", timeout=10000)
    except Exception:
        print("offline recovery body:", page.locator("body").inner_text())
        print("offline recovery console errors:", console_errors)
        print("offline recovery page errors:", page_errors)
        raise
    assert page.locator(".project-info-grid .pi-input").nth(0).input_value() == "刷新恢复测试"
    assert page.locator(".metric-grid strong").nth(0).inner_text() == "2"
    assert not page_errors, f"browser page errors: {page_errors}"
    console_errors.clear()  # The two expected HTTP 503 resource messages belong to the offline simulation.
    page.unroute("**/api/**")

    switch_button = page.get_by_role("button", name="进入模型 2.0")
    assert switch_button.is_disabled()
    assert "优化方案" in page.locator(".version-switch-hint").inner_text()
    page.locator(".opt-textarea").first.fill("补充不同背景和角度的训练图片")
    assert switch_button.is_enabled()
    switch_button.click()
    assert "模型 2.0" in page.locator(".page-subtitle").inner_text()
    assert page.locator(".project-info-grid .pi-input").nth(0).input_value() == "刷新恢复测试"
    assert page.locator(".project-info-grid .pi-input").nth(1).input_value() == "持久化小组"
    page.wait_for_timeout(500)
    version_session = json.loads(page.evaluate("localStorage.getItem('tuiangfenlei:lab-session:sample-count')"))
    assert version_session["versionHistory"][0]["accuracy"] == 0.5

    page.get_by_role("button", name=re.compile("继续实验")).click()
    page.set_viewport_size({"width": 390, "height": 844})
    page.wait_for_timeout(250)
    nav_overflows = page.locator(".stem-step-nav").evaluate("el => el.scrollWidth > el.clientWidth")
    assert nav_overflows
    assert not console_errors, f"browser console errors: {console_errors}"
    assert not page_errors, f"browser page errors: {page_errors}"

    browser.close()
