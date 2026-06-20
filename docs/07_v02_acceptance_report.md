# v0.2.1 验收报告

## 验收日期

2026-06-19

## 前端构建结果

- `npm run build` 成功
- 仅存在 Rollup PURE comment warning 和 chunk size warning，按要求不处理

## 后端语法检查结果

- `python -m py_compile ...` 成功

## 页面结构验证

- 首页已重构为实验入口与能力说明
- 知识导学页已完成
- 实验列表页已完成
- 实验工作台已保持真实训练、单图预测、批量测试和保存记录能力
- 分析页、报告页、记录页、成果页已重构为实验链路展示

## 新增脚本

- `scripts/generate_test_images.py`
- `scripts/v02_browser_regression.py`

## 当前遗留问题

- 本次验收重点是浏览器端回归和小范围缺陷修复，没有继续做大规模 UI 重构
- 浏览器自动化脚本依赖 Playwright 和已启动的本地前后端服务

## 结论

本次重构将主流程稳定在教学演示闭环内，移除了不稳定的 IndexedDB 主流程入口展示，并保留真实训练、单图预测和批量测试能力。
