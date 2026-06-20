<script setup>
import { computed, onBeforeUnmount, ref } from "vue";
import { ensureTfReady, loadModelFromIndexedDB, predictImage } from "../utils/tfTrainer";

const props = defineProps({
  record: {
    type: Object,
    default: null
  }
});

const modelLoading = ref(false);
const modelLoaded = ref(false);
const modelLoadError = ref("");
const loadedModel = ref(null);
const predictFile = ref(null);
const previewUrl = ref("");
const predicting = ref(false);
const predictError = ref("");
const prediction = ref(null);

const modelInfo = computed(() => props.record?.summary?.modelInfo || null);
const modelKey = computed(() => modelInfo.value?.modelKey || "");
const classNames = computed(() => {
  const labels = props.record?.confusionMatrix?.labels;
  if (Array.isArray(labels) && labels.length) {
    return labels;
  }
  const datasetClasses = props.record?.datasetSummary?.classes?.map((item) => item.name) || [];
  if (datasetClasses.length) {
    return datasetClasses;
  }
  return props.record?.summary?.classMetrics?.map((item) => item.className) || [];
});
const imageSize = computed(() => props.record?.trainConfig?.imageSize || 64);

function revokePreviewUrl() {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
    previewUrl.value = "";
  }
}

function resetPredictionState() {
  predictError.value = "";
  prediction.value = null;
}

function disposeLoadedModel() {
  loadedModel.value?.dispose?.();
  loadedModel.value = null;
  modelLoaded.value = false;
}

async function handleLoadModel() {
  if (!modelKey.value) {
    modelLoadError.value = "当前实验记录未保存本机模型，因此不能重新加载模型进行测试。";
    return;
  }

  modelLoading.value = true;
  modelLoadError.value = "";
  resetPredictionState();

  try {
    await ensureTfReady("cpu");
    disposeLoadedModel();
    loadedModel.value = await loadModelFromIndexedDB(modelKey.value);
    modelLoaded.value = true;
  } catch (error) {
    modelLoaded.value = false;
    loadedModel.value = null;
    modelLoadError.value = error.message || "模型加载失败。";
  } finally {
    modelLoading.value = false;
  }
}

function handleFileChange(event) {
  const file = event.target.files?.[0] || null;
  revokePreviewUrl();
  resetPredictionState();
  predictFile.value = file;
  if (file) {
    previewUrl.value = URL.createObjectURL(file);
  }
}

async function handlePredict() {
  if (!loadedModel.value) {
    predictError.value = "请先加载本机模型。";
    return;
  }

  if (!classNames.value.length) {
    predictError.value = "当前记录缺少类别信息，无法进行预测。";
    return;
  }

  if (!predictFile.value) {
    predictError.value = "请先上传一张测试图片。";
    return;
  }

  predicting.value = true;
  predictError.value = "";
  prediction.value = null;

  try {
    await ensureTfReady("cpu");
    prediction.value = await predictImage(loadedModel.value, predictFile.value, classNames.value, imageSize.value);
  } catch (error) {
    predictError.value = error.message || "测试图片预测失败。";
  } finally {
    predicting.value = false;
  }
}

onBeforeUnmount(() => {
  revokePreviewUrl();
  disposeLoadedModel();
});
</script>

<template>
  <div class="page-card">
    <h3>已保存模型测试</h3>

    <div v-if="!modelKey" class="tip-text">
      当前实验记录未保存本机模型，因此不能重新加载模型进行测试。
    </div>

    <template v-else>
      <div class="meta-grid">
        <div>模型存储位置：IndexedDB</div>
        <div>模型 key：{{ modelKey }}</div>
        <div>保存时间：{{ modelInfo?.savedAt || "-" }}</div>
        <div>可用范围：仅当前浏览器本机可用</div>
      </div>

      <p class="tip-text">该模型只保存在当前浏览器本地 IndexedDB 中，不会上传后端，也不能跨浏览器或跨设备复用。</p>

      <div class="action-row">
        <el-button type="primary" :loading="modelLoading" @click="handleLoadModel">加载本机模型</el-button>
        <el-tag v-if="modelLoaded" type="success">模型已加载</el-tag>
      </div>

      <el-alert v-if="modelLoadError" :title="modelLoadError" type="error" :closable="false" show-icon style="margin-top: 12px" />

      <div v-if="modelLoaded" class="tester-panel">
        <input class="file-input" type="file" accept=".jpg,.jpeg,.png,.webp" @change="handleFileChange" />

        <div v-if="previewUrl" class="preview-box">
          <img :src="previewUrl" alt="测试图片预览" class="preview-image" />
        </div>

        <div class="action-row">
          <el-button type="success" :loading="predicting" @click="handlePredict">开始预测</el-button>
        </div>

        <el-alert v-if="predictError" :title="predictError" type="error" :closable="false" show-icon style="margin-top: 12px" />

        <div v-if="prediction" class="result-box">
          <div>预测类别：{{ prediction.predictedLabel }}</div>
          <div>置信度：{{ Math.round((prediction.confidence || 0) * 100) }}%</div>

          <div class="top-list">
            <div v-for="item in prediction.topPredictions" :key="item.label">
              <div>{{ item.label }}</div>
              <el-progress :percentage="Math.round((item.confidence || 0) * 100)" />
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.meta-grid,
.top-list {
  display: grid;
  gap: 10px;
}

.tip-text {
  color: var(--muted);
  line-height: 1.8;
}

.action-row {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  margin-top: 12px;
}

.tester-panel {
  display: grid;
  gap: 12px;
  margin-top: 16px;
}

.file-input {
  display: block;
  width: 100%;
}

.preview-box,
.result-box {
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: #fbfdff;
}

.preview-image {
  max-width: 240px;
  max-height: 240px;
  object-fit: contain;
}
</style>
