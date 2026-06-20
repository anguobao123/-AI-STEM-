import json
import subprocess
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent.parent
FRONTEND_ROOT = PROJECT_ROOT / "frontend"
FRONTEND_URL = "http://127.0.0.1:5173/lab/sample-count"
TEST_IMAGES_DIR = PROJECT_ROOT / ".tmp_test_images"


def run_node_script(script_content: str) -> int:
    result = subprocess.run(
        ["node", "--input-type=module", "--eval", script_content],
        cwd=FRONTEND_ROOT,
        text=True,
        capture_output=True,
        check=False,
        encoding="utf-8",
        errors="replace",
    )
    if result.stdout:
        sys.stdout.write(result.stdout)
    if result.stderr:
        sys.stderr.write(result.stderr)
    return result.returncode


def main() -> int:
    if not TEST_IMAGES_DIR.exists():
        sys.stderr.write(f"Missing test image directory: {TEST_IMAGES_DIR}\n")
        return 1

    script = f"""
import {{ chromium }} from 'playwright';

const baseDir = {json.dumps(str(TEST_IMAGES_DIR))};
const url = {json.dumps(FRONTEND_URL)};
const browser = await chromium.launch({{ headless: true }});
const page = await browser.newPage();
const consoleErrors = [];

page.on('console', (msg) => {{
  if (msg.type() === 'error') {{
    consoleErrors.push(msg.text());
  }}
}});

await page.goto(url, {{ waitUntil: 'networkidle' }});

await page.evaluate(() => {{
  const input = document.querySelector('input[type="radio"][value="real"]');
  if (!input) {{
    throw new Error('Real training mode radio input not found.');
  }}
  input.checked = true;
  input.dispatchEvent(new Event('change', {{ bubbles: true }}));
}});

await page.locator('button').nth(1).click();

const classInputs = page.locator('input[type="text"]');
const categoryInputs = page.locator('input[type="file"]');
if (await classInputs.count() < 2 || await categoryInputs.count() < 2) {{
  throw new Error('Expected class name and file inputs on dataset step.');
}}

await classInputs.nth(0).fill('Class A');
await classInputs.nth(1).fill('Class B');
await categoryInputs.nth(0).setInputFiles([
  `${{baseDir}}/classA_1.png`,
  `${{baseDir}}/classA_2.png`
]);
await categoryInputs.nth(1).setInputFiles([
  `${{baseDir}}/classB_1.png`,
  `${{baseDir}}/classB_2.png`
]);

await page.locator('button').nth(1).click();
await page.waitForTimeout(300);
await page.locator('button').nth(1).click();
await page.waitForTimeout(300);
await page.locator('button').nth(2).click();

for (let i = 0; i < 24; i += 1) {{
  await page.waitForTimeout(1000);
  const buttons = await page.locator('button').evaluateAll((nodes) =>
    nodes.map((node) => node.textContent?.trim()).filter(Boolean)
  );
  if (buttons.some((text) => text.includes('保存本机模型')) || buttons.some((text) => text.includes('IndexedDB'))) {{
    break;
  }}
}}

const buttonLabels = await page.locator('button').evaluateAll((nodes) =>
  nodes.map((node) => node.textContent?.trim()).filter(Boolean)
);

await page.locator('button').nth(3).click();
await page.waitForTimeout(1000);
await page.locator('button').nth(4).click();
await page.waitForSelector('text=/最小模型保存和加载成功|鏈€灏忔ā鍨嬩繚瀛樺拰鍔犺浇鎴愬姛/', {{ timeout: 30000 }});

const debugText = await page.locator('body').innerText();
const diag = {{
  url: page.url(),
  title: await page.title(),
  buttonLabels,
  consoleErrors,
  userAgent: await page.evaluate(() => navigator.userAgent),
  indexedDBAvailable: await page.evaluate(() => typeof window.indexedDB !== 'undefined'),
  pageTextIncludesMinimalSaveSuccess: /最小模型保存和加载成功|鏈€灏忔ā鍨嬩繚瀛樺拰鍔犺浇鎴愬姛/.test(debugText),
  pageTextIncludesRealSaveFailure: /模型保存失败|妯″瀷淇濆瓨澶辫触/.test(debugText),
  tfVersionVisible: debugText.match(/tfjs version:\\s*([^\\n]+)/)?.[1] || '',
  backendVisible: debugText.match(/debug backend:\\s*([^\\n]+)/)?.[1] || '',
  ensuredBackendVisible: debugText.match(/ensured backend:\\s*([^\\n]+)/)?.[1] || '',
  indexedDBVisible: debugText.match(/indexedDB available:\\s*([^\\n]+)/)?.[1] || '',
  tensorCountVisible: debugText.match(/tensor count:\\s*([^\\n]+)/)?.[1] || '',
  minimalResultLine: debugText.split('\\n').find((line) => /最小模型保存和加载成功|鏈€灏忔ā鍨嬩繚瀛樺拰鍔犺浇鎴愬姛/.test(line)) || '',
  realSaveLine: debugText.split('\\n').find((line) => /模型保存失败|妯″瀷淇濆瓨澶辫触/.test(line)) || ''
}};

console.log(JSON.stringify(diag, null, 2));
await browser.close();
"""

    return run_node_script(script)


if __name__ == "__main__":
    raise SystemExit(main())
