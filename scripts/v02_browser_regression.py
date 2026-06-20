from __future__ import annotations

import asyncio
from pathlib import Path

from playwright.async_api import async_playwright


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "test-assets"
BASE = "http://127.0.0.1:5173"


async def assert_visible(page, test_id: str) -> None:
    await page.get_by_test_id(test_id).first.wait_for(timeout=120000)


async def main() -> None:
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1440, "height": 1400})

        pages = [
          ("/", ["AI", "后端服务"]),
          ("/guide", ["实验导学", "知识点"]),
          ("/experiments", ["控制变量实验列表", "样本数量对模型准确率的影响"]),
          ("/records", ["实验记录中心"]),
          ("/gallery", ["成果展示"]),
        ]

        for path, checks in pages:
            await page.goto(f"{BASE}{path}", wait_until="networkidle")
            body = await page.text_content("body")
            assert body
            for needle in checks:
                assert needle in body, f"missing {needle} on {path}"

        await page.goto(f"{BASE}/lab/sample-count", wait_until="networkidle")

        for test_id in [
            "lab-workbench",
            "class-panel",
            "train-panel",
            "preview-panel",
            "save-record",
        ]:
            await assert_visible(page, test_id)

        body = await page.text_content("body")
        assert body
        assert "保存本机模型" not in body
        assert "测试 IndexedDB 保存能力" not in body

        await page.locator(".segment-btn").nth(1).click()

        class_uploads = page.get_by_test_id("class-image-upload")
        await class_uploads.nth(0).set_input_files(
            [
                str(ASSETS / "class-a" / "a_01.png"),
                str(ASSETS / "class-a" / "a_02.png"),
                str(ASSETS / "class-a" / "a_03.png"),
            ]
        )
        await class_uploads.nth(1).set_input_files(
            [
                str(ASSETS / "class-b" / "b_01.png"),
                str(ASSETS / "class-b" / "b_02.png"),
                str(ASSETS / "class-b" / "b_03.png"),
            ]
        )

        await assert_visible(page, "class-image-thumb")

        await page.get_by_test_id("start-real-training").click()
        await page.wait_for_function(
            """
            () => {
              const text = document.body.innerText;
              return text.includes("模型已训练") || text.includes("训练失败");
            }
            """,
            timeout=120000,
        )

        body = await page.text_content("body")
        assert body and "训练失败" not in body

        await page.get_by_test_id("single-predict-upload").set_input_files(str(ASSETS / "class-a" / "a_04.png"))
        await page.get_by_role("button", name="开始预测").click()
        await assert_visible(page, "prediction-output")
        await page.get_by_role("button", name="加入测试结果").click()

        batch_uploads = page.locator(".batch-item input[type='file']")
        await batch_uploads.nth(0).set_input_files(str(ASSETS / "class-a" / "a_04.png"))
        await batch_uploads.nth(1).set_input_files(str(ASSETS / "class-b" / "b_04.png"))
        await page.get_by_role("button", name="开始批量测试").click()
        await assert_visible(page, "batch-test-summary")

        await page.get_by_test_id("save-record").click()
        await page.wait_for_url("**/analysis/*", timeout=120000)
        await page.goto(page.url.replace("/analysis/", "/report/"), wait_until="networkidle")
        report_body = await page.text_content("body")
        assert report_body and "标准实验报告" in report_body

        print("browser regression ok")
        await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
