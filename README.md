# AI 图像分类虚拟实验室

## 项目定位

当前版本为 `v0.2` 教学演示型虚拟实验初版，聚焦以下闭环：

首页 → 导学 → 控制变量实验 → 教学演示 / 真实训练 → 单图预测 → 批量测试 → 分析页 → 报告页 → 成果展示

## 当前支持

- 导学知识页
- 控制变量实验列表
- 教学演示训练
- 浏览器端真实训练
- 单图预测
- 批量测试
- 混淆矩阵
- 实验记录
- 分析报告
- 成果展示

## 当前暂不支持

- 模型文件持久化
- 模型跨设备复用
- MobileNet
- 模型下载
- 后端模型保存

当前 `v0.2` 聚焦实验训练、测试、分析和报告生成。模型文件持久化和跨设备复用将在后续版本支持。

## 技术栈

- 前端：Vue 3、Vite、Vue Router、Pinia、Element Plus、ECharts、TensorFlow.js
- 后端：Flask、Flask-Cors、Flask-SQLAlchemy
- 数据库：SQLite

## 启动方式

前端：

```bash
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

后端：

```bash
cd backend
python -m pip install -r requirements.txt
python app.py
```

默认地址：

- 前端：`http://127.0.0.1:5173`
- 后端：`http://127.0.0.1:5000`

## 推荐演示路径

首页 → 导学 → 实验 → 样本数量实验 → 真实训练 → 单图预测 → 批量测试 → 保存记录 → 查看分析 → 查看报告 → 成果展示
