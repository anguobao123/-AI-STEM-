# 技术架构

## 分层

系统分为前端展示层、后端接口层和数据持久化层：

- 前端：Vite、Vue Router、Element Plus、ECharts、TensorFlow.js
- 后端：Flask Blueprint、SQLAlchemy
- 持久化：SQLite

SQLite 文件位于 `backend/instance/app.db`，用于保存实验记录。

## 当前版本技术范围

`v0.2` 重点支持：

- 控制变量实验页面
- 教学演示训练
- 浏览器端真实训练
- 单图预测
- 批量测试
- 实验记录保存
- 分析与报告生成

## 当前版本不做

- 模型文件后端保存
- 模型下载
- MobileNet
- 跨设备模型复用
- 不稳定的 IndexedDB 模型主流程入口

## 记录数据原则

- 实验记录保存参数、指标、混淆矩阵、错误样本和建议
- 不把浏览器本地模型文件作为系统主能力
- 所有分析与报告页面都应在没有本地模型文件的情况下正常工作
