<script setup>
import { computed, markRaw, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, toRaw, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { createRecord, getLabDemo } from "../utils/api";
import { getExperimentMeta } from "../utils/experimentContent";
import { formatLoss, formatPercent } from "../utils/formatters";
import { buildLabExportMetadata, createModelExportBaseName } from "../utils/modelExport";
import { buildRealRecordPayload } from "../utils/recordBuilder";
import { evaluateTestDataset, exportModelFiles, predictImage, saveModelToIndexedDB, trainImageClassifier } from "../utils/tfTrainer";
import ConfusionMatrix from "../components/ConfusionMatrix.vue";
import EmptyState from "../components/EmptyState.vue";

const route = useRoute();
const router = useRouter();

const loading = ref(true);
const error = ref("");
const labData = ref(null);

const trainState = ref("idle");
const trainProgress = ref(0);
const trainLogs = ref([]);
const trainError = ref("");
const saveError = ref("");
const modelSaveError = ref("");
const modelExportError = ref("");
const saving = ref(false);
const modelSaving = ref(false);
const modelExporting = ref(false);
const savedRecordId = ref(null);
const savedModelInfo = ref(null);
const modelRef = shallowRef(null);
const realResult = ref(null);
const editingClassId = ref("");
const trainedClassIds = ref([]);
const showBatchDetails = ref(false);
const modelVersion = ref(0);
const optimizationPlan = ref("");
const reflection = ref("");
const versionHistory = ref([]);
const showVersionCompare = ref(false);
const projectName = ref("");
const groupName = ref("");
const authorName = ref("");
const objective = ref("");
const hypothesis = ref("");
const variableDescription = ref("");
const datasetNote = ref("");
const conclusion = ref("");
const experimentLog = ref([]);

const classMap = ref([]);
const selectedTrueLabel = ref("");
const testFile = ref(null);
const testPreviewUrl = ref("");
const testPrediction = ref(null);
const testPredicting = ref(false);
const testError = ref("");
const testIsCorrect = ref(null);
const testResults = ref([]);

const batchTestMap = ref([]);
const batchTesting = ref(false);
const batchTestError = ref("");
const batchTestResult = ref(null);

const form = ref({
  epochs: 20,
  batchSize: 16,
  learningRate: 0.001,
  imageSize: 64
});

const meta = computed(() => getExperimentMeta(route.params.experimentId));

const classItems = computed(() =>
  classMap.value.map((item, index) => ({
    ...item,
    index,
    canDelete: classMap.value.length > 2
  }))
);

const activeClassEntries = computed(() =>
  classMap.value
    .map((item) => ({
      id: item.id,
      name: item.name.trim(),
      files: item.files.map((entry) => entry.file)
    }))
    .filter((item) => item.name && item.files.length > 0)
);

const trainedClassNames = computed(() =>
  trainedClassIds.value
    .map((id) => classMap.value.find((item) => item.id === id)?.name?.trim())
    .filter(Boolean)
);

const canTrainReal = computed(
  () => activeClassEntries.value.length >= 2 && activeClassEntries.value.every((item) => item.files.length >= 2)
);

const canSaveModel = computed(() => trainState.value === "completed" && Boolean(modelRef.value && realResult.value));
const canExportModel = computed(() => trainState.value === "completed" && Boolean(modelRef.value && realResult.value));

const modelStatusLabel = computed(() => (savedModelInfo.value ? "已保存到本机" : "未保存模型"));

const modelStatusText = computed(() => {
  if (savedModelInfo.value?.modelKey) {
    return `模型 key：${savedModelInfo.value.modelKey}`;
  }
  if (trainState.value === "completed") {
    return "当前模型仅保存在页面内存中，可先保存到本机 IndexedDB。";
  }
  return "完成真实训练后可保存模型。";
});

const trainingStatusLabel = computed(() => {
  if (trainState.value === "running") return "训练中";
  if (trainState.value === "completed") return "已完成";
  if (trainState.value === "failed") return "训练失败";
  return "未训练";
});

const samplePanelActive = computed(() => meta.value.id !== "epoch-count");
const trainPanelActive = computed(() => meta.value.id === "epoch-count");
const introConstants = computed(() => meta.value.fixedConditions || []);
const introMetrics = computed(() => meta.value.metricList || []);
const operationPrompt = computed(() => meta.value.operationFocus || "");
const parameterFocusText = computed(() => meta.value.trainingHint || "");
const resultFocusText = computed(() => meta.value.resultHint || "");

const statusActionText = computed(() => `上传训练图片 → 训练模型 → 测试图片 → 保存记录`);
const totalTrainingSamples = computed(() => classMap.value.reduce((sum, item) => sum + item.files.length, 0));
const classPairText = computed(() =>
  classMap.value
    .map((item) => item.name.trim())
    .filter(Boolean)
    .join(" vs ")
);

const experimentLens = computed(() => {
  if (meta.value.id === "epoch-count") {
    return {
      label: "本实验突出",
      title: "训练轮次 epochs",
      value: `${form.value.epochs} 轮`,
      note: "观察训练轮次增加后，准确率和损失值是否还在有效变化。"
    };
  }
  if (meta.value.id === "class-similarity") {
    return {
      label: "本实验突出",
      title: "类别组合",
      value: classPairText.value || "待命名类别",
      note: "重点比较相似类别之间是否更容易出现高置信度误判。"
    };
  }
  if (meta.value.id === "augmentation") {
    return {
      label: "本实验突出",
      title: "样本多样性",
      value: `${totalTrainingSamples.value} 张训练图`,
      note: "用更多背景、角度和光照变化模拟数据增强效果。"
    };
  }
  return {
    label: "本实验突出",
    title: "每类样本数",
    value: classMap.value.map((item) => `${item.name || "未命名"} ${item.files.length} 张`).join(" / "),
    note: "比较每类样本数量变化后，模型准确率和错误样本数是否改善。"
  };
});

const workflowSteps = computed(() => [
  { label: "数据", active: activeClassEntries.value.length >= 2 },
  { label: "训练", active: trainState.value === "completed" || trainState.value === "running" },
  { label: "测试", active: Boolean(testPrediction.value || batchTestResult.value) },
  { label: "保存", active: Boolean(savedRecordId.value) }
]);

const trainLogText = computed(() => {
  if (!trainLogs.value.length) {
    return "最近训练结果：等待开始";
  }
  return `最近训练结果：${trainLogs.value[trainLogs.value.length - 1]}`;
});

const predictionRows = computed(() => {
  const labels = testPrediction.value?.topPredictions?.length
    ? testPrediction.value.topPredictions
    : (trainedClassNames.value.length
      ? trainedClassNames.value.map((label) => ({ label, confidence: 0 }))
      : classMap.value.map((item) => ({ label: item.name.trim(), confidence: 0 })).filter((item) => item.label));

  return labels.slice(0, 4).map((item, index) => ({
    ...item,
    tone: index,
    width: testPrediction.value ? Math.max(6, Math.round((item.confidence || 0) * 100)) : 0
  }));
});

const batchSummaryText = computed(() => {
  if (!batchTestResult.value?.summary) {
    return "批量测试：未执行";
  }
  const { testAccuracy, testCount, testCorrectCount } = batchTestResult.value.summary;
  return `批量测试：准确率 ${formatPercent(testAccuracy)}，测试 ${testCount} 张，错误 ${testCount - testCorrectCount} 张`;
});

const experimentSummaryText = computed(() => {
  if (batchTestResult.value?.summary) {
    const summary = batchTestResult.value.summary;
    return `当前批量测试准确率为 ${formatPercent(summary.testAccuracy)}，错误样本数为 ${summary.testCount - summary.testCorrectCount}。可以保存记录并继续查看分析与报告。`;
  }
  if (trainState.value === "completed") {
    return "模型已完成训练。继续做单图预测或批量测试后，再保存本次实验记录。";
  }
  return "请先完成真实训练，再保存实验记录。";
});

function createClassItem(name = "") {
  return {
    id: Math.random().toString(36).slice(2, 10),
    name,
    files: []
  };
}

function createFileEntry(file) {
  return {
    id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
    file,
    url: URL.createObjectURL(file)
  };
}

function revokeEntries(entries = []) {
  entries.forEach((entry) => {
    if (entry?.url) {
      URL.revokeObjectURL(entry.url);
    }
  });
}

function defaultClassNamesForExperiment(experimentId) {
  if (experimentId === "class-similarity") return ["苹果", "梨"];
  if (experimentId === "augmentation") return ["苹果", "香蕉"];
  if (experimentId === "epoch-count") return ["香蕉", "苹果"];
  return ["香蕉", "苹果"];
}

function createBatchItem(classId) {
  const name = classMap.value.find((item) => item.id === classId)?.name?.trim() || "未命名类别";
  return { classId, name, files: [] };
}

function syncBatchEntries(classIds = []) {
  const previousMap = new Map(batchTestMap.value.map((item) => [item.classId, item.files]));
  batchTestMap.value = classIds.map((classId) => ({
    ...createBatchItem(classId),
    files: previousMap.get(classId) || []
  }));
}

function resetTrainingUI() {
  trainState.value = "idle";
  trainProgress.value = 0;
  trainLogs.value = [];
  trainError.value = "";
  saveError.value = "";
  modelSaveError.value = "";
  modelExportError.value = "";
  modelSaving.value = false;
  modelExporting.value = false;
  savedRecordId.value = null;
  savedModelInfo.value = null;
}

function disposeModel() {
  toRaw(modelRef.value)?.dispose?.();
  modelRef.value = null;
}

function resetPrediction() {
  if (testPreviewUrl.value) {
    URL.revokeObjectURL(testPreviewUrl.value);
  }
  testPreviewUrl.value = "";
  testFile.value = null;
  testPrediction.value = null;
  testError.value = "";
  testIsCorrect.value = null;
  selectedTrueLabel.value = "";
}

function clearExperimentRuntime() {
  resetTrainingUI();
  disposeModel();
  realResult.value = null;
  trainedClassIds.value = [];
  resetPrediction();
  testResults.value = [];
  batchTestResult.value = null;
  batchTestError.value = "";
  batchTesting.value = false;
  showBatchDetails.value = false;
  revokeEntries(classMap.value.flatMap((item) => item.files));
  revokeEntries(batchTestMap.value.flatMap((item) => item.files));
  batchTestMap.value = [];
}

function datasetError() {
  if (activeClassEntries.value.length < 2) {
    return "至少需要 2 个有效类别，并且每个类别至少上传 2 张训练图片。";
  }
  const badClass = activeClassEntries.value.find((item) => item.files.length < 2);
  if (badClass) {
    return `类别“${badClass.name}”至少需要 2 张训练图片。`;
  }
  return "";
}

function startEditClassName(classId) {
  editingClassId.value = classId;
  nextTick(() => {
    const input = document.querySelector(`[data-class-id="${classId}"]`);
    input?.focus?.();
    input?.select?.();
  });
}

function saveClassName(index) {
  const current = classMap.value[index];
  if (!current) return;
  const original = current.name;
  const trimmed = current.name.trim();
  current.name = trimmed || original || `类别 ${String.fromCharCode(65 + index)}`;
  editingClassId.value = "";
}

function addClass() {
  if (classMap.value.length >= 3) return;
  const nextLabel = `类别 ${String.fromCharCode(65 + classMap.value.length)}`;
  classMap.value.push(createClassItem(nextLabel));
}

function removeClass(index) {
  if (classMap.value.length <= 2) return;
  const [removed] = classMap.value.splice(index, 1);
  revokeEntries(removed?.files || []);
  if (editingClassId.value === removed?.id) {
    editingClassId.value = "";
  }
  resetTrainingUI();
  disposeModel();
  batchTestMap.value = [];
}

function handleClassFiles(index, event) {
  const current = classMap.value[index];
  if (!current) return;
  const incoming = Array.from(event.target.files || []).map(createFileEntry);
  const combinedFiles = [...current.files, ...incoming];
  const nextFiles = combinedFiles.slice(0, 20);
  revokeEntries(combinedFiles.filter((entry) => !nextFiles.includes(entry)));
  current.files = nextFiles;
  event.target.value = "";
  resetTrainingUI();
  disposeModel();
  realResult.value = null;
  trainedClassIds.value = [];
  batchTestMap.value = [];
  batchTestResult.value = null;
  if (incoming.length) {
    logExperimentEvent("upload_train_images", `${current.name || "未命名类别"}：${incoming.length} 张训练图片`);
  }
}

function removeClassImage(classIndex, imageId) {
  const current = classMap.value[classIndex];
  if (!current) return;
  const target = current.files.find((entry) => entry.id === imageId);
  if (target?.url) {
    URL.revokeObjectURL(target.url);
  }
  current.files = current.files.filter((entry) => entry.id !== imageId);
  resetTrainingUI();
  disposeModel();
  realResult.value = null;
  trainedClassIds.value = [];
  batchTestMap.value = [];
  batchTestResult.value = null;
}

function handleTestFile(event) {
  const file = event.target.files?.[0] || null;
  resetPrediction();
  testFile.value = file;
  if (file) {
    testPreviewUrl.value = URL.createObjectURL(file);
    logExperimentEvent("upload_test_images", `上传单张测试图片：${file.name}`);
  }
}

function handleBatchFiles(index, event) {
  const current = batchTestMap.value[index];
  if (!current) return;
  revokeEntries(current.files);
  current.files = Array.from(event.target.files || [])
    .slice(0, 50)
    .map(createFileEntry);
  batchTestResult.value = null;
  batchTestError.value = "";
  if (current.files.length) {
    logExperimentEvent("upload_test_images", `${current.name}：${current.files.length} 张批量测试图片`);
  }
  event.target.value = "";
}

function resetBatchFiles(index) {
  const current = batchTestMap.value[index];
  if (!current) return;
  revokeEntries(current.files);
  current.files = [];
  batchTestResult.value = null;
}

function updateCorrectState() {
  testIsCorrect.value =
    selectedTrueLabel.value && testPrediction.value
      ? selectedTrueLabel.value === testPrediction.value.predictedLabel
      : null;
}

function updateEpoch(delta) {
  form.value.epochs = Math.min(50, Math.max(1, Number(form.value.epochs || 1) + delta));
  logTrainConfigChange();
}

function updateBatchSize(delta) {
  form.value.batchSize = Math.min(32, Math.max(1, Number(form.value.batchSize || 1) + delta));
  logTrainConfigChange();
}

function resetTrainConfig() {
  form.value = {
    epochs: meta.value.defaultParams?.epochs || 20,
    batchSize: meta.value.defaultParams?.batchSize || 16,
    learningRate: meta.value.defaultParams?.learningRate || 0.001,
    imageSize: labData.value?.trainConfig?.imageSize || 64
  };
  logTrainConfigChange("恢复默认训练参数");
}

function logTrainConfigChange(detail = "") {
  logExperimentEvent(
    "update_train_config",
    detail || `epochs=${form.value.epochs}，batchSize=${form.value.batchSize}，learningRate=${form.value.learningRate}`
  );
}

function createModelKey() {
  const experimentId = labData.value?.experimentId || meta.value.id || "experiment";
  const timestamp = Date.now();
  const suffix = Math.random().toString(36).slice(2, 8);
  return `tuiangfenlei-${experimentId}-${timestamp}-${suffix}`;
}

function getCurrentTestAccuracy() {
  if (typeof batchTestResult.value?.summary?.testAccuracy === "number") {
    return batchTestResult.value.summary.testAccuracy;
  }

  const labeledResults = testResults.value.filter((item) => item.trueLabel);
  if (!labeledResults.length) {
    return null;
  }

  const correctCount = labeledResults.filter((item) => item.isCorrect === true).length;
  return correctCount / labeledResults.length;
}

function buildCurrentModelInfo(baseInfo) {
  if (!baseInfo) return null;
  const imageSize = Number(realResult.value?.trainConfig?.imageSize || form.value.imageSize || 64);
  return {
    ...baseInfo,
    classNames: [...trainedClassNames.value],
    imageSize,
    experimentId: labData.value?.experimentId || meta.value.id,
    trainConfig: { ...(realResult.value?.trainConfig || {}) },
    accuracy: realResult.value?.summary?.accuracy ?? null,
    testAccuracy: getCurrentTestAccuracy()
  };
}

function persistLocalModelMetadata(modelInfo) {
  if (typeof window === "undefined" || !modelInfo?.modelKey) return;
  try {
    window.localStorage.setItem(`tuiangfenlei:model-meta:${modelInfo.modelKey}`, JSON.stringify(modelInfo));
  } catch (error) {
    console.warn("Local model metadata save failed:", error);
  }
}

async function saveCurrentModel() {
  if (!canSaveModel.value) {
    modelSaveError.value = "请先完成真实训练，再保存模型。";
    return;
  }

  if (savedModelInfo.value) {
    return;
  }

  modelSaving.value = true;
  modelSaveError.value = "";
  try {
    const imageSize = Number(realResult.value?.trainConfig?.imageSize || form.value.imageSize || 64);
    const modelKey = createModelKey();
    const saveInfo = await saveModelToIndexedDB(toRaw(modelRef.value), modelKey, {
      classCount: trainedClassNames.value.length,
      imageSize
    });
    const createdAt = saveInfo.savedAt || new Date().toISOString();
    const modelInfo = buildCurrentModelInfo({
      ...saveInfo,
      modelKey,
      createdAt,
      savedAt: saveInfo.savedAt || createdAt
    });

    savedModelInfo.value = modelInfo;
    persistLocalModelMetadata(modelInfo);
  } catch (e) {
    modelSaveError.value = e.message || "模型保存失败。";
  } finally {
    modelSaving.value = false;
  }
}

async function exportCurrentModel() {
  if (!canExportModel.value) {
    modelExportError.value = "请先完成真实训练，再导出模型。";
    return;
  }

  modelExporting.value = true;
  modelExportError.value = "";
  try {
    const summary = {
      ...(realResult.value?.summary || {}),
      ...(batchTestResult.value?.summary || { testAccuracy: getCurrentTestAccuracy() })
    };
    const modelInfo = buildCurrentModelInfo(savedModelInfo.value || {});
    const metadata = buildLabExportMetadata({
      labData: labData.value,
      meta: meta.value,
      trainingResult: realResult.value,
      modelInfo,
      classNames: [...trainedClassNames.value],
      summary,
      createdAt: modelInfo?.createdAt || new Date().toISOString()
    });

    await exportModelFiles(toRaw(modelRef.value), metadata, {
      baseName: createModelExportBaseName(metadata, "lab")
    });
  } catch (e) {
    modelExportError.value = e.message || "模型导出失败。";
  } finally {
    modelExporting.value = false;
  }
}

async function startRealTraining() {
  resetTrainingUI();
  resetPrediction();
  batchTestResult.value = null;
  const err = datasetError();
  if (err) {
    trainState.value = "failed";
    trainError.value = err;
    return;
  }

  trainState.value = "running";
  logExperimentEvent("train_start", `开始训练${getVersionLabel()}`);
  const trainingEntries = activeClassEntries.value.map((item) => ({
    className: item.name,
    files: item.files
  }));

  try {
    const result = await trainImageClassifier({
      classFileMap: trainingEntries,
      epochs: Number(form.value.epochs) || 1,
      batchSize: Number(form.value.batchSize) || 1,
      learningRate: Number(form.value.learningRate) || 0.001,
      imageSize: Number(form.value.imageSize) || 64,
      onEpochEnd: ({ epoch, accuracy, loss }) => {
        trainProgress.value = Math.max(
          1,
          Math.min(100, Math.round((epoch / Math.max(1, Number(form.value.epochs) || 1)) * 100))
        );
        trainLogs.value = [
          ...trainLogs.value.slice(-2),
          `第 ${epoch} 轮，准确率 ${formatPercent(accuracy)}，损失 ${formatLoss(loss)}`
        ];
      }
    });
    disposeModel();
    modelRef.value = markRaw(result.model);
    realResult.value = { ...result, model: modelRef.value };
    trainedClassIds.value = activeClassEntries.value.map((item) => item.id);
    syncBatchEntries(trainedClassIds.value);
    trainProgress.value = 100;
    trainState.value = "completed";
    logExperimentEvent("train_completed", `${getVersionLabel()}训练完成，准确率 ${formatPercent(result.summary?.accuracy)}`);
  } catch (e) {
    trainState.value = "failed";
    trainError.value = e.message || "真实训练失败。";
  }
}

async function doPredict() {
  if (trainState.value !== "completed" || !modelRef.value) {
    testError.value = "请先完成真实训练。";
    return;
  }
  if (!testFile.value) {
    testError.value = "请先上传测试图片。";
    return;
  }

  testPredicting.value = true;
  testError.value = "";
  try {
    testPrediction.value = await predictImage(
      toRaw(modelRef.value),
      testFile.value,
      trainedClassNames.value,
      realResult.value?.trainConfig?.imageSize || 64
    );
    updateCorrectState();
  } catch (e) {
    testError.value = e.message || "预测失败。";
  } finally {
    testPredicting.value = false;
  }
}

function addTestResult() {
  if (!testPrediction.value || !testFile.value) return;
  testResults.value.push({
    id: Date.now(),
    imageName: testFile.value.name,
    predictedLabel: testPrediction.value.predictedLabel,
    confidence: testPrediction.value.confidence,
    topPredictions: testPrediction.value.topPredictions,
    trueLabel: selectedTrueLabel.value || "",
    isCorrect: testIsCorrect.value,
    createdAt: new Date().toISOString()
  });
}

async function doBatchTest() {
  if (trainState.value !== "completed" || !modelRef.value) {
    batchTestError.value = "请先完成真实训练。";
    return;
  }
  if (!batchTestMap.value.some((item) => item.files.length > 0)) {
    batchTestError.value = "请至少上传一张批量测试图片。";
    return;
  }

  batchTesting.value = true;
  batchTestError.value = "";
  try {
    batchTestResult.value = await evaluateTestDataset({
      model: toRaw(modelRef.value),
      classNames: trainedClassNames.value,
      testFileMap: batchTestMap.value.map((item) => ({
        className: item.name,
        files: item.files.map((entry) => entry.file)
      })),
      imageSize: realResult.value?.trainConfig?.imageSize || 64
    });
    logExperimentEvent("batch_test", `${getVersionLabel()}批量测试：${batchSummaryText.value}`);
  } catch (e) {
    batchTestError.value = e.message || "批量测试失败。";
  } finally {
    batchTesting.value = false;
  }
}

const experimentActionLabels = {
  enter_lab: "创建或进入实验任务",
  update_project_info: "填写或修改项目信息",
  upload_train_images: "上传训练图片",
  upload_test_images: "上传测试图片",
  update_train_config: "修改训练参数",
  train_start: "开始训练模型",
  train_completed: "完成训练模型",
  batch_test: "执行批量测试",
  write_optimization_plan: "填写优化方案",
  write_conclusion: "填写实验结论",
  write_reflection: "填写实验反思",
  save_record: "保存实验记录",
  switch_version: "切换模型版本"
};

function logExperimentEvent(event, detail = "") {
  experimentLog.value.push({
    time: new Date().toISOString(),
    event,
    action: experimentActionLabels[event] || event,
    detail,
    modelVersion: modelVersion.value,
    step: getVersionLabel()
  });
}

function switchToNextVersion() {
  if (modelVersion.value >= 1) return;
  if (versionHistory.value.length === 0) {
    versionHistory.value.push({
      fromVersion: 0,
      toVersion: 1,
      accuracy: realResult.value?.summary?.accuracy ?? 0,
      errorCount: realResult.value?.summary?.errorCount ?? 0,
      plan: optimizationPlan.value,
      timestamp: new Date().toISOString()
    });
  }
  modelVersion.value = modelVersion.value + 1;
  optimizationPlan.value = "";
  reflection.value = "";
  conclusion.value = "";
  showVersionCompare.value = true;
  logExperimentEvent("switch_version", "模型 1.0 -> 模型 2.0");
}

function getVersionLabel() {
  return modelVersion.value === 0 ? "模型 1.0" : "模型 2.0";
}

async function saveRecord() {
  if (!labData.value) {
    saveError.value = "实验数据尚未加载完成。";
    return;
  }
  if (trainState.value !== "completed" || !realResult.value) {
    saveError.value = "请先完成真实训练，再保存实验记录。";
    return;
  }

  saving.value = true;
  saveError.value = "";
  try {
    const courseFields = {
      modelVersion: modelVersion.value,
      optimizationPlan: optimizationPlan.value,
      reflection: reflection.value,
      versionCompare: [...versionHistory.value],
      projectName: projectName.value,
      groupName: groupName.value,
      authorName: authorName.value,
      objective: objective.value,
      hypothesis: hypothesis.value,
      variableDescription: variableDescription.value,
      datasetNote: datasetNote.value,
      conclusion: conclusion.value,
      experimentLog: [
        ...experimentLog.value,
        ...[
          projectName.value || groupName.value || authorName.value || objective.value || hypothesis.value || variableDescription.value || datasetNote.value
            ? {
                time: new Date().toISOString(),
                event: "update_project_info",
                action: experimentActionLabels.update_project_info,
                detail: "保存时记录项目名称、小组署名、实验目标、假设、变量和数据集说明",
                modelVersion: modelVersion.value,
                step: getVersionLabel()
              }
            : null,
          optimizationPlan.value
            ? {
                time: new Date().toISOString(),
                event: "write_optimization_plan",
                action: experimentActionLabels.write_optimization_plan,
                detail: "保存时记录优化方案",
                modelVersion: modelVersion.value,
                step: getVersionLabel()
              }
            : null,
          conclusion.value
            ? {
                time: new Date().toISOString(),
                event: "write_conclusion",
                action: experimentActionLabels.write_conclusion,
                detail: "保存时记录实验结论",
                modelVersion: modelVersion.value,
                step: getVersionLabel()
              }
            : null,
          reflection.value
            ? {
                time: new Date().toISOString(),
                event: "write_reflection",
                action: experimentActionLabels.write_reflection,
                detail: "保存时记录实验反思",
                modelVersion: modelVersion.value,
                step: getVersionLabel()
              }
            : null,
          {
            time: new Date().toISOString(),
            event: "save_record",
            action: experimentActionLabels.save_record,
            detail: "保存实验记录",
            modelVersion: modelVersion.value,
            step: getVersionLabel()
          }
        ].filter(Boolean)
      ]
    };
    const payload = buildRealRecordPayload(
      labData.value,
      realResult.value,
      testResults.value,
      batchTestResult.value,
      buildCurrentModelInfo(savedModelInfo.value),
      courseFields
    );
    payload.stemSummary = {
      science: '探究了' + (labData.value?.title || '图像分类') + '中数据变化对模型表现的影响。',
      tech: '使用 TensorFlow.js 在浏览器端完成图像分类模型训练与测试。',
      engineering: modelVersion.value >= 1 ? '从模型 1.0 到模型 2.0，优化措施：' + (optimizationPlan.value || '待填写') : '模型 1.0 初始训练完成。',
      math: '准确率 ' + ((realResult.value?.summary?.accuracy || 0) * 100).toFixed(1) + '%，错误样本 ' + (realResult.value?.summary?.errorCount || 0) + ' 个。'
    };
    const result = await createRecord(payload);
    savedRecordId.value = result.recordId;
    router.push(`/analysis/${result.recordId}`);
  } catch (e) {
    saveError.value = e.message || "保存失败。";
  } finally {
    saving.value = false;
  }
}

async function loadExperiment(experimentId) {
  loading.value = true;
  error.value = "";
  clearExperimentRuntime();

  try {
    let data;
    try {
      data = await getLabDemo(experimentId);
    } catch {
      data = await getLabDemo("sample-count");
    }

    labData.value = {
      ...data,
      experimentId: meta.value.id,
      title: meta.value.title,
      objective: meta.value.resultHint || meta.value.title
    };
    objective.value = labData.value.objective;

    form.value = {
      epochs: meta.value.defaultParams?.epochs || 20,
      batchSize: meta.value.defaultParams?.batchSize || 16,
      learningRate: meta.value.defaultParams?.learningRate || 0.001,
      imageSize: data.trainConfig?.imageSize || 64
    };

    classMap.value = defaultClassNamesForExperiment(experimentId).map((name) => createClassItem(name));
    experimentLog.value = [
      {
        time: new Date().toISOString(),
        event: "enter_lab",
        action: experimentActionLabels.enter_lab,
        detail: meta.value.title,
        modelVersion: modelVersion.value,
        step: getVersionLabel()
      }
    ];
  } catch (e) {
    error.value = e.message || "实验工作台加载失败。";
  } finally {
    loading.value = false;
  }
}

watch(
  () => route.params.experimentId,
  (experimentId) => {
    if (experimentId) {
      loadExperiment(String(experimentId));
    }
  }
);

watch(
  () => classMap.value.map((item) => item.name.trim()).join("|"),
  () => {
    if (trainedClassIds.value.length) {
      syncBatchEntries(trainedClassIds.value);
    }
  }
);

onMounted(() => {
  loadExperiment(String(route.params.experimentId || "sample-count"));
});

onBeforeUnmount(() => {
  disposeModel();
  resetPrediction();
  revokeEntries(classMap.value.flatMap((item) => item.files));
  revokeEntries(batchTestMap.value.flatMap((item) => item.files));
});
</script>

<template>
  <section class="lab-page page-layout">
    <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon />
    <div v-else-if="loading" class="page-card"><el-skeleton :rows="10" animated /></div>
    <EmptyState
      v-else-if="!labData"
      title="暂无实验数据"
      description="当前实验接口没有返回可展示的数据。"
    />

    <template v-else>
      <header class="page-heading lab-heading">
        <div class="page-heading__copy">
          <span class="status-label">当前实验</span>
          <h1 class="page-title">{{ meta.title }}</h1>
          <p class="page-subtitle">控制变量：{{ meta.variable }}。按数据、训练、测试、保存的顺序完成本次实验。</p>
        </div>
        <div class="lab-flow" aria-label="实验操作顺序">
          <span v-for="step in workflowSteps" :key="step.label" :class="{ active: step.active }">{{ step.label }}</span>
        </div>
      </header>

      <!-- 项目信息 -->
      <section class="project-info-card lab-module">
        <div class="project-info-grid">
          <div class="pi-field">
            <label class="pi-label">项目名称</label>
            <input v-model="projectName" class="pi-input" placeholder="例如：水果分类模型优化实验" />
          </div>
          <div class="pi-field">
            <label class="pi-label">小组名称</label>
            <input v-model="groupName" class="pi-input" placeholder="例如：第三小组" />
          </div>
          <div class="pi-field">
            <label class="pi-label">作者署名</label>
            <input v-model="authorName" class="pi-input" placeholder="可选，填写昵称或成员简称" />
          </div>
        </div>
        <div class="pi-textareas">
          <div class="pi-field">
            <label class="pi-label">实验目标</label>
            <textarea v-model="objective" class="pi-textarea" rows="2" placeholder="说明本次实验想研究什么问题"></textarea>
          </div>
          <div class="pi-field">
            <label class="pi-label">实验假设</label>
            <textarea v-model="hypothesis" class="pi-textarea" rows="2" placeholder="例如：每类训练样本数量增加后，模型准确率会提高"></textarea>
          </div>
          <div class="pi-field">
            <label class="pi-label">变量说明</label>
            <textarea v-model="variableDescription" class="pi-textarea" rows="2" placeholder="说明本次实验改变什么变量，保持哪些条件不变"></textarea>
          </div>
          <div class="pi-field">
            <label class="pi-label">数据集说明</label>
            <textarea v-model="datasetNote" class="pi-textarea" rows="2" placeholder="说明训练集、测试集、图片类别和样本来源"></textarea>
          </div>
        </div>
      </section>

<main class="lab-workbench">
        <aside class="panel-card class-panel" :class="{ 'is-emphasis': samplePanelActive }" data-testid="class-panel">
          <div class="panel-head">
            <div>
              <h3>左栏：数据与类别</h3>
              <p>命名类别、上传训练图片，先让数据满足训练条件。</p>
            </div>
            <div class="panel-head__meta">
              <span v-if="samplePanelActive" class="focus-pill">{{ meta.variable }}</span>
              <button type="button" class="add-link" :disabled="classMap.length >= 3" @click="addClass">+ 添加类别</button>
            </div>
          </div>

          <div class="experiment-lens lab-module is-active">
            <span>{{ experimentLens.label }}</span>
            <strong>{{ experimentLens.title }}</strong>
            <p>{{ experimentLens.value }}</p>
            <small>{{ experimentLens.note }}</small>
          </div>

          <div class="sample-ledger">
            <div v-for="item in classItems" :key="`ledger-${item.id}`" class="lab-module">
              <span>{{ item.name || "未命名类别" }}</span>
              <strong>{{ item.files.length }}</strong>
              <small>训练图</small>
            </div>
          </div>

          <article v-for="item in classItems" :key="item.id" class="class-card lab-module" data-testid="class-card">
            <div class="class-card__head">
              <div class="class-title">
                <template v-if="editingClassId === item.id">
                  <input
                    :data-class-id="item.id"
                    v-model="classMap[item.index].name"
                    class="class-name-edit"
                    data-testid="class-name-edit"
                    @blur="saveClassName(item.index)"
                    @keydown.enter.prevent="saveClassName(item.index)"
                  />
                </template>
                <template v-else>
                  <strong>{{ item.name }}</strong>
                  <button type="button" class="icon-action" @click="startEditClassName(item.id)">编辑</button>
                </template>
              </div>
              <button v-if="item.canDelete" type="button" class="icon-action danger" @click="removeClass(item.index)">删除</button>
            </div>

            <div class="class-meta">
              <span>{{ item.files.length }} 张训练图片</span>
              <span v-if="item.files.length < 2" class="warning-text">至少需要 2 张</span>
            </div>

            <div class="sample-actions">
              <label class="sample-button">
                上传图片
                <input
                  class="hidden-input"
                  data-testid="class-image-upload"
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp"
                  multiple
                  @change="handleClassFiles(item.index, $event)"
                />
              </label>
            </div>

            <div v-if="item.files.length" class="thumb-strip">
              <div v-for="fileEntry in item.files" :key="fileEntry.id" class="thumb-item" data-testid="class-image-thumb">
                <img :src="fileEntry.url" :alt="fileEntry.file.name" class="thumb-image" />
                <button type="button" class="thumb-remove" @click="removeClassImage(item.index, fileEntry.id)">×</button>
              </div>
            </div>
            <p v-else class="empty-line">上传后在这里预览缩略图。</p>
          </article>
        </aside>

        <aside class="panel-card train-panel" :class="{ 'is-emphasis': trainPanelActive }" data-testid="train-panel">
          <div class="panel-head">
            <div>
              <h3>中栏：训练参数与状态</h3>
              <p>调整训练参数，启动训练，并观察训练进度。</p>
            </div>
            <div class="panel-head__meta">
              <span v-if="trainPanelActive" class="focus-pill">{{ meta.variable }}</span>
              <span class="status-pill" :class="`is-${trainState}`">{{ trainingStatusLabel }}</span>
            </div>
          </div>

          <div class="train-summary lab-module is-active">
            <strong>{{ experimentLens.title }}：{{ experimentLens.value }}</strong>
            <p>{{ parameterFocusText }}</p>
          </div>

          <div class="param-list">
            <div class="param-row lab-module" :class="{ active: meta.id === 'epoch-count' }">
              <span>训练轮次</span>
              <div class="stepper">
                <button type="button" @click="updateEpoch(-1)">-</button>
                <span>{{ form.epochs }}</span>
                <button type="button" @click="updateEpoch(1)">+</button>
              </div>
            </div>
            <div class="param-row lab-module">
              <span>批处理大小</span>
              <div class="stepper">
                <button type="button" @click="updateBatchSize(-1)">-</button>
                <span>{{ form.batchSize }}</span>
                <button type="button" @click="updateBatchSize(1)">+</button>
              </div>
            </div>
            <label class="param-row lab-module">
              <span>学习率</span>
              <input v-model.number="form.learningRate" class="param-input" type="number" min="0.0001" step="0.0001" @change="logTrainConfigChange()" />
            </label>
            <div class="param-row lab-module">
              <span>图片尺寸</span>
              <span class="readonly-chip">{{ form.imageSize }}</span>
            </div>
          </div>

          <div class="training-reference">
            <div class="lab-module">
              <strong>固定条件</strong>
              <p>{{ introConstants.join("、") }}</p>
            </div>
            <div class="lab-module">
              <strong>观察指标</strong>
              <p>{{ introMetrics.join("、") }}</p>
            </div>
          </div>

          <div class="train-actions">
            <el-button
              type="primary"
              data-testid="start-real-training"
              :disabled="!canTrainReal || trainState === 'running'"
              @click="startRealTraining"
            >
              {{ trainState === "running" ? "训练中..." : trainState === "completed" ? "重新训练" : "开始真实训练" }}
            </el-button>
            <el-button plain @click="resetTrainConfig">恢复默认参数</el-button>
          </div>

          <div class="train-progress">
            <div class="train-progress__bar">
              <div class="train-progress__fill" :style="{ width: `${trainProgress}%` }"></div>
            </div>
            <div class="train-progress__text">{{ trainLogText }}</div>
          </div>

          <div class="train-hint">{{ canTrainReal ? "样本已满足训练条件。" : datasetError() }}</div>
          <el-alert v-if="trainError" :title="trainError" type="error" :closable="false" show-icon />
        </aside>

        <aside class="panel-card preview-panel" data-testid="preview-panel">
          <div class="panel-head">
            <div>
              <h3>右栏：测试、预测与保存</h3>
              <p>完成单图预测、批量测试，再保存实验记录。</p>
            </div>
          </div>

          <div class="operation-sequence">
            <div class="lab-module active"><span>1</span>单图测试</div>
            <div class="lab-module"><span>2</span>批量测试</div>
            <div class="lab-module"><span>3</span>保存记录</div>
          </div>

          <div class="panel-tip compact-tip lab-module">
            <strong>观察重点</strong>
            <p>{{ resultFocusText }}</p>
          </div>

          <label class="predict-upload">
            <input
              class="hidden-input"
              data-testid="single-predict-upload"
              type="file"
              accept=".png,.jpg,.jpeg,.webp"
              @change="handleTestFile"
            />
            <strong>上传单张测试图片</strong>
            <span>用于单图预测，不会覆盖训练样本。</span>
          </label>

          <div class="predict-preview">
            <img v-if="testPreviewUrl" :src="testPreviewUrl" alt="测试图片预览" class="preview-image" />
            <div v-else class="preview-empty">等待上传测试图片</div>
          </div>

          <div class="predict-actions">
            <el-button type="primary" :loading="testPredicting" @click="doPredict">开始预测</el-button>
            <el-button plain @click="resetPrediction">清空</el-button>
          </div>
          <el-alert v-if="testError" :title="testError" type="error" :closable="false" show-icon />

          <div class="prediction-output lab-module" data-testid="prediction-output">
            <div class="prediction-head">
              <strong>预测输出</strong>
              <span v-if="testPrediction">{{ formatPercent(testPrediction.confidence) }}</span>
            </div>

            <div v-if="!testPrediction" class="output-empty">完成训练后再上传测试图片查看预测结果。</div>

            <template v-else>
              <div class="prediction-main">{{ testPrediction.predictedLabel }}</div>
              <label class="truth-select">
                <span>真实类别</span>
                <select v-model="selectedTrueLabel" @change="updateCorrectState">
                  <option value="">请选择真实类别</option>
                  <option v-for="name in trainedClassNames" :key="name" :value="name">{{ name }}</option>
                </select>
              </label>
              <div class="result-actions">
                <span v-if="testIsCorrect === true" class="judge-tag success">预测正确</span>
                <span v-else-if="testIsCorrect === false" class="judge-tag danger">预测错误</span>
                <el-button plain @click="addTestResult">加入测试结果</el-button>
              </div>
            </template>

            <div v-for="item in predictionRows" :key="item.label" class="probability-row">
              <div class="probability-label">{{ item.label }}</div>
              <div class="probability-track">
                <div class="probability-fill" :class="`tone-${item.tone % 4}`" :style="{ width: `${item.width}%` }"></div>
              </div>
              <div class="probability-value">{{ Math.round((item.confidence || 0) * 100) }}%</div>
            </div>
          </div>

          <div class="batch-summary lab-module">
            <div class="batch-summary__head">
              <span>{{ batchSummaryText }}</span>
              <button type="button" class="add-link" @click="showBatchDetails = !showBatchDetails">
                {{ showBatchDetails ? "收起" : "展开" }}
              </button>
            </div>
            <div v-if="showBatchDetails" class="batch-summary__body">
              <div v-for="(item, index) in batchTestMap" :key="item.classId" class="batch-item lab-module">
                <div class="batch-item__head">
                  <strong>{{ item.name }}</strong>
                  <span>{{ item.files.length }} 张</span>
                </div>
                <div class="batch-item__actions">
                  <label class="sample-button mini">
                    上传测试图
                    <input
                      class="hidden-input"
                      type="file"
                      accept=".png,.jpg,.jpeg,.webp"
                      multiple
                      @change="handleBatchFiles(index, $event)"
                    />
                  </label>
                  <button type="button" class="add-link" @click="resetBatchFiles(index)">清空</button>
                </div>
              </div>
              <el-button type="primary" plain :loading="batchTesting" @click="doBatchTest">开始批量测试</el-button>
              <el-alert v-if="batchTestError" :title="batchTestError" type="error" :closable="false" show-icon />
              <div v-if="batchTestResult" class="batch-result" data-testid="batch-test-summary">{{ batchSummaryText }}</div>
              <ConfusionMatrix v-if="batchTestResult" :confusion-matrix="batchTestResult.confusionMatrix" />
            </div>
          </div>

          <div class="record-box lab-module">
            <!-- 模型版本与实验记录 -->
            <div class="version-section" v-if="trainState === 'completed'">
              <div class="version-head">
                <span class="version-badge" :class="modelVersion === 0 ? 'v1' : 'v2'">{{ getVersionLabel() }}</span>
                <span v-if="modelVersion === 0" style="color: var(--muted); font-size: 12px;">
                  当前为模型 1.0，可先记录优化方案，再切换到模型 2.0 继续实验
                </span>
                <el-button v-if="modelVersion === 0" size="small" type="warning" plain @click="switchToNextVersion">
                  切换到模型 2.0
                </el-button>
                <span v-else style="color: var(--success); font-size: 12px; font-weight: 700;">
                  模型 2.0 实验中
                </span>
              </div>
              <div class="opt-field">
                <label class="opt-label">优化方案</label>
                <textarea v-model="optimizationPlan" class="opt-textarea" rows="2" placeholder="说明模型 1.0 暴露的问题，以及准备如何优化"></textarea>
              </div>
              <div class="opt-field">
                <label class="opt-label">实验反思</label>
                <textarea v-model="reflection" class="opt-textarea" rows="2" placeholder="说明如果继续优化，还会怎么改进"></textarea>
              </div>
              <div class="opt-field">
                <label class="opt-label">实验结论</label>
                <textarea v-model="conclusion" class="opt-textarea" rows="2" placeholder="根据测试结果说明实验结论"></textarea>
              </div>
              <div v-if="showVersionCompare && versionHistory.length" class="version-compare">
                <strong>模型版本对比</strong>
                <div class="compare-row" v-for="(vh, i) in versionHistory" :key="i">
                  模型 {{ vh.fromVersion + 1 }}.0 → 模型 {{ vh.toVersion + 1 }}.0：准确率 {{ (vh.accuracy * 100).toFixed(1) }}%，错误 {{ vh.errorCount }} 个，优化：{{ vh.plan || '未记录' }}
                </div>
              </div>
            </div>

            <strong>保存记录与跳转</strong>
            <p>{{ experimentSummaryText }}</p>
            <div v-if="trainState === 'completed'" class="model-save-status">
              <div class="model-save-status__copy">
                <strong>本机模型</strong>
                <p>{{ modelStatusText }}</p>
              </div>
              <el-tag :type="savedModelInfo ? 'success' : 'info'">{{ modelStatusLabel }}</el-tag>
              <el-button
                plain
                data-testid="save-model"
                :disabled="!canSaveModel || Boolean(savedModelInfo)"
                :loading="modelSaving"
                @click="saveCurrentModel"
              >
                {{ savedModelInfo ? "模型已保存" : "保存模型" }}
              </el-button>
              <el-button
                plain
                data-testid="export-model"
                :disabled="!canExportModel"
                :loading="modelExporting"
                @click="exportCurrentModel"
              >
                导出模型
              </el-button>
            </div>
            <el-alert v-if="modelSaveError" :title="modelSaveError" type="error" :closable="false" show-icon />
            <el-alert v-if="modelExportError" :title="modelExportError" type="error" :closable="false" show-icon />
            <div class="record-actions">
              <!-- 实验过程日志 -->
              <details v-if="experimentLog.length" class="experiment-log-details">
                <summary>实验过程日志：{{ experimentLog.length }} 条</summary>
                <div class="log-timeline">
                  <div v-for="(entry, i) in experimentLog" :key="i" class="log-entry">
                    <span class="log-time">{{ new Date(entry.time).toLocaleTimeString("zh-CN") }}</span>
                    <span class="log-event">{{ entry.action || entry.event }}</span>
                    <span v-if="entry.detail" class="log-detail">{{ entry.detail }}</span>
                  </div>
                </div>
              </details>

<el-button type="primary" data-testid="save-record" :loading="saving" @click="saveRecord">保存实验记录</el-button>
              <el-button plain @click="router.push('/records')">查看实验记录</el-button>
              <el-button v-if="savedRecordId" plain @click="router.push(`/report/${savedRecordId}`)">查看实验报告</el-button>
            </div>
            <el-alert v-if="saveError" :title="saveError" type="error" :closable="false" show-icon />
          </div>
        </aside>
      </main>
    </template>
  </section>
</template>

<style scoped>
.lab-page {
  width: 100%;
  min-height: calc(100vh - 72px);
  padding: 0;
  box-sizing: border-box;
}

.status-label {
  font-size: 12px;
  color: var(--muted);
  font-weight: 700;
}

.lab-heading {
  align-items: center;
}

.lab-flow {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  border: 1px solid var(--border);
  border-radius: var(--radius-control);
  background: var(--surface-alt);
}

.lab-flow span {
  min-width: 54px;
  padding: 8px 10px;
  border-radius: var(--radius-control);
  color: var(--muted);
  font-size: 13px;
  font-weight: 800;
  text-align: center;
}

.lab-flow span.active {
  border: 1px solid rgba(37, 99, 235, 0.22);
  background: var(--primary-soft);
  color: var(--primary);
}

.lab-workbench {
  width: 100%;
  max-width: none;
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(360px, 1.05fr) minmax(300px, 0.86fr) minmax(340px, 0.98fr);
  gap: 14px;
  align-items: start;
}

.panel-card {
  min-width: 0;
  display: grid;
  gap: 14px;
  padding: 16px;
  border-radius: var(--radius-card);
  background: var(--surface);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-soft);
  transition:
    border-color 0.16s ease,
    box-shadow 0.16s ease;
}

.panel-card.is-emphasis {
  border-color: var(--border-active);
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
}

.panel-card:hover,
.panel-card:focus-within {
  border-color: var(--border-hover);
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.06);
}

.panel-head,
.panel-head__meta,
.train-actions,
.predict-actions,
.result-actions,
.class-card__head,
.batch-item__actions,
.batch-summary__head,
.batch-item__head,
.record-actions,
.model-save-status,
.class-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.panel-head h3,
.class-title strong,
.prediction-main,
.record-box strong,
.train-summary strong,
.panel-tip strong,
.fixed-box strong,
.training-reference strong {
  margin: 0;
}

.panel-head p,
.panel-tip p,
.fixed-box p,
.training-reference p,
.train-hint,
.empty-line,
.output-empty,
.model-save-status__copy p,
.record-box p {
  margin: 0;
  color: var(--muted);
  line-height: 1.7;
}

.panel-tip,
.train-summary,
.fixed-box,
.prediction-output,
.batch-summary,
.record-box {
  padding: 12px 14px;
  display: grid;
  gap: 8px;
}

.compact-tip {
  padding: 10px 12px;
}

.model-save-status {
  padding: 10px 0;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}

.model-save-status__copy {
  min-width: 180px;
  flex: 1 1 220px;
  display: grid;
  gap: 4px;
}

.model-save-status__copy p {
  word-break: break-all;
  font-size: 13px;
}

.experiment-lens {
  padding: 12px 14px;
  display: grid;
  gap: 4px;
}

.experiment-lens span,
.experiment-lens small {
  color: var(--muted);
  font-size: 12px;
  font-weight: 800;
}

.experiment-lens strong {
  color: var(--heading);
  font-size: 18px;
}

.experiment-lens p {
  margin: 0;
  color: var(--primary);
  font-weight: 800;
  line-height: 1.45;
}

.sample-ledger {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: 8px;
}

.sample-ledger div {
  padding: 10px;
  display: grid;
  gap: 2px;
}

.sample-ledger span,
.sample-ledger small {
  color: var(--muted);
  font-size: 12px;
  font-weight: 700;
}

.sample-ledger strong {
  color: var(--heading);
  font-size: 22px;
}

.focus-pill,
.status-pill,
.judge-tag,
.readonly-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-control);
  font-size: 12px;
  font-weight: 700;
}

.focus-pill {
  height: 28px;
  padding: 0 12px;
  border: 1px solid rgba(37, 99, 235, 0.22);
  background: var(--primary-soft);
  color: var(--primary);
}

.status-pill {
  border: 1px solid var(--border);
  padding: 8px 12px;
}

.status-pill.is-idle {
  background: var(--surface-strong);
  color: var(--muted);
}

.status-pill.is-running {
  border-color: rgba(37, 99, 235, 0.22);
  background: var(--primary-soft);
  color: var(--primary);
}

.status-pill.is-completed {
  border-color: rgba(15, 118, 110, 0.22);
  background: #eef7f4;
  color: var(--success);
}

.status-pill.is-failed {
  border-color: rgba(194, 65, 65, 0.22);
  background: var(--danger-soft);
  color: var(--danger);
}

.add-link,
.icon-action {
  border: none;
  background: transparent;
  color: var(--primary);
  font-weight: 700;
  cursor: pointer;
  border-radius: var(--radius-control);
  transition:
    background 0.16s ease,
    color 0.16s ease,
    transform 0.16s ease;
}

.add-link:hover,
.icon-action:hover,
.add-link:focus-visible,
.icon-action:focus-visible {
  background: var(--primary-soft);
}

.add-link:active,
.icon-action:active {
  transform: translateY(1px);
}

.icon-action.danger {
  color: #dc2626;
}

.class-card {
  display: grid;
  gap: 12px;
  padding: 12px;
  transition:
    border-color 0.16s ease,
    background 0.16s ease,
    transform 0.16s ease;
}

.class-card:hover,
.class-card:focus-within {
  border-color: var(--border-hover);
  background: var(--surface-hover);
}

.class-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.class-name-edit,
.param-input,
.truth-select select {
  min-height: 38px;
  padding: 0 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-control);
  background: #fff;
  outline: none;
  transition:
    border-color 0.16s ease,
    box-shadow 0.16s ease,
    background 0.16s ease;
}

.class-name-edit:focus,
.param-input:focus,
.truth-select select:focus {
  border-color: var(--border-active);
  background: #fff;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.warning-text {
  color: #f59e0b;
  font-weight: 700;
}

.sample-actions {
  display: flex;
  gap: 10px;
}

.sample-button {
  min-width: 90px;
  height: 42px;
  padding: 0 14px;
  border-radius: var(--radius-control);
  background: var(--primary);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition:
    background 0.16s ease,
    box-shadow 0.16s ease,
    transform 0.16s ease;
}

.sample-button.mini {
  min-width: 0;
  height: 36px;
  font-size: 13px;
}

.sample-button:hover,
.sample-button:focus-within {
  background: var(--primary-hover);
  box-shadow: 0 6px 14px rgba(37, 99, 235, 0.14);
  transform: translateY(-1px);
}

.sample-button:active {
  transform: translateY(0);
}

.thumb-strip {
  display: flex;
  gap: 10px;
  overflow-x: auto;
}

.thumb-item {
  position: relative;
  flex: 0 0 auto;
}

.thumb-image {
  width: 58px;
  height: 58px;
  border-radius: 10px;
  object-fit: cover;
  display: block;
}

.thumb-remove {
  position: absolute;
  right: 4px;
  top: 4px;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: var(--radius-control);
  background: rgba(15, 23, 42, 0.68);
  color: #fff;
  line-height: 1;
  cursor: pointer;
}

.param-list,
.train-progress,
.truth-select,
.batch-summary__body {
  display: grid;
  gap: 12px;
}

.param-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  transition:
    background 0.16s ease,
    border-color 0.16s ease,
    transform 0.16s ease;
}

.param-row.active {
  border-color: var(--border-active);
  background:
    linear-gradient(180deg, #ffffff 0%, #eff6ff 100%);
}

.param-row:hover,
.param-row:focus-within {
  border-color: var(--border-hover);
  background: var(--surface-hover);
}

.param-row:active {
  transform: translateY(1px);
}

.stepper {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--border);
  border-radius: var(--radius-control);
  overflow: hidden;
}

.stepper button {
  width: 34px;
  height: 34px;
  border: none;
  background: #f8fbff;
  color: var(--primary);
  font-size: 18px;
  cursor: pointer;
  transition:
    background 0.16s ease,
    transform 0.16s ease;
}

.stepper button:hover,
.stepper button:focus-visible {
  background: var(--primary-soft);
}

.stepper button:active {
  transform: translateY(1px);
}

.stepper span {
  min-width: 44px;
  text-align: center;
  font-weight: 700;
}

.readonly-chip {
  min-width: 56px;
  height: 34px;
  padding: 0 12px;
  background: #f1f5f9;
  color: var(--muted);
}

.train-progress__bar {
  width: 100%;
  height: 10px;
  border-radius: 999px;
  background: #e7eef7;
  overflow: hidden;
}

.train-progress__fill {
  height: 100%;
  background: linear-gradient(90deg, #60a5fa, #2563eb);
}

.train-progress__text {
  padding: 10px 12px;
  border-radius: var(--radius-control);
  background: var(--surface-alt);
  color: var(--muted);
  font-size: 13px;
  line-height: 1.6;
}

.predict-upload {
  display: grid;
  gap: 6px;
  min-height: 96px;
  padding: 16px;
  border-radius: var(--radius-card);
  border: 1px solid var(--border);
  background:
    linear-gradient(180deg, #ffffff 0%, var(--readout) 100%);
  text-align: center;
  color: var(--primary);
  cursor: pointer;
  transition:
    background 0.16s ease,
    border-color 0.16s ease,
    box-shadow 0.16s ease,
    transform 0.16s ease;
}

.predict-upload:hover,
.predict-upload:focus-within {
  border-color: var(--border-hover);
  background: var(--surface-hover);
  box-shadow: 0 8px 16px rgba(15, 23, 42, 0.06);
  transform: translateY(-1px);
}

.predict-upload:active {
  transform: translateY(0);
}

.predict-preview {
  min-height: 190px;
  border-radius: var(--radius-card);
  background: #f8fafc;
  display: grid;
  place-items: center;
  overflow: hidden;
}

.preview-image {
  width: 100%;
  height: 190px;
  object-fit: contain;
}

.preview-empty {
  color: var(--muted);
  font-weight: 600;
}

.prediction-head,
.probability-row {
  display: grid;
  align-items: center;
}

.prediction-head {
  grid-template-columns: 1fr auto;
  gap: 10px;
}

.prediction-main {
  font-size: 18px;
  font-weight: 700;
  color: var(--primary);
}

.judge-tag {
  height: 28px;
  padding: 0 12px;
}

.judge-tag.success {
  border: 1px solid rgba(15, 118, 110, 0.22);
  background: #eef7f4;
  color: var(--success);
}

.judge-tag.danger {
  border: 1px solid rgba(194, 65, 65, 0.22);
  background: var(--danger-soft);
  color: var(--danger);
}

.probability-row {
  grid-template-columns: 56px 1fr 42px;
  gap: 8px;
}

.probability-label,
.probability-value {
  font-size: 13px;
  font-weight: 700;
}

.probability-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.probability-track {
  min-width: 0;
  height: 22px;
  border-radius: 999px;
  background: #e7eef7;
  overflow: hidden;
}

.probability-fill {
  height: 100%;
  border-radius: inherit;
}

.probability-fill.tone-0 {
  background: linear-gradient(90deg, #7db3ff, #2563eb);
}

.probability-fill.tone-1 {
  background: linear-gradient(90deg, #9db9da, #4f77ad);
}

.probability-fill.tone-2 {
  background: linear-gradient(90deg, #b6cbe4, #6b8fb8);
}

.probability-fill.tone-3 {
  background: linear-gradient(90deg, #c7d4e4, #8ca0b8);
}

.probability-value {
  text-align: right;
}

.batch-item {
  padding: 12px;
}

.batch-result {
  padding: 10px 12px;
  border-radius: var(--radius-control);
  background: #eff6ff;
  color: #2563eb;
  font-size: 13px;
  font-weight: 700;
}

.training-reference {
  display: grid;
  gap: 8px;
}

.training-reference div {
  padding: 10px 12px;
  display: grid;
  gap: 4px;
}

.operation-sequence {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}

.operation-sequence div {
  padding: 9px 8px;
  color: var(--muted);
  font-size: 13px;
  font-weight: 800;
  text-align: center;
  transition:
    background 0.16s ease,
    border-color 0.16s ease,
    transform 0.16s ease;
}

.operation-sequence span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 20px;
  margin-right: 6px;
  border: 1px solid var(--border);
  border-radius: var(--radius-control);
  background: var(--readout);
  color: var(--primary);
}

.operation-sequence .active {
  border-color: var(--border-active);
  background: var(--surface-active);
  color: var(--primary);
}

.operation-sequence div:hover,
.operation-sequence div:focus-within {
  border-color: var(--border-hover);
  background: var(--surface-hover);
  transform: translateY(-1px);
}

.operation-sequence div:active {
  transform: translateY(0);
}

.hidden-input {
  display: none;
}

@media (max-width: 1280px) {
  .lab-workbench {
    grid-template-columns: minmax(440px, 1fr) minmax(340px, 0.9fr);
  }

  .train-panel {
    grid-column: 1;
  }

  .preview-panel {
    grid-column: 2;
  }
}

@media (max-width: 960px) {
  .lab-status-bar,
  .lab-workbench {
    grid-template-columns: 1fr;
  }
}
/* Project info card */
.project-info-card { padding: 16px 20px; }
.project-info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.pi-field { display: flex; flex-direction: column; gap: 4px; }
.pi-label { font-size: 12px; font-weight: 800; color: var(--muted); }
.pi-input { min-height: 36px; padding: 0 12px; border: 1px solid var(--border); border-radius: var(--radius-control); background: #fff; color: var(--text); font-size: 13px; outline: none; }
.pi-input:focus { border-color: var(--border-active); }
.pi-textareas { display: flex; flex-direction: column; gap: 10px; margin-top: 12px; }
.pi-textarea { width: 100%; min-height: 52px; padding: 8px 12px; border: 1px solid var(--border); border-radius: var(--radius-control); background: #fff; color: var(--text); font-size: 13px; line-height: 1.6; resize: vertical; outline: none; }
.pi-textarea:focus { border-color: var(--border-active); }

/* Experiment log */
.experiment-log-details { margin-bottom: 12px; }
.experiment-log-details summary { cursor: pointer; padding: 8px 0; font-size: 13px; font-weight: 800; color: var(--muted); }
.log-timeline { display: flex; flex-direction: column; gap: 6px; padding: 8px 0; }
.log-entry { display: flex; gap: 10px; align-items: baseline; font-size: 12px; }
.log-time { color: var(--muted); min-width: 70px; }
.log-event { font-weight: 700; color: var(--heading); }
.log-detail { color: var(--muted); }

@media (max-width: 768px) {
  .project-info-grid { grid-template-columns: 1fr; }
}
</style>
