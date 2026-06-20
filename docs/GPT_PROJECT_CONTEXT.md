# GPT 项目上下文报告：AI 图像分类虚拟实验室

## 0. 给 GPT 的阅读说明

本文件用于让无法直接访问代码仓库的 GPT 理解当前项目现状，并据此判断后续课程化改造方案。  
结论优先级如下：

1. 以代码证据为准，不以 README 为准。
2. 该项目当前已经具备“上传图片、分类组织、训练、单图预测、批量测试、混淆矩阵、实验记录、报告、成果展示”的主链路。
3. 目前存在若干“页面可达但实现不完整”或“逻辑存在缺陷”的问题，后续改造应优先修复核心链路，而不是先做大范围重构。
4. 本报告只覆盖当前仓库中可见的真实代码与配置，不把 README 中的口号当成已实现功能。

可引用的核心证据文件：

- `frontend/src/router/index.js`
- `frontend/src/views/Lab.vue`
- `frontend/src/views/Analysis.vue`
- `frontend/src/views/Report.vue`
- `frontend/src/views/RecordList.vue`
- `frontend/src/store/experimentStore.js`
- `frontend/src/utils/tfTrainer.js`
- `frontend/src/utils/reportMapper.js`
- `frontend/src/utils/modelExport.js`
- `backend/app.py`
- `backend/models.py`
- `backend/routes/records.py`
- `backend/routes/reports.py`
- `backend/routes/gallery.py`
- `backend/routes/files.py`

## 1. 本轮操作边界

- 本轮未修改业务代码。
- 本轮仅生成了 `docs/GPT_PROJECT_CONTEXT.md`。
- 本轮不提交 commit、不 push、不部署。
- 仍需关注当前工作区中已有的其他改动，尤其是 `frontend/src/views/Gallery.vue`。

## 2. 项目根目录与 Git 状态

- 项目根目录：`G:\Desktop\tuiangfenlei\0620-tuiangfenlei`
- `git status --short` 结果：
  - `M frontend/src/views/Gallery.vue`

说明：

1. 当前工作区并不完全干净。
2. 在本轮生成报告之前，仓库里已经存在 `frontend/src/views/Gallery.vue` 的未提交修改。
3. 本轮报告文件之外，没有额外改动其他文件。

## 3. 技术栈与启动方式

### 前端

- Vue 3
- Vite
- Vue Router
- Pinia
- Element Plus
- ECharts
- TensorFlow.js

证据：

- `frontend/package.json`
- `frontend/src/router/index.js`
- `frontend/src/store/experimentStore.js`
- `frontend/src/utils/tfTrainer.js`

### 后端

- Flask
- Flask-Cors
- Flask-SQLAlchemy
- SQLite

证据：

- `backend/requirements.txt`
- `backend/app.py`
- `backend/models.py`

### 启动命令

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

来自文件：

- `README.md`

说明：

1. README 给出了上述启动方式。
2. 代码层面也确实存在对应的前端和后端入口。
3. 但实际可运行性仍需以当前代码状态验证，不能只看 README。

## 4. 项目目录结构

### 顶层目录

- `frontend/`：Vue 前端应用
- `backend/`：Flask 后端应用
- `docs/`：项目说明文档
- `scripts/`：辅助脚本
- `test-assets/`：测试素材
- `ai_image_classification_lab_project_docs/`：项目文档资料集合

### 前端关键目录

- `frontend/src/router/`：页面路由
- `frontend/src/views/`：页面级组件
- `frontend/src/components/`：可复用展示组件
- `frontend/src/store/`：Pinia 状态
- `frontend/src/utils/`：API 封装、TensorFlow.js、报告映射、格式化等工具

### 后端关键目录

- `backend/routes/`：Flask 路由
- `backend/services/`：服务层
- `backend/models.py`：SQLAlchemy 数据模型
- `backend/instance/app.db`：SQLite 文件

### 说明

1. 这个项目是“前端实验台 + 后端记录存储 + 静态/示例数据接口”的组合。
2. 不是传统意义上把训练完全放在后端的架构。
3. 真正的模型训练主要发生在前端浏览器内的 TensorFlow.js 逻辑里。

## 5. 前端入口、路由与页面清单

### 入口文件

- `frontend/src/main.js`
- `frontend/src/App.vue`

说明：

1. `main.js` 是 Vue 应用挂载入口。
2. `App.vue` 承载整体布局和路由出口。

### 路由配置

文件：

- `frontend/src/router/index.js`

路由清单：

1. `/` -> `frontend/src/views/Home.vue`
   - 路由名：无显式 name
   - 用途：首页
   - 课程关系：入口导航页

2. `/guide` -> `frontend/src/views/Guide.vue`
   - 路由名：无显式 name
   - 用途：导学页
   - 课程关系：实验前知识导入

3. `/experiments` -> `frontend/src/views/ExperimentList.vue`
   - 路由名：无显式 name
   - 用途：实验列表
   - 课程关系：选择实验任务

4. `/lab/:experimentId` -> `frontend/src/views/Lab.vue`
   - 路由名：无显式 name
   - 用途：核心实验操作页
   - 课程关系：真正发生上传、训练、预测、批测、保存的页面

5. `/analysis/:recordId` -> `frontend/src/views/Analysis.vue`
   - 路由名：无显式 name
   - 用途：实验结果分析页
   - 课程关系：对训练结果、混淆矩阵、错误样本做解释

6. `/report/:recordId` -> `frontend/src/views/Report.vue`
   - 路由名：无显式 name
   - 用途：实验报告页
   - 课程关系：正式化输出与复制、打印

7. `/gallery` -> `frontend/src/views/Gallery.vue`
   - 路由名：无显式 name
   - 用途：成果展示页
   - 课程关系：展示作品或实验成果

8. `/community` -> `frontend/src/views/CommunityList.vue`
   - 路由名：`CommunityList`
   - 用途：社区分享列表
   - 课程关系：非核心实验主链路，但承接分享/展示

9. `/community/:shareId` -> `frontend/src/views/CommunityDetail.vue`
   - 路由名：`CommunityDetail`
   - 用途：社区分享详情
   - 课程关系：展示分享记录

10. `/model-import` -> `frontend/src/views/ModelImport.vue`
    - 路由名：`ModelImport`
    - 用途：导入模型测试
    - 课程关系：模型导入/测试补充功能

11. `/records` -> `frontend/src/views/RecordList.vue`
    - 路由名：`RecordList`
    - 用途：实验记录列表
    - 课程关系：回看、删除、导出模型

### 路由和课程流程关系

1. 首页负责入口导流。
2. 导学页负责解释实验前置知识。
3. 实验列表负责选择实验主题。
4. 实验页负责真实操作流程。
5. 分析页负责解释结果。
6. 报告页负责格式化输出。
7. 成果展示页负责面向展示场景。

结论：

- 路由结构已经覆盖课程化闭环的大部分关键页面。
- 但部分页面更像“静态示意 + 局部真实数据”，并非每个环节都是真实数据驱动。

## 6. 关键前端组件与职责

### `frontend/src/views/Home.vue`

- 职责：站点入口和导航聚合。
- 输入：无或少量静态数据。
- 输出：跳转到导学、实验、分析等页面。
- 课程相关性：高。
- 说明：偏导航页面，不是核心实验逻辑页。

### `frontend/src/views/Guide.vue`

- 职责：说明实验前的概念、变量控制、训练和分析方法。
- 输入：本地静态说明数据。
- 输出：阅读引导和跳转到实验列表。
- 课程相关性：高。
- 说明：属于教学文本页，不直接接入模型训练数据。

### `frontend/src/views/ExperimentList.vue`

- 职责：展示实验任务卡片，进入指定实验场景。
- 输入：实验列表/元信息。
- 输出：跳转到 `Lab.vue`。
- 课程相关性：高。
- 说明：实验主题选择页。

### `frontend/src/views/Lab.vue`

- 职责：核心实验台。
- 输入：
  - 图片文件
  - 实验参数 `epochs / batchSize / learningRate / imageSize`
  - 真实训练集和测试集文件
- 输出：
  - 训练结果
  - 单图预测结果
  - 批量测试结果
  - 混淆矩阵
  - 实验记录
  - 模型保存/导出信息
- 调用：
  - `frontend/src/utils/tfTrainer.js`
  - `frontend/src/utils/modelExport.js`
  - `frontend/src/utils/recordBuilder.js`
  - `frontend/src/utils/api.js`
  - `frontend/src/components/ConfusionMatrix.vue`
- 课程相关性：最高，属于整站核心。

### `frontend/src/views/Analysis.vue`

- 职责：展示实验分析结果、曲线、混淆矩阵、错误样本。
- 输入：`recordId`
- 输出：结构化分析内容。
- 调用：
  - `frontend/src/utils/api.js`
  - `frontend/src/utils/experimentContent.js`
  - `frontend/src/components/TrainingCurve.vue`
  - `frontend/src/components/ConfusionMatrix.vue`
- 课程相关性：高。

### `frontend/src/views/Report.vue`

- 职责：正式报告页。
- 输入：`recordId`
- 输出：报告正文、打印、复制。
- 调用：
  - `frontend/src/utils/api.js`
  - `frontend/src/utils/reportMapper.js`
- 课程相关性：高。

### `frontend/src/views/RecordList.vue`

- 职责：记录列表、筛选、删除、导出模型。
- 输入：记录列表。
- 输出：跳转分析页、报告页、删除记录、导出模型。
- 课程相关性：高。

### `frontend/src/views/Gallery.vue`

- 职责：成果展示页。
- 输入：展示数据。
- 输出：展示项目成果。
- 课程相关性：中到高。
- 说明：当前工作区已有未提交修改，后续审计/改造时要谨慎避免误覆盖。

### 其他组件

- `frontend/src/components/ConfusionMatrix.vue`：混淆矩阵展示
- `frontend/src/components/TrainingCurve.vue`：训练曲线展示
- `frontend/src/components/EmptyState.vue`：空状态
- `frontend/src/components/MetricCard.vue`：指标展示
- `frontend/src/components/ExperimentCard.vue`：实验卡片
- `frontend/src/components/SavedModelTester.vue`：保存模型测试
- `frontend/src/components/DatasetSummary.vue`：数据集摘要

## 7. 状态管理与核心数据结构

### Store 文件

- `frontend/src/store/experimentStore.js`

### 当前 store 内容

`state`：

```js
experiments: [
  { id, title, summary },
  ...
],
metrics: {
  accuracy,
  loss,
  classCount,
  sampleCount
}
```

### 关键观察

1. 这个 store 更像“实验示例数据仓库”，不是完整业务态中心。
2. 其中的实验项是静态 mock 数据。
3. 它可以支撑实验列表和概览，但不能代表真实训练数据流的全部。

### 关于训练/测试数据结构

真实训练和测试的数据结构主要在 `frontend/src/views/Lab.vue` 与 `frontend/src/utils/tfTrainer.js` 中形成，而不是在 store 中统一管理。

从代码能明确看到的数据结构包括：

- 类别对象：`{ id, name, files }`
- 文件条目：`{ id, file, url }`
- 批测条目：`{ classId, name, files }`
- 训练结果：`summary / chartData / datasetSummary / trainConfig / confusionMatrix / errorSamples / suggestions`

### 是否持久化

- 实验记录：是，依赖后端 SQLite。
- 图片文件：不是直接写入后端数据库，主要在前端以浏览器文件和对象 URL 方式临时持有。
- 模型：可以保存到 IndexedDB，也可以导出文件。

### 是否刷新后保留

1. 实验记录可通过后端读取回显。
2. 浏览器临时文件对象通常不会跨刷新保留。
3. IndexedDB 中保存的模型可以跨刷新保留，前提是浏览器存储未被清理。

## 8. 图片上传与数据流

### 图片从哪里选择

从 `frontend/src/views/Lab.vue` 可见，图片主要通过文件选择控件进入：

- 训练图：每个类别的文件输入
- 测试图：单张测试文件输入
- 批测图：每个类别下的批测文件输入

### 上传后的存储方式

在前端，文件最终会被包装成文件条目：

- `file`
- `url: URL.createObjectURL(file)`

这意味着：

1. 页面先在浏览器内保存临时对象 URL。
2. 预览图直接使用对象 URL。
3. 训练时再把 `File` 对象传给 TensorFlow.js 的预处理逻辑。

### 是否转成 base64 / ImageBitmap / Tensor

从当前代码可确认：

- 不是以 base64 作为主存储格式。
- 主要预览使用 object URL。
- 训练前通过 TensorFlow.js 预处理转成张量。

### 是否发送到后端

- 训练过程本身不依赖后端上传文件。
- 实验记录保存时，更多是保存结果和元信息，而不是把每张图片写入后端数据库。

### 是否保存到数据库

- 图片文件本身未见直接存入 SQLite。
- 记录、摘要、曲线、混淆矩阵等结构化结果会经由后端接口写入数据库。

### 是否跨页面保留

- 文件对象本身不跨页面持久化。
- 记录数据跨页面可通过后端 API 取回。
- 模型元信息可由本地 `localStorage` 和 IndexedDB 辅助保留。

### 训练集和测试集如何区分

从 `Lab.vue` 的实现看：

- 训练集：用于 `trainImageClassifier({ classFileMap: trainingEntries, ... })`
- 测试集：用于 `evaluateTestDataset({ model, classNames, testFileMap, ... })`

训练集和测试集是通过两个不同的文件映射状态分别维护的，不是同一个数组复用。

### 类别标签绑定位置

- 类别名称存放在 `classMap.value`
- 训练时通过 `activeClassEntries` 映射为 `className`
- 单图预测和批量测试都依赖 `trainedClassNames`

### 删除与清空

- 单张图片删除：`removeClassImage`
- 类别删除：`removeClass`
- 实验整体清空：`clearExperimentRuntime`
- 预测清空：`resetPrediction`
- 批测清空：`resetBatchFiles`

### 结论性数据流

图像选择 / 上传 -> 类别管理 -> 训练数据组织 -> TensorFlow.js 训练 -> 单图预测 -> 批量测试 -> 指标计算 -> 分析页 -> 报告页 -> 成果展示页

### 关键代码证据

- `frontend/src/views/Lab.vue`
- `frontend/src/utils/tfTrainer.js`
- `frontend/src/utils/modelExport.js`

## 9. TensorFlow.js 训练流程

### 相关文件

- `frontend/src/utils/tfTrainer.js`
- `frontend/src/utils/imagePreprocess.js`
- `frontend/src/views/Lab.vue`

### 使用的 tfjs 包

- `@tensorflow/tfjs`
- `@tensorflow/tfjs-backend-cpu`

### 是真浏览器端训练吗

是。核心训练逻辑在前端浏览器中执行，而不是交给后端 Flask。

证据：

- `trainImageClassifier()` 中直接调用 `tf.sequential()`、`model.fit()`、`model.evaluate()`。
- `ensureTfReady("cpu")` 和 `tf.setBackend()` 运行在前端环境。

### 输入图像预处理

从 `tfTrainer.js` 可见，训练与推理都依赖 `imagePreprocess.js` 的转换逻辑：

- `filesToDataset(activeClasses, imageSize)`
- `imageToTensor(image, imageSize)`
- `loadImageFromFile(file)`

可以确认：

1. 输入图片会先统一到 `imageSize`。
2. 预处理后进入张量管线。
3. 模型输入 shape 是 `[imageSize, imageSize, 3]`。

### 模型结构

`createImageClassifier(classCount, imageSize)`：

1. `flatten({ inputShape: [imageSize, imageSize, 3] })`
2. `dense({ units: 32, activation: "relu" })`
3. `dense({ units: 16, activation: "relu" })`
4. `dense({ units: classCount, activation: "softmax" })`

说明：

- 这是一个轻量级 CNN 之后的 MLP 风格分类器。
- 严格来说，它并不是卷积网络，而是 flatten 后的全连接分类器。

### 编译参数

```js
model.compile({
  optimizer: tf.train.adam(learningRate),
  loss: "categoricalCrossentropy",
  metrics: ["accuracy"]
});
```

### 训练参数

来自 `trainImageClassifier(options)`：

- `epochs`
- `batchSize`
- `learningRate`
- `imageSize`
- `validationSplit`

### 是否展示 loss / accuracy

是。

证据：

- `onEpochEnd` 收集 `accuracy / loss / valAccuracy / valLoss`
- `Lab.vue` 中把这些数据渲染到训练日志与图表

### 训练状态更新

- 通过 `onEpochEnd` 回调更新 `trainLogs`
- 通过 `trainProgress` 显示百分比进度
- 通过 `trainState` 控制运行、完成、失败状态

### 训练完成后的模型去向

训练得到的 `model` 会保留在前端组件状态中：

- `modelRef.value`

同时可进一步：

- 保存到 IndexedDB：`saveModelToIndexedDB()`
- 导出为文件：`exportModelFiles()`

### 是否持久化

是，支持 IndexedDB 持久化保存模型。

### 是否 dispose

是，代码中存在多处 `dispose()`：

- `xs?.dispose?.()`
- `ys?.dispose?.()`
- `predictionTensor.dispose?.()`
- `lossTensor?.dispose?.()`
- `accuracyTensor?.dispose?.()`
- `model?.dispose?.()`

### 内存风险

虽然有 dispose，但仍然要注意：

1. 多次训练/预测会产生大量 tensor。
2. 文件预览对象 URL 也要及时 revoke。
3. 若异常路径没走完清理逻辑，仍可能出现内存或对象泄漏。

### 关键代码证据

- `frontend/src/utils/tfTrainer.js: trainImageClassifier`
- `frontend/src/utils/tfTrainer.js: predictImage`
- `frontend/src/utils/tfTrainer.js: evaluateTestDataset`
- `frontend/src/views/Lab.vue`

## 10. 单图预测流程

### 入口页面

- `frontend/src/views/Lab.vue`

### 入口函数

- `predictImage(model, file, classNames, imageSize = 64)` in `frontend/src/utils/tfTrainer.js`

### 处理流程

1. 校验 `model` 是否存在。
2. 校验 `file instanceof File`。
3. 读取图片文件。
4. `imageToTensor(image, imageSize).expandDims(0)` 构造输入。
5. `model.predict(inputTensor)`。
6. 从输出中取 `probabilities`。
7. 根据置信度排序。
8. 输出：
   - `predictedLabel`
   - `confidence`
   - `topPredictions`

### 是否显示置信度

是。

### 是否显示各类概率条

是，`Lab.vue` 中通过 `predictionRows` 和进度条渲染 top predictions。

### 是否支持测试集图片预测

是，单图预测页面也允许对上传测试图进行预测。

### 关键代码证据

- `frontend/src/utils/tfTrainer.js: predictImage`
- `frontend/src/views/Lab.vue`

## 11. 批量测试、准确率、每类准确率、错误样本

### 是否支持批量测试

是。

### 批量测试入口

- `frontend/src/views/Lab.vue` 中的批量测试区域
- 底层函数：`evaluateTestDataset(options)`

### 使用的图片来源

来自 `testFileMap`，按类别分组组织。

### 是否有真实标签

有。每个类别项都带 `className`，因此批测时可以对照真实标签和预测标签。

### 批量测试执行方式

1. 遍历每个类别项。
2. 遍历该类别下的每个文件。
3. 调用 `predictImage()`。
4. 记录：
   - `imageName`
   - `trueLabel`
   - `predictedLabel`
   - `confidence`
   - `isCorrect`
5. 构造混淆矩阵和每类指标。

### 结果保存结构

`evaluateTestDataset()` 返回：

- `summary`
- `classMetrics`
- `confusionMatrix`
- `testResults`
- `errorSamples`

### 总体准确率

通过：

```js
testCorrectCount / testResults.length
```

### 错误率

通过：

```js
1 - testAccuracy
```

### 每类准确率

通过每类样本的：

```js
correct / total
```

### 错误样本展示

错误样本在结果对象中包含：

- 原始图像名
- 真值
- 预测值
- 置信度
- 原因描述

### 是否支持学生解释“为什么错”

部分支持。

理由：

- 错误样本里保留了 `reason` 字段。
- 报告页和分析页都展示了错误原因文本。

但这更多是启发式解释，不是模型可解释性算法本身。

### 关键代码证据

- `frontend/src/utils/tfTrainer.js: evaluateTestDataset`
- `frontend/src/views/Analysis.vue`
- `frontend/src/utils/reportMapper.js`

## 12. 混淆矩阵与图表分析

### 是否有混淆矩阵

有。

### 生成位置

- `frontend/src/utils/tfTrainer.js: buildConfusionMatrix()`

### 方向是否明确

是，矩阵行对应真实类别，列对应预测类别。

### 显示数值

是，混淆矩阵中的每个格子都是计数值。

### 前端展示

- `frontend/src/components/ConfusionMatrix.vue`
- `frontend/src/views/Analysis.vue`
- `frontend/src/views/Lab.vue`

### 是否能看出最容易混淆的类别

可以。

依据：

1. 行列交叉计数。
2. 错误样本列表。
3. 分析页中的文本解释。

### 是否足够支撑第 5 课“用数据优化模型”

当前已具备基础能力，但深度有限。

原因：

1. 有混淆矩阵和错误样本。
2. 有训练曲线。
3. 有准确率对比和批测。

不足：

1. 没看到更丰富的实验设计比较框架。
2. 没看到系统化的版本对比分析面板。
3. 对模型改进方案的记录仍然偏文本化。

### 关键代码证据

- `frontend/src/utils/tfTrainer.js`
- `frontend/src/components/ConfusionMatrix.vue`
- `frontend/src/views/Analysis.vue`

## 13. 实验记录、报告页、成果展示页

### 实验记录保存位置

- 前端通过 `createRecord()` 调后端。
- 后端落库到 SQLite。

证据：

- `frontend/src/utils/api.js`
- `frontend/src/views/Lab.vue`
- `backend/routes/records.py`
- `backend/models.py`

### 报告页位置

- `frontend/src/views/Report.vue`

### 成果展示页位置

- `frontend/src/views/Gallery.vue`

### 报告数据来源

- 主来源是记录对象 `record`
- 若真实记录获取失败，页面会回退到 demo 数据：
  - `frontend/src/utils/api.js`
  - `backend/routes/records.py`
  - `backend/routes/reports.py`

### 是否自动汇总实验数据

部分支持。

证据：

- `backend/routes/records.py` 的 `list_records()` 会从记录中提取 `summary / datasetSummary / trainConfig / confusionMatrix / modelInfo`
- `frontend/src/utils/reportMapper.js` 会把记录映射成报告结构

### 记录字段

当前记录中会保存或回显的字段包括：

- `experimentId`
- `title`
- `objective`
- `status`
- `datasetSummary`
- `trainConfig`
- `summary`
- `chartData`
- `confusionMatrix`
- `errorSamples`
- `suggestions`

### 报告是否支持打印/复制

是。

证据：

- `frontend/src/views/Report.vue`

### 报告是否支持模型 1.0 / 2.0 对比

当前代码中没有看到成体系的模型版本对比面板。

结论：

- 仅有局部的“模型信息”或“模型导出/保存”。
- 未见完整的模型 1.0 / 2.0 对比工作流。

### 关键代码证据

- `frontend/src/views/Report.vue`
- `frontend/src/views/RecordList.vue`
- `frontend/src/utils/reportMapper.js`
- `frontend/src/utils/modelExport.js`
- `backend/routes/records.py`
- `backend/routes/reports.py`

## 14. 后端 API 与数据库

### Flask app

文件：

- `backend/app.py`

关键逻辑：

1. `Flask(__name__)`
2. `app.config.from_object(Config)`
3. `CORS(app)`
4. `db.init_app(app)`
5. `db.create_all()`
6. 注册多个 blueprint

### 路由文件

- `backend/routes/auth.py`
- `backend/routes/community.py`
- `backend/routes/experiments.py`
- `backend/routes/files.py`
- `backend/routes/gallery.py`
- `backend/routes/records.py`
- `backend/routes/reports.py`

### 数据模型

文件：

- `backend/models.py`

模型：

- `User`
- `ExperimentRecord`
- `Report`
- `GalleryProject`
- `CommunityShare`

### SQLite 文件位置

- `backend/instance/app.db`

### 记录是否保存

是。`ExperimentRecord` 是核心持久化表。

### 图片是否保存

未见当前主链路将原始图片写入数据库。

### 后端是否参与模型训练

不参与。

后端主要做：

1. 记录保存
2. 记录读取
3. demo 数据返回
4. 社区分享
5. 资源展示

### API 一览

#### 健康检查

- 方法：GET
- 路径：`/api/health`
- 功能：健康状态
- 请求字段：无
- 返回字段：`code / msg / data.status`
- 前端调用：`frontend/src/utils/api.js:getHealth()`
- 是否需改造：一般不需要

#### 实验 demo

- 方法：GET
- 路径：`/api/experiments/demo`
- 功能：返回实验 demo
- 前端调用：`frontend/src/utils/api.js:getDemoExperiments()`
- 是否需改造：取决于课程化内容

#### 图库 demo

- 方法：GET
- 路径：`/api/gallery/demo`
- 功能：返回展示页 demo 项目
- 前端调用：`frontend/src/utils/api.js:getDemoGallery()`
- 是否需改造：可能需要

#### 报告 demo

- 方法：GET
- 路径：`/api/reports/demo`
- 功能：返回报告 demo
- 前端调用：`frontend/src/utils/api.js:getDemoReport()`
- 是否需改造：可能需要

#### 实验 lab demo

- 方法：GET
- 路径：`/api/lab/demo/<experiment_id>`
- 功能：返回实验页 demo 任务数据
- 前端调用：`frontend/src/utils/api.js:getLabDemo(experimentId)`
- 是否需改造：可能需要

#### 记录 demo

- 方法：GET
- 路径：`/api/records/demo/<record_id>`
- 功能：返回 demo 记录
- 前端调用：`frontend/src/utils/api.js:getDemoRecord(recordId)`
- 是否需改造：可能需要

#### 从记录生成报告 demo

- 方法：GET
- 路径：`/api/reports/from-record/<record_id>`
- 功能：根据 demo 记录返回报告样式数据
- 前端调用：`frontend/src/utils/api.js:getReportFromRecord(recordId)`
- 是否需改造：可能需要

#### 创建记录

- 方法：POST
- 路径：`/api/records`
- 功能：保存实验记录
- 请求字段：记录 payload
- 返回字段：`recordId`
- 前端调用：`frontend/src/utils/api.js:createRecord(payload)`
- 是否需改造：后续很可能需要加强字段校验与模型信息保存

#### 获取单条记录

- 方法：GET
- 路径：`/api/records/<record_id>`
- 功能：读取记录详情
- 前端调用：`frontend/src/utils/api.js:getRecord(recordId)`
- 是否需改造：可能需要

#### 删除记录

- 方法：DELETE
- 路径：`/api/records/<record_id>`
- 功能：删除记录
- 前端调用：`frontend/src/utils/api.js:deleteRecord(recordId)`
- 是否需改造：可能需要增加权限或确认逻辑

#### 记录列表

- 方法：GET
- 路径：`/api/records`
- 功能：返回记录列表
- 前端调用：`frontend/src/utils/api.js:getRecordList()`
- 是否需改造：大概率需要增强筛选字段和模型字段

#### 社区分享

- 方法：POST / GET / GET / DELETE
- 路径：`/api/community/shares...`
- 功能：分享记录与查看分享详情
- 前端调用：`frontend/src/utils/api.js:createCommunityShare()` 等
- 是否需改造：不在本轮核心结论范围内

### 后端是否是课程化改造必要部分

结论：是，但主要作为实验记录、结果和分享的持久化层，不是训练主引擎。

### 关键代码证据

- `backend/app.py`
- `backend/models.py`
- `backend/routes/records.py`
- `backend/routes/reports.py`
- `frontend/src/utils/api.js`

## 15. 当前功能矩阵

以下判断基于代码，不基于 README 文案。

### 1. 创建或选择实验主题

- 当前状态：已完整支持
- 代码证据：
  - `frontend/src/views/Home.vue`
  - `frontend/src/views/Guide.vue`
  - `frontend/src/views/ExperimentList.vue`
  - `frontend/src/router/index.js`
- 对课程价值：高
- 是否需要改造：可能需要课程文案升级

### 2. 创建分类类别

- 当前状态：已完整支持
- 代码证据：
  - `frontend/src/views/Lab.vue`
- 对课程价值：高
- 是否需要改造：视课程目标而定

### 3. 上传训练图片

- 当前状态：已完整支持
- 代码证据：
  - `frontend/src/views/Lab.vue`
- 对课程价值：高
- 是否需要改造：可能需要更好的批量与文件夹体验

### 4. 上传测试图片

- 当前状态：已完整支持
- 代码证据：
  - `frontend/src/views/Lab.vue`
- 对课程价值：高
- 是否需要改造：可能需要

### 5. 明确区分训练集和测试集

- 当前状态：已完整支持
- 代码证据：
  - `frontend/src/views/Lab.vue`
- 对课程价值：高
- 是否需要改造：可能需要可视化增强

### 6. 图片预览

- 当前状态：已完整支持
- 代码证据：
  - `frontend/src/views/Lab.vue`
- 对课程价值：高
- 是否需要改造：可能需要

### 7. 图片删除

- 当前状态：已完整支持
- 代码证据：
  - `frontend/src/views/Lab.vue`
- 对课程价值：中到高
- 是否需要改造：可能需要更明确的撤销提示

### 8. 每类训练图片数量统计

- 当前状态：已完整支持
- 代码证据：
  - `frontend/src/views/Lab.vue`
  - `frontend/src/utils/tfTrainer.js`
- 对课程价值：高
- 是否需要改造：可能需要

### 9. 每类测试图片数量统计

- 当前状态：已完整支持
- 代码证据：
  - `frontend/src/utils/tfTrainer.js`
- 对课程价值：高
- 是否需要改造：可能需要

### 10. 教学演示训练

- 当前状态：已完整支持
- 代码证据：
  - `frontend/src/views/Lab.vue`
  - `frontend/src/views/Guide.vue`
- 对课程价值：高
- 是否需要改造：可能需要

### 11. 浏览器端真实训练

- 当前状态：已完整支持
- 代码证据：
  - `frontend/src/utils/tfTrainer.js`
- 对课程价值：高
- 是否需要改造：可能需要优化训练性能和内存控制

### 12. 模型训练状态展示

- 当前状态：已完整支持
- 代码证据：
  - `frontend/src/views/Lab.vue`
- 对课程价值：高
- 是否需要改造：可能需要

### 13. 模型训练参数展示

- 当前状态：已完整支持
- 代码证据：
  - `frontend/src/views/Lab.vue`
- 对课程价值：高
- 是否需要改造：可能需要

### 14. 模型版本概念

- 当前状态：部分支持
- 代码证据：
  - `frontend/src/views/Lab.vue`
  - `frontend/src/utils/modelExport.js`
  - `frontend/src/utils/tfTrainer.js`
- 对课程价值：高
- 是否需要改造：是，建议把版本展示做成显式教学对象

### 15. 单图预测

- 当前状态：已完整支持
- 代码证据：
  - `frontend/src/utils/tfTrainer.js`
  - `frontend/src/views/Lab.vue`
- 对课程价值：高
- 是否需要改造：可能需要

### 16. 各类别置信度或概率展示

- 当前状态：已完整支持
- 代码证据：
  - `frontend/src/views/Lab.vue`
  - `frontend/src/utils/tfTrainer.js`
- 对课程价值：高
- 是否需要改造：可能需要

### 17. 批量测试

- 当前状态：已完整支持
- 代码证据：
  - `frontend/src/views/Lab.vue`
  - `frontend/src/utils/tfTrainer.js`
- 对课程价值：高
- 是否需要改造：可能需要

### 18. 批量测试结果表

- 当前状态：已完整支持
- 代码证据：
  - `frontend/src/utils/tfTrainer.js`
- 对课程价值：高
- 是否需要改造：可能需要

### 19. 总体准确率

- 当前状态：已完整支持
- 代码证据：
  - `frontend/src/utils/tfTrainer.js`
- 对课程价值：高
- 是否需要改造：可能需要

### 20. 错误率

- 当前状态：已完整支持
- 代码证据：
  - `frontend/src/utils/tfTrainer.js`
- 对课程价值：中到高
- 是否需要改造：可能需要

### 21. 每类准确率

- 当前状态：已完整支持
- 代码证据：
  - `frontend/src/utils/tfTrainer.js`
- 对课程价值：高
- 是否需要改造：可能需要

### 22. 混淆矩阵

- 当前状态：已完整支持
- 代码证据：
  - `frontend/src/utils/tfTrainer.js`
  - `frontend/src/components/ConfusionMatrix.vue`
- 对课程价值：高
- 是否需要改造：可能需要

### 23. 错误样本展示

- 当前状态：已完整支持
- 代码证据：
  - `frontend/src/utils/tfTrainer.js`
  - `frontend/src/views/Analysis.vue`
  - `frontend/src/views/Report.vue`
- 对课程价值：高
- 是否需要改造：可能需要

### 24. 实验记录保存

- 当前状态：已完整支持
- 代码证据：
  - `frontend/src/views/Lab.vue`
  - `backend/routes/records.py`
- 对课程价值：高
- 是否需要改造：大概率需要增强字段完整性

### 25. 分析报告页

- 当前状态：已完整支持
- 代码证据：
  - `frontend/src/views/Analysis.vue`
  - `frontend/src/utils/reportMapper.js`
- 对课程价值：高
- 是否需要改造：可能需要修复映射缺陷

### 26. 成果展示页

- 当前状态：已完整支持
- 代码证据：
  - `frontend/src/views/Gallery.vue`
  - `backend/routes/gallery.py`
- 对课程价值：中到高
- 是否需要改造：可能需要

### 27. 报告导出、打印或复制

- 当前状态：已完整支持
- 代码证据：
  - `frontend/src/views/Report.vue`
- 对课程价值：高
- 是否需要改造：可能需要增强导出格式

### 28. 数据持久化方式

- 当前状态：部分支持
- 代码证据：
  - `backend/models.py`
  - `frontend/src/utils/tfTrainer.js`
  - `frontend/src/utils/modelExport.js`
- 对课程价值：高
- 是否需要改造：是，尤其是模型与记录的统一管理

### 29. 模型持久化方式

- 当前状态：部分支持
- 代码证据：
  - `frontend/src/utils/tfTrainer.js`
  - `frontend/src/utils/modelExport.js`
  - `frontend/src/views/Lab.vue`
- 对课程价值：高
- 是否需要改造：是，建议补全“版本、元数据、导入导出”闭环

### 30. 摄像头采集图片

- 当前状态：未支持
- 代码证据：未找到代码证据
- 对课程价值：当前阶段非必需
- 是否需要改造：视后续课程目标决定

## 16. STEM 适配度判断

### S 科学探究

当前支持情况：部分支持

代码证据：

- 有变量实验思想：`frontend/src/views/Guide.vue`、`frontend/src/views/Lab.vue`
- 有样本量、epoch、类别相似度、数据增强等实验变量概念：`frontend/src/utils/experimentContent.js`、`frontend/src/store/experimentStore.js`
- 有准确率、错误率、混淆矩阵、错误样本分析：`frontend/src/utils/tfTrainer.js`

缺口：

1. 缺少更加系统的实验设计面板。
2. 缺少严谨的实验对照版本管理。
3. 缺少面向学生提交的结构化实验记录编辑能力。

对课程影响：

- 能支持“变量实验”的基本探究。
- 对“严格科学探究流程”的支撑仍偏轻量。

改造建议：

- 强化实验变量显式配置和对比展示。
- 补充训练集 / 测试集 / 对照组的结构化定义。

### T 技术实现

当前支持情况：已完整支持

代码证据：

- 图片上传和预览：`frontend/src/views/Lab.vue`
- TensorFlow.js 训练：`frontend/src/utils/tfTrainer.js`
- 单图预测：`frontend/src/utils/tfTrainer.js`
- 批量测试：`frontend/src/utils/tfTrainer.js`
- 后端记录保存：`backend/routes/records.py`

缺口：

1. 训练在浏览器端运行，性能依赖客户端设备。
2. 模型导入导出虽然存在，但没有形成特别完整的版本库式管理。

改造建议：

- 优化训练过程中的资源释放。
- 增加模型导出/导入后的元数据管理。

### E 工程优化

当前支持情况：部分支持

代码证据：

- 模型保存到 IndexedDB：`frontend/src/utils/tfTrainer.js`
- 模型导出为文件：`frontend/src/utils/tfTrainer.js`
- 记录保存到 SQLite：`backend/models.py`、`backend/routes/records.py`

缺口：

1. 看到了保存，但没看到强版本化的模型管理界面。
2. 没看到完整的模型 1.0 / 2.0 对比工作流。
3. 错误处理和边界校验还可以进一步加强。

改造建议：

- 增加模型版本元信息面板。
- 强化保存、导出、导入、对比的统一入口。

### M 数学分析

当前支持情况：已完整支持基础分析

代码证据：

- `accuracy`
- `loss`
- `classMetrics`
- `confusionMatrix`
- `errorSamples`

缺口：

1. 当前分析仍以工程指标为主。
2. 未见更深入的统计检验或置信区间分析。

改造建议：

- 保留当前指标体系。
- 视课程要求增加更清晰的结果解释文案。

## 17. 现有功能与 6 课时课程映射

课程结构背景：

1. 第 1 课：AI 为什么会认错图片
2. 第 2 课：数据怎样影响 AI
3. 第 3 课：设计校园图像分类实验
4. 第 4 课：训练第一个图像分类模型
5. 第 5 课：用数据优化模型
6. 第 6 课：成果展示与反思

### 第 1 课

- 当前网站可支持功能：
  - 首页
  - 导学页
  - 错误样本和混淆矩阵初步查看
- 缺失功能：
  - 更明确的“为什么会认错”交互讲解
- 是否必须改造：建议改造

### 第 2 课

- 当前网站可支持功能：
  - 类别管理
  - 样本数量对比
  - 训练集 / 测试集区分
- 缺失功能：
  - 更系统的数据质量提示
- 是否必须改造：建议改造

### 第 3 课

- 当前网站可支持功能：
  - 选择实验主题
  - 配置类别
  - 准备训练图和测试图
- 缺失功能：
  - 结构化实验方案模板
- 是否必须改造：建议改造

### 第 4 课

- 当前网站可支持功能：
  - 浏览器端真实训练
  - 训练曲线展示
  - 训练状态展示
- 缺失功能：
  - 更完整的过程讲解
- 是否必须改造：可小幅改造

### 第 5 课

- 当前网站可支持功能：
  - 批量测试
  - 准确率
  - 每类准确率
  - 混淆矩阵
  - 错误样本
- 缺失功能：
  - 更明确的“优化前后对比”机制
- 是否必须改造：建议改造

### 第 6 课

- 当前网站可支持功能：
  - 分析页
  - 报告页
  - 成果展示页
- 缺失功能：
  - 更完整的反思/讲评表单
  - 更结构化的作品展示材料导出
- 是否必须改造：建议改造

## 18. 关键代码索引

### 前端路由与入口

1. `frontend/src/router/index.js`
   - 函数/结构：`routes`
   - 用途：定义页面入口
   - 重要性：决定整站导航闭环

2. `frontend/src/main.js`
   - 函数/结构：Vue 应用挂载
   - 用途：启动前端
   - 重要性：应用入口

3. `frontend/src/App.vue`
   - 函数/结构：主布局
   - 用途：提供统一框架
   - 重要性：全站承载层

### 实验页与训练

4. `frontend/src/views/Lab.vue`
   - 函数/结构：实验主流程
   - 用途：上传、训练、测试、保存
   - 重要性：核心业务页面

5. `frontend/src/utils/tfTrainer.js`
   - 函数/结构：`trainImageClassifier`、`predictImage`、`evaluateTestDataset`
   - 用途：TensorFlow.js 训练与测试
   - 重要性：核心算法实现

6. `frontend/src/utils/imagePreprocess.js`
   - 函数/结构：图像转 tensor
   - 用途：输入标准化
   - 重要性：训练前置

### 报告与记录

7. `frontend/src/utils/reportMapper.js`
   - 函数/结构：`mapRecordToReport`
   - 用途：记录转报告
   - 重要性：报告页数据映射核心

8. `frontend/src/views/Report.vue`
   - 函数/结构：复制、打印、报告渲染
   - 用途：正式报告页
   - 重要性：课程成果展示

9. `frontend/src/views/RecordList.vue`
   - 函数/结构：筛选、删除、导出
   - 用途：记录管理
   - 重要性：结果回看

10. `frontend/src/utils/modelExport.js`
    - 函数/结构：模型导出和记录导出元信息
    - 用途：导出模型文件和 metadata
    - 重要性：模型持久化和迁移

### 后端

11. `backend/app.py`
    - 函数/结构：`create_app`
    - 用途：Flask 应用装配
    - 重要性：后端入口

12. `backend/models.py`
    - 函数/结构：`ExperimentRecord.from_payload`、`ExperimentRecord.to_dict`
    - 用途：记录持久化
    - 重要性：数据库核心

13. `backend/routes/records.py`
    - 函数/结构：`create_record`、`get_record`、`list_records`
    - 用途：实验记录 CRUD
    - 重要性：前后端数据桥梁

14. `backend/routes/reports.py`
    - 函数/结构：`reports_demo`、`report_from_record`
    - 用途：报告 demo 与回填
    - 重要性：报告页数据源

15. `backend/routes/gallery.py`
    - 函数/结构：`gallery_demo`
    - 用途：成果展示 demo
    - 重要性：展示页数据源

## 19. 最小改造路径

这一部分不是执行计划，而是基于现状给 GPT 的优先级建议。

### 阶段 1：修正课程入口与报告映射

- 目标：确保分析页、报告页、记录页稳定工作。
- 建议修改文件：
  - `frontend/src/utils/reportMapper.js`
  - `frontend/src/views/Report.vue`
  - `frontend/src/views/Analysis.vue`
- 修改摘要：
  - 补齐缺失的辅助函数导入或修复引用错误。
  - 统一报告页和分析页的数据字段。
- 验收标准：
  - 报告页可以正常打开。
  - `recordId` 有效时可正常 fallback 到 demo 数据。
- 风险：
  - 影响报告展示文本排版。
- 是否可以跳过：
  - 不建议跳过。

### 阶段 2：补全训练集 / 测试集对照与统计

- 目标：增强第 2 课、第 5 课的数据分析支撑。
- 建议修改文件：
  - `frontend/src/views/Lab.vue`
  - `frontend/src/utils/tfTrainer.js`
  - `frontend/src/components/ConfusionMatrix.vue`
- 修改摘要：
  - 更清晰地区分训练集和测试集。
  - 强化每类数量统计与批测统计。
- 验收标准：
  - 学生能清楚看到训练集、测试集、预测集差异。
- 风险：
  - 过度复杂化实验台界面。
- 是否可以跳过：
  - 可小步推进，不建议完全跳过。

### 阶段 3：补强模型版本与导入导出

- 目标：支撑第 5 课的优化对比与第 6 课的成果展示。
- 建议修改文件：
  - `frontend/src/utils/tfTrainer.js`
  - `frontend/src/utils/modelExport.js`
  - `frontend/src/views/RecordList.vue`
  - `frontend/src/views/Lab.vue`
- 修改摘要：
  - 增加模型 1.0 / 2.0 对比语义。
  - 完善模型元数据。
- 验收标准：
  - 可以明确知道导出的是什么版本、用什么参数训练的。
- 风险：
  - IndexedDB 与本地导出语义混淆。
- 是否可以跳过：
  - 在课程早期可以先不做满，但最终版本建议补全。

### 阶段 4：课程文本与实验叙事统一

- 目标：让课程文案和代码事实一致。
- 建议修改文件：
  - `frontend/src/views/Guide.vue`
  - `frontend/src/utils/experimentContent.js`
  - `frontend/src/views/Analysis.vue`
  - `frontend/src/views/Report.vue`
- 修改摘要：
  - 统一实验术语、变量名、报告话术。
- 验收标准：
  - 页面文案与实际功能不冲突。
- 风险：
  - 改动范围可能跨多个教学页面。
- 是否可以跳过：
  - 可分阶段推进。

## 20. 风险清单

### 功能完整性风险

- 当前代码链路基本完整，但“完整”更多是指主流程可跑，不代表每个细节都严谨。
- 一些课程化功能是 demo 化或静态化的。

### 数据流风险

- 图片文件主要停留在前端对象 URL 和 File 对象层面。
- 如果希望做更强的跨页/跨设备持久化，需要补充明确的数据存储方案。

### 模型训练性能风险

- TensorFlow.js 浏览器端训练受设备限制很明显。
- 大图、样本过多、训练轮数过高都会拖慢页面甚至造成卡顿。

### 浏览器内存风险

- 图像对象 URL 和 tensor 如果不及时释放，容易积累。
- 代码虽有 dispose，但仍需关注异常路径与重复训练路径。

### 后端接口风险

- 后端以记录存储为主，训练能力不在后端。
- 某些 demo 接口会造成“看起来像真数据，但其实是静态数据”的误解。

### 部署风险

- 未见完整的生产部署配置。
- README 中的启动方式适合本地开发，不等于生产部署方案。

### 教学表达风险

- STEM 叙述偏课程化，若代码事实与文案不一致，会误导后续 GPT 或教师。

## 21. 下一轮最推荐任务

只推荐一个任务，不并列。

### 推荐任务

优先修复 `frontend/src/utils/reportMapper.js` 的报告映射稳定性问题，并同步检查 `Report.vue` 与 `Analysis.vue` 的数据字段一致性。

原因：

1. 这是当前最接近“用户一打开就会感知到”的问题。
2. 报告页和分析页是实验闭环的最终出口。
3. 先修复它，后续再做课程化重构更安全。

涉及文件：

- `frontend/src/utils/reportMapper.js`
- `frontend/src/views/Report.vue`
- `frontend/src/views/Analysis.vue`

验收标准：

- 报告页可以稳定渲染真实记录与 demo 记录。
- 不出现明显的字段缺失、映射失败或运行时报错。

不建议同时做：

- 大范围重构 `Lab.vue`
- 同时改后端模型结构
- 同时推翻现有 demo 数据

## 22. 给 GPT 的最终结论

1. 这个项目不是空壳，核心实验链路已经存在。
2. 它适合被改造成 STEM 课程的核心数字资源，但仍需要把“demo 感”进一步转为“结构化、可解释、可比较”的课程实验平台。
3. 最适合的改造顺序是：
   - 先修复稳定性问题
   - 再补足课程对照和版本化
   - 最后统一文案和展示层
4. 所有判断应继续以代码为准，不要让 README 的描述反客为主。
