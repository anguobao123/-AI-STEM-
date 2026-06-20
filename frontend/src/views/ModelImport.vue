<script setup>
import { computed, markRaw, onBeforeUnmount, onMounted, ref, shallowRef, toRaw } from "vue";
import { useRoute, useRouter } from "vue-router";
import { getRecord } from "../utils/api";
import { formatDateTime, formatPercent, safeText } from "../utils/formatters";
import { buildRecordExportMetadata } from "../utils/modelExport";
import { loadModelFromBrowserFiles, loadModelFromIndexedDB, predictImage } from "../utils/tfTrainer";

const router = useRouter();
const route = useRoute();

const modelJsonFile = ref(null);
const weightFiles = ref([]);
const metadataFile = ref(null);
const metadata = ref(null);
const importedModel = shallowRef(null);
const loadingModel = ref(false);
const loadingLocalModel = ref(false);
const loadError = ref("");

const testFile = ref(null);
const testPreviewUrl = ref("");
const prediction = ref(null);
const predicting = ref(false);
const predictError = ref("");

const classNames = computed(() => metadata.value?.classNames || []);
const imageSize = computed(() => Number(metadata.value?.imageSize || metadata.value?.trainConfig?.imageSize || 64));
const canLoadModel = computed(() => Boolean(modelJsonFile.value && weightFiles.value.length && metadataFile.value));
const canPredict = computed(() => Boolean(importedModel.value && testFile.value && classNames.value.length));
const topRows = computed(() => (prediction.value?.topPredictions || []).slice(0, 3));

const modelTitle = computed(() =>
  metadata.value?.modelKey || modelJsonFile.value?.name || metadata.value?.experimentTitle || "导入模型"
);

const trainConfigRows = computed(() => {
  const config = metadata.value?.trainConfig || {};
  return [
    { label: "训练轮次", value: safeText(config.epochs) },
    { label: "批大小", value: safeText(config.batchSize) },
    { label: "学习率", value: safeText(config.learningRate) },
    { label: "验证比例", value: safeText(config.validationSplit) }
  ];
});

function disposeImportedModel() {
  toRaw(importedModel.value)?.dispose?.();
  importedModel.value = null;
}

function resetPrediction() {
  if (testPreviewUrl.value) {
    URL.revokeObjectURL(testPreviewUrl.value);
  }
  testPreviewUrl.value = "";
  testFile.value = null;
  prediction.value = null;
  predictError.value = "";
}

function resetLoadedModel() {
  disposeImportedModel();
  metadata.value = null;
  loadError.value = "";
  resetPrediction();
}

function handleModelJson(event) {
  modelJsonFile.value = event.target.files?.[0] || null;
  resetLoadedModel();
}

function handleWeights(event) {
  weightFiles.value = Array.from(event.target.files || []);
  resetLoadedModel();
}

function handleMetadata(event) {
  metadataFile.value = event.target.files?.[0] || null;
  resetLoadedModel();
}

async function readMetadataFile(file) {
  if (!(file instanceof File)) {
    throw new Error("请先选择 metadata.json 文件。");
  }

  let parsed = null;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error("metadata.json 解析失败，请确认文件内容是合法 JSON。");
  }

  if (!Array.isArray(parsed.classNames) || parsed.classNames.length === 0) {
    throw new Error("metadata.json 缺少 classNames，无法映射预测类别。");
  }

  if (!Number(parsed.imageSize || parsed.trainConfig?.imageSize)) {
    throw new Error("metadata.json 缺少 imageSize，无法处理测试图片。");
  }

  return parsed;
}

function validateModelAgainstMetadata(model, parsedMetadata) {
  const expectedClassCount = parsedMetadata.classNames.length;
  const outputShape = model?.outputs?.[0]?.shape || [];
  const outputClassCount = outputShape[outputShape.length - 1];
  if (typeof outputClassCount === "number" && outputClassCount !== expectedClassCount) {
    throw new Error(`模型输出类别数为 ${outputClassCount}，但 metadata.json 中有 ${expectedClassCount} 个类别。`);
  }

  const inputShape = model?.inputs?.[0]?.shape || [];
  const inputImageSize = inputShape[1];
  const metadataImageSize = Number(parsedMetadata.imageSize || parsedMetadata.trainConfig?.imageSize);
  if (typeof inputImageSize === "number" && inputImageSize !== metadataImageSize) {
    throw new Error(`模型输入尺寸为 ${inputImageSize}，但 metadata.json 中 imageSize 为 ${metadataImageSize}。`);
  }
}

async function loadImportedModel() {
  loadError.value = "";
  prediction.value = null;

  if (!modelJsonFile.value) {
    loadError.value = "请先选择 model.json 文件。";
    return;
  }
  if (!weightFiles.value.length) {
    loadError.value = "请至少选择一个 weights 权重文件。";
    return;
  }
  if (!metadataFile.value) {
    loadError.value = "请先选择 metadata.json 文件。";
    return;
  }

  loadingModel.value = true;
  let loadedModel = null;
  try {
    const parsedMetadata = await readMetadataFile(metadataFile.value);
    loadedModel = await loadModelFromBrowserFiles(modelJsonFile.value, weightFiles.value);
    validateModelAgainstMetadata(loadedModel, parsedMetadata);
    disposeImportedModel();
    metadata.value = parsedMetadata;
    importedModel.value = markRaw(loadedModel);
    loadedModel = null;
  } catch (error) {
    loadedModel?.dispose?.();
    disposeImportedModel();
    metadata.value = null;
    loadError.value = error.message || "模型导入失败。";
  } finally {
    loadingModel.value = false;
  }
}

async function loadLocalModelFromRecord(recordId) {
  if (!recordId) return;

  loadingLocalModel.value = true;
  loadError.value = "";
  let loadedModel = null;
  try {
    const record = await getRecord(recordId);
    const recordMetadata = buildRecordExportMetadata(record);
    if (!recordMetadata.modelKey) {
      throw new Error("当前记录没有可读取的本机模型。");
    }

    loadedModel = await loadModelFromIndexedDB(recordMetadata.modelKey);
    validateModelAgainstMetadata(loadedModel, recordMetadata);
    disposeImportedModel();
    metadata.value = recordMetadata;
    importedModel.value = markRaw(loadedModel);
    loadedModel = null;
  } catch (error) {
    loadedModel?.dispose?.();
    disposeImportedModel();
    metadata.value = null;
    loadError.value = error.message || "本机模型加载失败。";
  } finally {
    loadingLocalModel.value = false;
  }
}

function handleTestFile(event) {
  resetPrediction();
  const file = event.target.files?.[0] || null;
  testFile.value = file;
  if (file) {
    testPreviewUrl.value = URL.createObjectURL(file);
  }
}

async function runPrediction() {
  predictError.value = "";
  prediction.value = null;

  if (!importedModel.value) {
    predictError.value = "请先加载模型。";
    return;
  }
  if (!classNames.value.length) {
    predictError.value = "模型元数据缺少类别名称，无法预测。";
    return;
  }
  if (!testFile.value) {
    predictError.value = "请先上传测试图片。";
    return;
  }

  predicting.value = true;
  try {
    prediction.value = await predictImage(toRaw(importedModel.value), testFile.value, classNames.value, imageSize.value);
  } catch (error) {
    predictError.value = error.message || "图片预测失败。";
  } finally {
    predicting.value = false;
  }
}

onMounted(() => {
  const recordId = route.query.recordId ? String(route.query.recordId) : "";
  if (recordId) {
    loadLocalModelFromRecord(recordId);
  }
});

onBeforeUnmount(() => {
  disposeImportedModel();
  resetPrediction();
});
</script>

<template>
  <section class="model-import-page page-layout">
    <header class="page-heading import-heading">
      <div class="page-heading__copy">
        <span class="import-kicker">模型导入测试</span>
        <h1 class="page-title">导入 TensorFlow.js 模型并复用预测</h1>
        <p class="page-subtitle">选择导出的 model.json、weights 文件和 metadata.json，加载后可上传新图片进行分类测试。</p>
      </div>
      <div class="import-heading__actions">
        <el-button plain @click="router.push('/gallery')">返回成果库</el-button>
      </div>
    </header>

    <main class="import-layout">
      <section class="workspace-shell">
        <div class="workspace-toolbar">
          <strong>模型文件</strong>
          <span class="import-note">当前支持多文件导入</span>
        </div>
        <div class="workspace-body import-stack">
          <label class="file-box">
            <span>model.json</span>
            <strong>{{ modelJsonFile?.name || "选择模型结构文件" }}</strong>
            <input class="hidden-input" type="file" accept=".json,application/json" @change="handleModelJson" />
          </label>

          <label class="file-box">
            <span>weights</span>
            <strong>{{ weightFiles.length ? `${weightFiles.length} 个权重文件` : "选择 weights 文件" }}</strong>
            <input class="hidden-input" type="file" multiple accept=".bin,application/octet-stream" @change="handleWeights" />
          </label>

          <label class="file-box">
            <span>metadata.json</span>
            <strong>{{ metadataFile?.name || "选择元数据文件" }}</strong>
            <input class="hidden-input" type="file" accept=".json,application/json" @change="handleMetadata" />
          </label>

          <div class="import-actions">
            <el-button type="primary" :disabled="!canLoadModel" :loading="loadingModel || loadingLocalModel" @click="loadImportedModel">
              加载模型
            </el-button>
            <el-button plain @click="resetLoadedModel">清空</el-button>
          </div>
          <el-alert v-if="loadError" :title="loadError" type="error" :closable="false" show-icon />
        </div>
      </section>

      <section class="workspace-shell">
        <div class="workspace-toolbar">
          <strong>模型信息</strong>
          <el-tag :type="importedModel ? 'success' : 'info'">{{ importedModel ? "已加载" : "待加载" }}</el-tag>
        </div>
        <div class="workspace-body">
          <div v-if="!metadata" class="import-empty">加载模型后显示来源实验、类别名称、图片尺寸和训练参数。</div>
          <div v-else class="model-info">
            <div class="model-title">
              <span>模型名称</span>
              <strong>{{ modelTitle }}</strong>
            </div>
            <div class="info-grid">
              <div>
                <span>来源实验</span>
                <strong>{{ safeText(metadata.experimentTitle || metadata.experimentId) }}</strong>
              </div>
              <div>
                <span>图片尺寸</span>
                <strong>{{ imageSize }} x {{ imageSize }}</strong>
              </div>
              <div>
                <span>创建时间</span>
                <strong>{{ formatDateTime(metadata.createdAt) }}</strong>
              </div>
              <div>
                <span>类别数量</span>
                <strong>{{ classNames.length }}</strong>
              </div>
            </div>
            <div class="class-list">
              <span v-for="name in classNames" :key="name">{{ name }}</span>
            </div>
            <div class="config-grid">
              <div v-for="item in trainConfigRows" :key="item.label">
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>

    <section class="workspace-shell">
      <div class="workspace-toolbar">
        <strong>复用测试</strong>
        <span class="import-note">上传一张新图片查看 Top 3 分类结果</span>
      </div>
      <div class="workspace-body test-layout">
        <div class="test-uploader">
          <label class="file-box image-file">
            <span>测试图片</span>
            <strong>{{ testFile?.name || "选择图片" }}</strong>
            <input class="hidden-input" type="file" accept=".png,.jpg,.jpeg,.webp" @change="handleTestFile" />
          </label>
          <div class="preview-frame">
            <img v-if="testPreviewUrl" :src="testPreviewUrl" alt="测试图片预览" />
            <span v-else>等待上传测试图片</span>
          </div>
          <div class="import-actions">
            <el-button type="primary" :disabled="!canPredict" :loading="predicting" @click="runPrediction">开始预测</el-button>
            <el-button plain @click="resetPrediction">清空图片</el-button>
          </div>
          <el-alert v-if="predictError" :title="predictError" type="error" :closable="false" show-icon />
        </div>

        <div class="prediction-panel">
          <div v-if="!prediction" class="import-empty">加载模型并上传测试图片后显示预测类别、置信度和 Top 3 结果。</div>
          <template v-else>
            <div class="prediction-main">
              <span>预测类别</span>
              <strong>{{ prediction.predictedLabel }}</strong>
              <small>{{ formatPercent(prediction.confidence) }}</small>
            </div>
            <div class="top-list">
              <div v-for="(item, index) in topRows" :key="item.label" class="top-row">
                <span>{{ index + 1 }}</span>
                <strong>{{ item.label }}</strong>
                <em>{{ formatPercent(item.confidence) }}</em>
              </div>
            </div>
          </template>
        </div>
      </div>
    </section>
  </section>
</template>

<style scoped>
.model-import-page {
  display: grid;
  gap: 16px;
}

.import-kicker,
.import-note {
  color: var(--primary);
  font-size: 13px;
  font-weight: 800;
}

.import-heading {
  align-items: center;
}

.import-heading__actions,
.import-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}

.import-layout {
  display: grid;
  grid-template-columns: minmax(300px, 0.72fr) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.import-stack,
.model-info {
  display: grid;
  gap: 12px;
}

.file-box {
  min-height: 82px;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  background: var(--surface-alt);
  display: grid;
  gap: 6px;
  cursor: pointer;
  transition:
    border-color 0.16s ease,
    background 0.16s ease,
    transform 0.16s ease;
}

.file-box:hover,
.file-box:focus-within {
  border-color: var(--border-hover);
  background: var(--surface-hover);
  transform: translateY(-1px);
}

.file-box span,
.model-title span,
.info-grid span,
.config-grid span,
.prediction-main span {
  color: var(--muted);
  font-size: 12px;
  font-weight: 800;
}

.file-box strong,
.model-title strong,
.info-grid strong,
.config-grid strong,
.prediction-main strong {
  min-width: 0;
  color: var(--heading);
  word-break: break-word;
}

.hidden-input {
  display: none;
}

.import-empty {
  padding: 24px;
  border: 1px dashed var(--border);
  border-radius: var(--radius-card);
  color: var(--muted);
  text-align: center;
}

.model-title {
  display: grid;
  gap: 4px;
}

.info-grid,
.config-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.info-grid div,
.config-grid div {
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  background: var(--surface-alt);
  display: grid;
  gap: 4px;
}

.class-list {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.class-list span {
  padding: 6px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-control);
  background: var(--readout);
  color: var(--primary);
  font-size: 13px;
  font-weight: 800;
}

.test-layout {
  display: grid;
  grid-template-columns: minmax(260px, 0.72fr) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.test-uploader,
.prediction-panel {
  display: grid;
  gap: 12px;
}

.preview-frame {
  min-height: 220px;
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  background: #f8fafc;
  display: grid;
  place-items: center;
  overflow: hidden;
}

.preview-frame img {
  width: 100%;
  height: 220px;
  object-fit: contain;
}

.preview-frame span {
  color: var(--muted);
  font-weight: 700;
}

.prediction-main {
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  background: var(--surface-alt);
  display: grid;
  gap: 6px;
}

.prediction-main strong {
  color: var(--primary);
  font-size: 22px;
}

.prediction-main small {
  color: var(--heading);
  font-weight: 800;
}

.top-list {
  display: grid;
  gap: 8px;
}

.top-row {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr) 86px;
  gap: 10px;
  align-items: center;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
}

.top-row span {
  width: 26px;
  height: 26px;
  border-radius: var(--radius-control);
  background: var(--primary-soft);
  color: var(--primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
}

.top-row strong {
  min-width: 0;
  color: var(--heading);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.top-row em {
  color: var(--muted);
  font-style: normal;
  font-weight: 800;
  text-align: right;
}

@media (max-width: 960px) {
  .import-layout,
  .test-layout,
  .info-grid,
  .config-grid {
    grid-template-columns: 1fr;
  }
}
</style>
