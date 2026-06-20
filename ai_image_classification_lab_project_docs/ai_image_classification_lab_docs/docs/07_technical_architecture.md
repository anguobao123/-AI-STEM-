# 07 技术架构设计文档

## 1. 总体技术栈

前端：

1. Vue 3
2. Vite
3. Vue Router
4. Pinia
5. Element Plus
6. ECharts
7. TensorFlow.js
8. Canvas API

后端：

1. Flask
2. Flask-CORS
3. Flask-SQLAlchemy
4. SQLite

文件存储：

1. 本地 images 目录。
2. 本地 models 目录。
3. 本地 reports 目录。

## 2. 前端目录结构

```text
frontend/
├── public/
│   ├── models/
│   └── demo-datasets/
├── src/
│   ├── assets/
│   ├── components/
│   ├── views/
│   ├── router/
│   ├── store/
│   ├── utils/
│   └── App.vue
└── package.json
```

## 3. 后端目录结构

```text
backend/
├── app.py
├── models.py
├── routes/
│   ├── auth.py
│   ├── experiments.py
│   ├── reports.py
│   ├── files.py
│   └── gallery.py
├── services/
│   ├── report_service.py
│   └── file_service.py
├── uploads/
│   ├── images/
│   ├── models/
│   └── reports/
└── requirements.txt
```

## 4. TensorFlow.js 训练方案

MVP 使用 MobileNet 迁移学习。

流程：

1. 加载 MobileNet 模型作为特征提取器。
2. 用户图片统一 resize 到指定尺寸。
3. 使用 MobileNet 提取特征。
4. 构建轻量分类头。
5. 使用用户数据训练分类头。
6. 每轮训练回调更新 loss 和 accuracy。
7. 训练完成后保存模型与指标。
8. 测试图片通过同一预处理流程进行推理。

## 5. 前端核心工具模块

| 文件 | 职责 |
|---|---|
| `utils/tfTrainer.js` | 模型加载、训练、推理 |
| `utils/imagePreprocess.js` | 图片裁剪、resize、tensor 转换 |
| `utils/metrics.js` | 准确率、混淆矩阵、错误样本计算 |
| `utils/reportGenerator.js` | 报告模板填充 |
| `utils/request.js` | API 请求封装 |

## 6. 数据库设计

### users

| 字段 | 类型 | 说明 |
|---|---|---|
| id | INTEGER | 用户 ID |
| username | TEXT | 用户名 |
| password_hash | TEXT | 密码哈希 |
| nickname | TEXT | 昵称 |
| role | TEXT | 默认 student |
| create_time | DATETIME | 创建时间 |

### experiments

| 字段 | 类型 | 说明 |
|---|---|---|
| id | INTEGER | 实验记录 ID |
| user_id | INTEGER | 用户 ID |
| experiment_type | TEXT | 实验类型 |
| title | TEXT | 实验标题 |
| class_names | TEXT | JSON 字符串 |
| sample_count | TEXT | JSON 字符串 |
| train_config | TEXT | JSON 字符串 |
| metrics | TEXT | JSON 字符串 |
| model_path | TEXT | 模型路径 |
| create_time | DATETIME | 创建时间 |

### reports

| 字段 | 类型 | 说明 |
|---|---|---|
| id | INTEGER | 报告 ID |
| experiment_id | INTEGER | 实验 ID |
| objective | TEXT | 实验目的 |
| principle | TEXT | 实验原理 |
| process | TEXT | 实验过程 |
| result_summary | TEXT | 结果总结 |
| error_analysis | TEXT | 错误分析 |
| conclusion | TEXT | 结论 |
| create_time | DATETIME | 创建时间 |

### gallery_projects

| 字段 | 类型 | 说明 |
|---|---|---|
| id | INTEGER | 作品 ID |
| user_id | INTEGER | 作者 ID |
| experiment_id | INTEGER | 实验 ID |
| title | TEXT | 作品标题 |
| description | TEXT | 作品说明 |
| cover_image | TEXT | 封面路径 |
| accuracy | REAL | 准确率 |
| is_public | BOOLEAN | 是否公开 |
| create_time | DATETIME | 创建时间 |

## 7. API 设计

### 用户

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/auth/register` | 注册 |
| POST | `/api/auth/login` | 登录 |
| GET | `/api/auth/userinfo` | 获取当前用户 |

### 实验

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/experiments` | 创建实验记录 |
| GET | `/api/experiments/my` | 我的实验记录 |
| GET | `/api/experiments/:id` | 实验详情 |
| PUT | `/api/experiments/:id` | 更新实验结果 |
| DELETE | `/api/experiments/:id` | 删除实验 |

### 报告

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/reports` | 生成报告 |
| GET | `/api/reports/:id` | 报告详情 |
| PUT | `/api/reports/:id` | 修改报告 |
| GET | `/api/reports/:id/export` | 导出报告 |

### 作品展示

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/gallery` | 发布作品 |
| GET | `/api/gallery` | 公开作品列表 |
| GET | `/api/gallery/:id` | 作品详情 |

## 8. 性能风险与降级方案

| 风险 | 降级方案 |
|---|---|
| 浏览器训练慢 | 限制图片数量，提供推荐配置 |
| 模型加载失败 | 提供本地模型资源或重试提示 |
| 图片过大 | 上传前压缩和 resize |
| 内存占用高 | 限制每类最大图片数 |
| TensorFlow.js 兼容问题 | 提示使用最新版 Chrome / Edge |
