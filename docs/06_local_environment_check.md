# 06 本地环境检查报告

## 范围

本地开发环境、前后端启动链路、TensorFlow.js 浏览器能力和 IndexedDB 模型保存链路均已验证。

## 环境版本

- Node.js：`v24.14.0`
- npm：`11.9.0`
- Python：`3.13.3`
- pip：`25.1.1`
- TensorFlow.js：`4.22.0`

## 基础检查结果

1. `npm install` 成功。
2. `npm run build` 成功。
3. `python -m pip install -r requirements.txt` 成功。
4. 后端 `py_compile` 成功。
5. 前端路由 `/`、`/guide`、`/experiments`、`/lab/sample-count`、`/records`、`/gallery` 可访问。
6. 后端接口 `/api/health`、`/api/experiments/demo`、`/api/gallery/demo`、`/api/reports/demo`、`/api/records` 可访问。
7. Playwright 与 Chromium 可用。

## TensorFlow.js 与 IndexedDB 结论

- backend：`cpu`
- IndexedDB：可用
- 最小模型 `save -> load`：通过
- 真实训练模型保存：已切换为“Vue Proxy 规避 + 权重检查 + inference-only 重建保存”方案
- 浏览器自动化诊断结果表明：
  - 真实训练模型保存不再报 `Cannot read properties of undefined (reading 'backend')`
  - 控制台无阻断错误
  - 页面可显示 `rebuiltForSave = true`

## 数据落库结论

- SQLite 只保存 `summary.modelInfo`
- `summary.modelInfo` 包含：
  - `modelKey`
  - `savedAt`
  - `storage`
  - `localOnly`
  - `backend`
  - `rebuiltForSave`

## 限制

- 本机模型仅在当前浏览器 IndexedDB 中可用
- 不支持跨浏览器、跨设备复用
- 不上传后端
- 当前不提供模型导出、模型下载或后端模型文件存储
