<script setup>
import { computed, markRaw, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, toRaw, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { createRecord, getLabDemo } from "../utils/api";
import { getExperimentMeta } from "../utils/experimentContent";
import { formatLoss, formatPercent, safeText } from "../utils/formatters";
import { buildLabExportMetadata, createModelExportBaseName } from "../utils/modelExport";
import { buildRealRecordPayload } from "../utils/recordBuilder";
import { evaluateTestDataset, exportModelFiles, loadModelFromIndexedDB, predictImage, removeModelFromIndexedDB, saveModelToIndexedDB, trainImageClassifier } from "../utils/tfTrainer";
import {
  createPersistableLabSession,
  createVersion1Snapshot,
  findDatasetOverlaps,
  getLabStepTargetId,
  getVersion2EntryReason,
  metricTrend
} from "../utils/labWorkflow";
import {
  clearLabDatasetFiles,
  clearLabSession,
  loadLabDatasetFiles,
  loadLabSession,
  saveLabDatasetFiles,
  saveLabSession
} from "../utils/labSessionStorage";
import ConfusionMatrix from "../components/ConfusionMatrix.vue";
import CameraCaptureDialog from "../components/CameraCaptureDialog.vue";
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
const runtimeModelInfo = ref(null);
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
const variableType = ref("样本数量");
const variableDescription = ref("");
const controlledConditions = ref("");
const expectedChange = ref("");
const datasetNote = ref("");
const conclusion = ref("");
const experimentLog = ref([]);
const activeStepKey = ref("project");
const restoredSession = ref(false);
const persistenceError = ref("");
const sessionReady = ref(false);
const cameraDialogVisible = ref(false);
const cameraTarget = ref({ categoryId: "", split: "train" });
let sessionSaveTimer = null;
let datasetSaveTimer = null;

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
const recoveryDetailText = computed(() => modelRef.value
  ? "项目设定、变量、实验日志、测试结果、图片和当前模型均已从浏览器本地恢复，可直接继续实验。"
  : "项目设定、变量、实验日志、测试结果与本地图片已恢复；若本地模型不可用，请重新训练当前版本。"
);

const cameraTargetCategory = computed(() =>
  classMap.value.find((item) => item.id === cameraTarget.value.categoryId) || null
);

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

const variableOptions = ["样本数量", "图片质量", "训练轮次", "类别相似度", "背景复杂度"];

const datasetRows = computed(() =>
  classItems.value.map((item) => {
    const testItem = batchTestMap.value.find((batchItem) => batchItem.classId === item.id);
    return {
      id: item.id,
      name: item.name || "未命名类别",
      trainCount: item.files.length,
      testCount: testItem?.files?.length || 0,
      ready: item.files.length >= 2
    };
  })
);

const batchStats = computed(() => {
  const summary = batchTestResult.value?.summary || {};
  const testCount = summary.testCount ?? 0;
  const correctCount = summary.testCorrectCount ?? 0;
  const errorCount = testCount ? Math.max(0, testCount - correctCount) : summary.errorCount ?? 0;
  return {
    testCount,
    correctCount,
    errorCount,
    accuracy: typeof summary.testAccuracy === "number" ? summary.testAccuracy : null
  };
});

const hasBatchAnalysis = computed(() => Boolean(batchTestResult.value?.summary));
const hasPredictionOrTest = computed(() => Boolean(testPrediction.value || hasBatchAnalysis.value));
const hasVersionCompare = computed(() => versionHistory.value.length > 0 && modelVersion.value >= 1);
const version1Snapshot = computed(() => versionHistory.value.find((item) => item.version === "1.0") || null);
const hasCompletedTrainingEvidence = computed(() => trainState.value === "completed" || Boolean(version1Snapshot.value));
const hasPredictionOrTestEvidence = computed(() => hasPredictionOrTest.value || Boolean(version1Snapshot.value?.testCount));
const hasBatchAnalysisEvidence = computed(() => hasBatchAnalysis.value || Boolean(version1Snapshot.value?.testCount));
const evidenceAccuracy = computed(() => batchStats.value.accuracy ?? version1Snapshot.value?.accuracy ?? null);
const evidenceHasDetailedMetrics = computed(() => Boolean(
  classMetricsForEvidence.value
  || version1Snapshot.value?.classMetrics?.length
  || version1Snapshot.value?.confusionMatrix?.matrix?.length
  || version1Snapshot.value?.errorSamples?.length
));
const enterVersion2Reason = computed(() => getVersion2EntryReason({
  modelVersion: modelVersion.value,
  trainState: trainState.value,
  hasModel: Boolean(modelRef.value),
  testCount: batchStats.value.testCount,
  optimizationPlan: optimizationPlan.value
}));
const canEnterVersion2 = computed(() => !enterVersion2Reason.value);
const currentStage = computed(() => {
  if (modelVersion.value >= 1) return "模型 2.0 优化迭代";
  if (hasBatchAnalysis.value) return "测试分析";
  if (trainState.value === "completed") return "训练模型 1.0";
  if (totalTrainingSamples.value > 0) return "数据准备";
  if (variableDescription.value || controlledConditions.value || expectedChange.value) return "变量设计";
  return "项目设定";
});

const stemSteps = computed(() => [
  { key: "project", title: "项目设定", tag: "S 科学探究", done: Boolean(objective.value && hypothesis.value), active: activeStepKey.value === "project" },
  { key: "variable", title: "变量设计", tag: "S + M", done: Boolean(variableType.value && variableDescription.value && controlledConditions.value), active: activeStepKey.value === "variable" },
  { key: "dataset", title: "数据准备", tag: "T + M", done: canTrainReal.value && batchTestMap.value.some((item) => item.files.length), active: activeStepKey.value === "dataset" },
  { key: "train", title: "训练模型 1.0", tag: "T 技术实现", done: trainState.value === "completed", active: activeStepKey.value === "train" },
  { key: "test", title: "测试分析", tag: "M 数学分析", done: hasBatchAnalysis.value, active: activeStepKey.value === "test" },
  { key: "iterate", title: "优化迭代与保存", tag: "E 工程优化", done: Boolean(optimizationPlan.value && conclusion.value && reflection.value), active: activeStepKey.value === "iterate" }
]);

const completionPercent = computed(() => {
  const doneCount = stemSteps.value.filter((step) => step.done).length;
  return Math.round((doneCount / stemSteps.value.length) * 100);
});

const datasetChecklist = computed(() => [
  { label: "每类至少有训练图片", done: classItems.value.every((item) => item.files.length > 0) },
  { label: "每类至少有测试图片", done: batchTestMap.value.length > 0 && batchTestMap.value.every((item) => item.files.length > 0) },
  { label: "训练集和测试集不混用", done: Boolean(datasetNote.value.trim()) },
  { label: "类别名称清楚", done: classItems.value.every((item) => item.name.trim()) },
  { label: "图片质量尽量清晰", done: Boolean(datasetNote.value.trim()) },
  { label: "没有上传人脸等敏感信息", done: Boolean(datasetNote.value.trim()) }
]);

function evidenceStatus(items) {
  const doneCount = items.filter((item) => item.done).length;
  if (doneCount === 0) return "未开始";
  if (doneCount === items.length) return "已完成";
  return "进行中";
}

const stemEvidenceGroups = computed(() => {
  const groups = [
    {
      title: "S 科学探究",
      items: [
        { label: "填写实验目标", done: Boolean(objective.value.trim()) },
        { label: "填写实验假设", done: Boolean(hypothesis.value.trim()) },
        { label: "填写变量说明", done: Boolean(variableDescription.value.trim()) }
      ]
    },
    {
      title: "T 技术实现",
      items: [
        { label: "上传训练图片", done: totalTrainingSamples.value > 0 },
        { label: "完成模型训练", done: hasCompletedTrainingEvidence.value },
        { label: "完成预测或测试", done: hasPredictionOrTestEvidence.value }
      ]
    },
    {
      title: "E 工程优化",
      items: [
        { label: "填写优化方案", done: Boolean(optimizationPlan.value.trim()) },
        { label: "进入模型 2.0", done: modelVersion.value >= 1 },
        { label: "形成版本对比", done: hasVersionCompare.value }
      ]
    },
    {
      title: "M 数学分析",
      items: [
        { label: "完成批量测试", done: hasBatchAnalysisEvidence.value },
        { label: "有准确率", done: typeof evidenceAccuracy.value === "number" },
        { label: "有每类准确率、混淆矩阵或错误样本", done: evidenceHasDetailedMetrics.value }
      ]
    }
  ];
  return groups.map((group) => ({ ...group, status: evidenceStatus(group.items) }));
});

const classMetricsForEvidence = computed(() =>
  Boolean(batchTestResult.value?.classMetrics?.length || batchTestResult.value?.confusionMatrix?.matrix?.length)
);

const diagnosisText = computed(() => {
  if (!hasBatchAnalysis.value) return "完成批量测试后，再根据准确率、混淆矩阵和错误样本判断模型问题。";
  if (batchStats.value.accuracy !== null && batchStats.value.accuracy < 0.7) {
    return "当前测试准确率偏低，优先检查训练样本数量、类别边界和图片质量。";
  }
  if (batchStats.value.errorCount > 0) {
    return "模型已经能完成基本分类，但错误样本仍可作为模型 2.0 的优化依据。";
  }
  return "当前批量测试没有记录错误样本，可继续增加独立测试图验证稳定性。";
});

const datasetOverlaps = computed(() => findDatasetOverlaps(classMap.value, batchTestMap.value));
const datasetOverlapText = computed(() => {
  const names = datasetOverlaps.value.slice(0, 3).map((item) => item.fileName).join("、");
  const suffix = datasetOverlaps.value.length > 3 ? `等 ${datasetOverlaps.value.length} 张图片` : "";
  return `检测到训练集和测试集可能重复：${names}${suffix}。请换用未参与训练的测试图片。`;
});

function sumSnapshotCounts(items = []) {
  return items.reduce((sum, item) => sum + Number(item.count || 0), 0);
}

function comparisonStatus(before, after) {
  if (before === undefined || before === null || after === undefined || after === null) return "待测试";
  return Number(before) === Number(after) ? "不变" : "已调整";
}

const versionComparisonRows = computed(() => {
  const snapshot = version1Snapshot.value;
  if (!snapshot) return [];
  const afterAccuracy = modelVersion.value >= 1 ? batchStats.value.accuracy : null;
  const afterErrors = modelVersion.value >= 1 && hasBatchAnalysis.value ? batchStats.value.errorCount : null;
  return [
    { label: "训练轮次", before: snapshot.trainConfig?.epochs ?? "-", after: form.value.epochs ?? "-", status: comparisonStatus(snapshot.trainConfig?.epochs, form.value.epochs) },
    { label: "批处理大小", before: snapshot.trainConfig?.batchSize ?? "-", after: form.value.batchSize ?? "-", status: comparisonStatus(snapshot.trainConfig?.batchSize, form.value.batchSize) },
    { label: "学习率", before: snapshot.trainConfig?.learningRate ?? "-", after: form.value.learningRate ?? "-", status: comparisonStatus(snapshot.trainConfig?.learningRate, form.value.learningRate) },
    { label: "训练图片总数", before: sumSnapshotCounts(snapshot.trainingImageCounts), after: totalTrainingSamples.value, status: comparisonStatus(sumSnapshotCounts(snapshot.trainingImageCounts), totalTrainingSamples.value) },
    { label: "测试图片总数", before: snapshot.testCount, after: hasBatchAnalysis.value ? batchStats.value.testCount : "待测试", status: hasBatchAnalysis.value ? comparisonStatus(snapshot.testCount, batchStats.value.testCount) : "待测试" },
    { label: "总体准确率", before: snapshot.accuracy === null ? "-" : formatPercent(snapshot.accuracy), after: afterAccuracy === null ? "待测试" : formatPercent(afterAccuracy), status: metricTrend(snapshot.accuracy, afterAccuracy, true) },
    { label: "错误数量", before: snapshot.errorCount, after: afterErrors === null ? "待测试" : afterErrors, status: metricTrend(snapshot.errorCount, afterErrors, false) }
  ];
});

const classAccuracyComparison = computed(() => {
  const beforeMetrics = version1Snapshot.value?.classMetrics || [];
  const afterMetrics = batchTestResult.value?.classMetrics || [];
  const labels = new Set([...beforeMetrics, ...afterMetrics].map((item) => item.className));
  return [...labels].filter(Boolean).map((className) => {
    const before = beforeMetrics.find((item) => item.className === className)?.accuracy;
    const after = afterMetrics.find((item) => item.className === className)?.accuracy;
    return {
      className,
      before: typeof before === "number" ? formatPercent(before) : "-",
      after: typeof after === "number" ? formatPercent(after) : "待测试",
      status: metricTrend(before, after, true)
    };
  });
});

const latestLogs = computed(() => experimentLog.value.slice(-10).reverse());

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

function invalidateRuntimeModelRecovery() {
  const modelKey = runtimeModelInfo.value?.modelKey;
  runtimeModelInfo.value = null;
  if (modelKey) void removeModelFromIndexedDB(modelKey).catch(() => {});
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
  if (current.name !== original && trainState.value === "completed") invalidateRuntimeModelRecovery();
  editingClassId.value = "";
  logExperimentEvent("add_class", `确认类别名称：${current.name}`);
}

function addClass() {
  if (classMap.value.length >= 3) return;
  const nextLabel = `类别 ${String.fromCharCode(65 + classMap.value.length)}`;
  classMap.value.push(createClassItem(nextLabel));
  if (trainState.value === "completed") invalidateRuntimeModelRecovery();
  logExperimentEvent("add_class", `添加${nextLabel}`);
}

function removeClass(index) {
  if (classMap.value.length <= 2) return;
  const [removed] = classMap.value.splice(index, 1);
  revokeEntries(removed?.files || []);
  const removedTestGroup = batchTestMap.value.find((item) => item.classId === removed?.id);
  revokeEntries(removedTestGroup?.files || []);
  if (editingClassId.value === removed?.id) {
    editingClassId.value = "";
  }
  resetTrainingUI();
  invalidateRuntimeModelRecovery();
  disposeModel();
  syncBatchEntries(classMap.value.map((item) => item.id));
}

function addTrainingFiles(index, files, source = "local") {
  const current = classMap.value[index];
  if (!current) return 0;
  const incoming = Array.from(files || [])
    .slice(0, Math.max(0, 20 - current.files.length))
    .map(createFileEntry);
  if (!incoming.length) return 0;
  const combinedFiles = [...current.files, ...incoming];
  current.files = combinedFiles.slice(0, 20);
  resetTrainingUI();
  invalidateRuntimeModelRecovery();
  disposeModel();
  realResult.value = null;
  trainedClassIds.value = [];
  syncBatchEntries(classMap.value.map((item) => item.id));
  batchTestResult.value = null;
  const detail = source === "camera"
    ? `通过摄像头为“${current.name || "未命名类别"}”类别采集 ${incoming.length} 张训练图片。`
    : `${current.name || "未命名类别"}：${incoming.length} 张训练图片`;
  logExperimentEvent("upload_train_images", detail);
  return incoming.length;
}

function handleClassFiles(index, event) {
  addTrainingFiles(index, event.target.files, "local");
  event.target.value = "";
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
  invalidateRuntimeModelRecovery();
  disposeModel();
  realResult.value = null;
  trainedClassIds.value = [];
  syncBatchEntries(classMap.value.map((item) => item.id));
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

function ensureBatchItem(classId) {
  let index = batchTestMap.value.findIndex((item) => item.classId === classId);
  if (index >= 0) return index;
  if (!classMap.value.some((item) => item.id === classId)) return -1;
  batchTestMap.value.push(createBatchItem(classId));
  return batchTestMap.value.length - 1;
}

function addTestFiles(classId, files, { replace = false, source = "local" } = {}) {
  const index = ensureBatchItem(classId);
  if (index < 0) return 0;
  const current = batchTestMap.value[index];
  const available = replace ? 50 : Math.max(0, 50 - current.files.length);
  const incoming = Array.from(files || []).slice(0, available).map(createFileEntry);
  if (!incoming.length) return 0;
  if (replace) revokeEntries(current.files);
  current.files = replace ? incoming : [...current.files, ...incoming];
  batchTestResult.value = null;
  batchTestError.value = "";
  const detail = source === "camera"
    ? `通过摄像头为“${current.name}”类别采集 ${incoming.length} 张测试图片。`
    : `${current.name}：${incoming.length} 张批量测试图片`;
  logExperimentEvent("upload_test_images", detail);
  return incoming.length;
}

function handleBatchFiles(index, event) {
  const current = batchTestMap.value[index];
  if (current) addTestFiles(current.classId, event.target.files, { replace: true, source: "local" });
  event.target.value = "";
}

function removeBatchImage(index, imageId) {
  const current = batchTestMap.value[index];
  if (!current) return;
  const target = current.files.find((entry) => entry.id === imageId);
  if (target?.url) URL.revokeObjectURL(target.url);
  current.files = current.files.filter((entry) => entry.id !== imageId);
  batchTestResult.value = null;
  batchTestError.value = "";
}

function resetBatchFiles(index) {
  const current = batchTestMap.value[index];
  if (!current) return;
  revokeEntries(current.files);
  current.files = [];
  batchTestResult.value = null;
}

function openCameraCapture(categoryId) {
  const category = classMap.value.find((item) => item.id === categoryId);
  if (!category) {
    ElMessage.error("当前类别不存在或已被删除，请重新选择类别。");
    return;
  }
  cameraTarget.value = { categoryId, split: "train" };
  cameraDialogVisible.value = true;
}

function handleCameraCaptured(file, selectedSplit) {
  const category = cameraTargetCategory.value;
  const split = selectedSplit;
  if (!category) {
    ElMessage.error("当前类别不存在或已被删除，图片未加入数据集。");
    return;
  }
  if (!(file instanceof File)) {
    ElMessage.error("摄像头图片生成失败，请重拍或改用本地上传图片。");
    return;
  }

  let addedCount = 0;
  if (split === "train") {
    const classIndex = classMap.value.findIndex((item) => item.id === category.id);
    addedCount = addTrainingFiles(classIndex, [file], "camera");
  } else if (split === "test") {
    addedCount = addTestFiles(category.id, [file], { source: "camera" });
  } else {
    ElMessage.error("图片用途无效，请重新选择训练图片或测试图片。");
    return;
  }

  if (!addedCount) {
    ElMessage.error(split === "train" ? "当前类别最多保留 20 张训练图片。" : "当前类别最多保留 50 张测试图片。");
    return;
  }
  cameraDialogVisible.value = false;
  ElMessage.success(`已将 1 张${split === "train" ? "训练图片" : "测试图片"}加入“${category.name}”类别。`);
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

function createRuntimeModelKey(version = modelVersion.value) {
  return `tuiangfenlei-session-${currentExperimentId()}-v${Number(version) + 1}`;
}

function buildRuntimeTrainingResult() {
  if (!realResult.value) return null;
  const { model, ...serializableResult } = realResult.value;
  return serializableResult;
}

async function saveRuntimeModelForRecovery() {
  if (!modelRef.value || trainState.value !== "completed") return;
  try {
    const modelKey = createRuntimeModelKey();
    await saveModelToIndexedDB(toRaw(modelRef.value), modelKey, {
      classCount: trainedClassNames.value.length,
      imageSize: Number(realResult.value?.trainConfig?.imageSize || form.value.imageSize || 64)
    });
    runtimeModelInfo.value = {
      modelKey,
      modelVersion: modelVersion.value,
      classIds: [...trainedClassIds.value],
      savedAt: new Date().toISOString()
    };
    persistLabSessionNow();
  } catch (runtimeSaveError) {
    persistenceError.value = runtimeSaveError.message || "当前模型自动保存失败。";
  }
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
  invalidateRuntimeModelRecovery();
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
    await saveRuntimeModelForRecovery();
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
    if (modelVersion.value >= 1 && versionHistory.value.length) {
      const latest = versionHistory.value[versionHistory.value.length - 1];
      latest.afterAccuracy = batchStats.value.accuracy;
      latest.afterErrorCount = batchStats.value.errorCount;
      latest.conclusion = conclusion.value || latest.conclusion || "";
    }
  } catch (e) {
    batchTestError.value = e.message || "批量测试失败。";
  } finally {
    batchTesting.value = false;
  }
}

const experimentActionLabels = {
  enter_lab: "创建或进入实验任务",
  update_project_info: "填写或修改项目信息",
  update_variable_design: "填写变量设计",
  add_class: "添加或确认类别",
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
  const last = experimentLog.value[experimentLog.value.length - 1];
  if (last?.event === event && last?.detail === detail) return;
  experimentLog.value.push({
    time: new Date().toISOString(),
    event,
    action: experimentActionLabels[event] || event,
    detail,
    modelVersion: modelVersion.value,
    step: getVersionLabel()
  });
}

function scrollToStep(stepKey) {
  activeStepKey.value = stepKey;
  document.getElementById(getLabStepTargetId(stepKey))?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function buildVersion1Snapshot() {
  return createVersion1Snapshot({
    trainConfig: realResult.value?.trainConfig || form.value,
    trainingImageCounts: classItems.value.map((item) => ({ className: item.name, count: item.files.length })),
    testImageCounts: batchTestMap.value.map((item) => ({ className: item.name, count: item.files.length })),
    testCount: batchStats.value.testCount,
    correctCount: batchStats.value.correctCount,
    errorCount: batchStats.value.errorCount,
    accuracy: batchStats.value.accuracy,
    beforeAccuracy: batchStats.value.accuracy,
    beforeErrorCount: batchStats.value.errorCount,
    classMetrics: batchTestResult.value?.classMetrics || [],
    confusionMatrix: batchTestResult.value?.confusionMatrix || null,
    errorSamples: batchTestResult.value?.errorSamples || [],
    batchTestResult: batchTestResult.value,
    singleTestResults: testResults.value,
    diagnosis: diagnosisText.value,
    plan: optimizationPlan.value,
    conclusion: conclusion.value,
    reflection: reflection.value
  });
}

function resetRuntimeForVersion2() {
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
}

function switchToNextVersion() {
  if (modelVersion.value >= 1) return;
  if (!canEnterVersion2.value) {
    saveError.value = enterVersion2Reason.value;
    return;
  }
  saveError.value = "";
  if (versionHistory.value.length === 0) {
    versionHistory.value.push(buildVersion1Snapshot());
  }
  resetRuntimeForVersion2();
  modelVersion.value = 1;
  showVersionCompare.value = true;
  logExperimentEvent("switch_version", "模型 1.0 -> 模型 2.0");
  scrollToStep("train");
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
      variableType: variableType.value,
      variableDescription: variableDescription.value,
      controlledConditions: controlledConditions.value,
      expectedChange: expectedChange.value,
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
      math: '批量测试准确率 ' + (typeof batchStats.value.accuracy === 'number' ? formatPercent(batchStats.value.accuracy) : '未测试') + '，错误样本 ' + batchStats.value.errorCount + ' 个。'
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

function buildPersistableSession() {
  return createPersistableLabSession({
    projectName: projectName.value,
    groupName: groupName.value,
    authorName: authorName.value,
    objective: objective.value,
    hypothesis: hypothesis.value,
    variableType: variableType.value,
    variableDescription: variableDescription.value,
    controlledConditions: controlledConditions.value,
    expectedChange: expectedChange.value,
    datasetNote: datasetNote.value,
    optimizationPlan: optimizationPlan.value,
    conclusion: conclusion.value,
    reflection: reflection.value,
    modelVersion: modelVersion.value,
    activeStepKey: activeStepKey.value,
    versionHistory: versionHistory.value,
    experimentLog: experimentLog.value,
    form: form.value,
    batchTestResult: batchTestResult.value,
    testResults: testResults.value,
    classDefinitions: classMap.value.map((item) => ({ id: item.id, name: item.name })),
    runtimeModelInfo: runtimeModelInfo.value,
    runtimeTrainingResult: buildRuntimeTrainingResult()
  });
}

function currentExperimentId() {
  return String(labData.value?.experimentId || route.params.experimentId || meta.value.id);
}

function persistLabSessionNow() {
  if (!sessionReady.value) return;
  try {
    saveLabSession(currentExperimentId(), buildPersistableSession());
  } catch (persistError) {
    persistenceError.value = persistError.message || "实验文字状态保存失败。";
  }
}

function scheduleLabSessionSave() {
  if (!sessionReady.value) return;
  window.clearTimeout(sessionSaveTimer);
  sessionSaveTimer = window.setTimeout(persistLabSessionNow, 250);
}

async function persistDatasetFilesNow() {
  if (!sessionReady.value) return;
  try {
    await saveLabDatasetFiles(currentExperimentId(), classMap.value, batchTestMap.value);
  } catch (persistError) {
    persistenceError.value = persistError.message || "实验图片保存失败。";
  }
}

function scheduleDatasetSave() {
  if (!sessionReady.value) return;
  window.clearTimeout(datasetSaveTimer);
  datasetSaveTimer = window.setTimeout(persistDatasetFilesNow, 350);
}

async function restoreLabSession(experimentId, session) {
  if (!session) return false;

  projectName.value = session.projectName || "";
  groupName.value = session.groupName || "";
  authorName.value = session.authorName || "";
  objective.value = session.objective ?? objective.value;
  hypothesis.value = session.hypothesis || "";
  variableType.value = session.variableType ?? variableType.value;
  variableDescription.value = session.variableDescription ?? variableDescription.value;
  controlledConditions.value = session.controlledConditions ?? controlledConditions.value;
  expectedChange.value = session.expectedChange ?? expectedChange.value;
  datasetNote.value = session.datasetNote || "";
  optimizationPlan.value = session.optimizationPlan || "";
  conclusion.value = session.conclusion || "";
  reflection.value = session.reflection || "";
  modelVersion.value = Number(session.modelVersion) >= 1 ? 1 : 0;
  activeStepKey.value = session.activeStepKey || (modelVersion.value >= 1 ? "train" : "project");
  versionHistory.value = Array.isArray(session.versionHistory) ? session.versionHistory : [];
  experimentLog.value = Array.isArray(session.experimentLog) && session.experimentLog.length
    ? session.experimentLog
    : experimentLog.value;
  form.value = { ...form.value, ...(session.form || {}) };
  batchTestResult.value = session.batchTestResult || null;
  testResults.value = Array.isArray(session.testResults) ? session.testResults : [];
  runtimeModelInfo.value = session.runtimeModelInfo || null;

  if (Array.isArray(session.classDefinitions) && session.classDefinitions.length) {
    classMap.value = session.classDefinitions.map((item) => ({
      id: item.id || Math.random().toString(36).slice(2, 10),
      name: item.name || "未命名类别",
      files: []
    }));
  }

  try {
    const dataset = await loadLabDatasetFiles(experimentId);
    if (dataset?.trainingGroups?.length) {
      revokeEntries(classMap.value.flatMap((item) => item.files));
      classMap.value = dataset.trainingGroups.map((group) => ({
        id: group.id,
        name: group.name,
        files: (group.files || []).map(createFileEntry)
      }));
    }
    if (dataset?.testGroups?.length) {
      revokeEntries(batchTestMap.value.flatMap((item) => item.files));
      batchTestMap.value = dataset.testGroups.map((group) => ({
        classId: group.classId,
        name: group.name,
        files: (group.files || []).map(createFileEntry)
      }));
    }
  } catch (restoreError) {
    persistenceError.value = restoreError.message || "实验图片恢复失败，请重新选择图片。";
  }

  if (runtimeModelInfo.value?.modelKey && Number(runtimeModelInfo.value.modelVersion) === modelVersion.value) {
    try {
      const restoredModel = await loadModelFromIndexedDB(runtimeModelInfo.value.modelKey);
      modelRef.value = markRaw(restoredModel);
      realResult.value = { ...(session.runtimeTrainingResult || {}), model: modelRef.value };
      trainedClassIds.value = runtimeModelInfo.value.classIds?.length
        ? runtimeModelInfo.value.classIds.filter((id) => classMap.value.some((item) => item.id === id))
        : classMap.value.map((item) => item.id);
      syncBatchEntries(trainedClassIds.value);
      trainState.value = "completed";
      trainProgress.value = 100;
      trainLogs.value = ["已从当前浏览器 IndexedDB 恢复模型。"];
    } catch (modelRestoreError) {
      persistenceError.value = modelRestoreError.message || "本地模型恢复失败，请重新训练。";
      runtimeModelInfo.value = null;
    }
  }

  restoredSession.value = true;
  showVersionCompare.value = versionHistory.value.length > 0;
  return true;
}

function continueRecoveredExperiment() {
  restoredSession.value = false;
  nextTick(() => scrollToStep(activeStepKey.value));
}

async function restartExperiment() {
  const experimentId = currentExperimentId();
  sessionReady.value = false;
  restoredSession.value = false;
  window.clearTimeout(sessionSaveTimer);
  window.clearTimeout(datasetSaveTimer);
  clearLabSession(experimentId);
  try {
    await clearLabDatasetFiles(experimentId);
    await Promise.allSettled([
      removeModelFromIndexedDB(createRuntimeModelKey(0)),
      removeModelFromIndexedDB(createRuntimeModelKey(1))
    ]);
  } catch (clearError) {
    persistenceError.value = clearError.message || "本地图片清理失败。";
  }
  await loadExperiment(experimentId, { restoreSession: false });
}

async function loadExperiment(experimentId, options = {}) {
  const { restoreSession: shouldRestoreSession = true } = options;
  loading.value = true;
  error.value = "";
  sessionReady.value = false;
  restoredSession.value = false;
  window.clearTimeout(sessionSaveTimer);
  window.clearTimeout(datasetSaveTimer);
  clearExperimentRuntime();

  try {
    const savedSession = shouldRestoreSession ? loadLabSession(experimentId) : null;
    let data;
    try {
      data = await getLabDemo(experimentId);
    } catch {
      try {
        data = await getLabDemo("sample-count");
      } catch (fallbackError) {
        if (!savedSession) throw fallbackError;
        data = {
          experimentId,
          title: meta.value.title,
          objective: meta.value.resultHint || meta.value.title,
          trainConfig: { imageSize: 64 }
        };
      }
    }

    labData.value = {
      ...data,
      experimentId: meta.value.id,
      title: meta.value.title,
      objective: meta.value.resultHint || meta.value.title
    };
    modelVersion.value = 0;
    runtimeModelInfo.value = null;
    activeStepKey.value = "project";
    versionHistory.value = [];
    showVersionCompare.value = false;
    projectName.value = "";
    groupName.value = "";
    authorName.value = "";
    objective.value = labData.value.objective;
    hypothesis.value = "";
    variableType.value = meta.value.primaryParameter || "样本数量";
    variableDescription.value = meta.value.controlVariable || "";
    controlledConditions.value = Array.isArray(meta.value.fixedConditions) ? meta.value.fixedConditions.join("、") : meta.value.constants || "";
    expectedChange.value = meta.value.resultFocus || "";
    datasetNote.value = "";
    optimizationPlan.value = "";
    conclusion.value = "";
    reflection.value = "";

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
    if (savedSession) {
      await restoreLabSession(experimentId, savedSession);
    }
    sessionReady.value = true;
    persistLabSessionNow();
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

watch(
  buildPersistableSession,
  () => scheduleLabSessionSave(),
  { deep: true }
);

watch(
  () => JSON.stringify({
    training: classMap.value.map((group) => ({
      id: group.id,
      name: group.name,
      files: group.files.map((entry) => [entry.file?.name, entry.file?.size, entry.file?.lastModified])
    })),
    testing: batchTestMap.value.map((group) => ({
      classId: group.classId,
      name: group.name,
      files: group.files.map((entry) => [entry.file?.name, entry.file?.size, entry.file?.lastModified])
    }))
  }),
  () => scheduleDatasetSave()
);

onMounted(() => {
  loadExperiment(String(route.params.experimentId || "sample-count"));
});

onBeforeUnmount(() => {
  window.clearTimeout(sessionSaveTimer);
  window.clearTimeout(datasetSaveTimer);
  persistLabSessionNow();
  void persistDatasetFilesNow();
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
      <el-alert v-if="persistenceError" :title="persistenceError" type="warning" :closable="false" show-icon />
      <section v-if="restoredSession" class="recovery-banner lab-module" role="status" aria-live="polite">
        <div>
          <strong>已恢复上次实验</strong>
          <p>{{ recoveryDetailText }}</p>
        </div>
        <div class="recovery-actions">
          <el-button type="primary" @click="continueRecoveredExperiment">继续实验</el-button>
          <el-popconfirm title="将清除本实验保存在当前浏览器中的状态和图片，确定重新开始吗？" confirm-button-text="重新开始" cancel-button-text="取消" @confirm="restartExperiment">
            <template #reference><el-button plain>重新开始</el-button></template>
          </el-popconfirm>
        </div>
      </section>
      <header class="page-heading lab-heading">
        <div class="page-heading__copy">
          <span class="status-label">课程实验工作台</span>
          <h1 class="page-title">{{ projectName || meta.title }}</h1>
          <p class="page-subtitle">
            当前模型版本：{{ getVersionLabel() }}。当前阶段：{{ currentStage }}。STEM 目标：用数据证据解释并优化图像分类模型。
          </p>
        </div>
        <div class="lab-progress-card">
          <span>实验完成度</span>
          <strong>{{ completionPercent }}%</strong>
          <div class="lab-progress-track"><div :style="{ width: `${completionPercent}%` }"></div></div>
        </div>
      </header>

      <nav class="stem-step-nav" aria-label="六步 STEM 实验流程">
        <button v-for="(step, index) in stemSteps" :key="step.key" type="button" class="stem-step-chip" :class="{ active: step.active, done: step.done }" :aria-current="step.active ? 'step' : undefined" :aria-controls="getLabStepTargetId(step.key)" @click="scrollToStep(step.key)">
          <span>{{ index + 1 }}</span>
          <strong>{{ step.title }}</strong>
          <small>{{ step.tag }}</small>
        </button>
      </nav>

      <main class="stem-workbench">
        <section class="stem-flow">
          <article id="lab-step-project" class="stem-step-card lab-module">
            <div class="stem-step-head">
              <span class="stem-step-index">步骤 1</span>
              <div><h2>项目设定</h2><p>本步骤对应 S 科学探究：先提出问题和假设，再开始实验。</p></div>
            </div>
            <div class="project-info-grid">
              <div class="pi-field"><label class="pi-label">项目名称</label><input v-model="projectName" class="pi-input" placeholder="例如：水果分类模型优化实验" @blur="logExperimentEvent('update_project_info', '填写项目设定')" /></div>
              <div class="pi-field"><label class="pi-label">小组名称</label><input v-model="groupName" class="pi-input" placeholder="例如：第三小组" @blur="logExperimentEvent('update_project_info', '填写小组名称')" /></div>
              <div class="pi-field"><label class="pi-label">作者昵称</label><input v-model="authorName" class="pi-input" placeholder="填写昵称或成员简称" @blur="logExperimentEvent('update_project_info', '填写作者昵称')" /></div>
            </div>
            <div class="pi-textareas two-col">
              <div class="pi-field"><label class="pi-label">实验目标</label><textarea v-model="objective" class="pi-textarea" rows="3" placeholder="说明本次实验想研究什么问题" @blur="logExperimentEvent('update_project_info', '填写实验目标')"></textarea></div>
              <div class="pi-field"><label class="pi-label">实验假设</label><textarea v-model="hypothesis" class="pi-textarea" rows="3" placeholder="例如：每类训练样本数量增加后，模型准确率会提高" @blur="logExperimentEvent('update_project_info', '填写实验假设')"></textarea></div>
            </div>
          </article>

          <article id="lab-step-variable" class="stem-step-card lab-module">
            <div class="stem-step-head">
              <span class="stem-step-index">步骤 2</span>
              <div><h2>变量设计</h2><p>本步骤对应 S 科学探究和 M 数学分析：明确变量，后续才能公平比较结果。</p></div>
            </div>
            <div class="variable-options">
              <button v-for="item in variableOptions" :key="item" type="button" :class="{ active: variableType === item }" @click="variableType = item; logExperimentEvent('update_variable_design', `选择变量：${item}`)">{{ item }}</button>
            </div>
            <div class="pi-textareas two-col">
              <div class="pi-field"><label class="pi-label">变量说明</label><textarea v-model="variableDescription" class="pi-textarea" rows="3" placeholder="本次实验改变什么变量" @blur="logExperimentEvent('update_variable_design', '填写变量说明')"></textarea></div>
              <div class="pi-field"><label class="pi-label">控制条件</label><textarea v-model="controlledConditions" class="pi-textarea" rows="3" placeholder="保持训练轮次、图片尺寸和类别数量不变" @blur="logExperimentEvent('update_variable_design', '填写控制条件')"></textarea></div>
              <div class="pi-field"><label class="pi-label">预期变化</label><textarea v-model="expectedChange" class="pi-textarea" rows="3" placeholder="预测准确率、错误数量或混淆情况会怎样变化" @blur="logExperimentEvent('update_variable_design', '填写预期变化')"></textarea></div>
            </div>
          </article>

          <article id="lab-step-dataset" class="stem-step-card lab-module" data-testid="class-panel">
            <div class="stem-step-head">
              <span class="stem-step-index">步骤 3</span>
              <div><h2>数据准备</h2><p>本步骤对应 T 技术实现和 M 数学分析：数据是模型学习的基础，数量和质量都会影响结果。</p></div>
              <button type="button" class="add-link" :disabled="classMap.length >= 3" @click="addClass">+ 添加类别</button>
            </div>
            <el-alert title="训练图片用于教 AI；测试图片不参与训练，只用于检查模型效果。测试图片请在步骤 5 的批量测试区按类别上传。" type="info" :closable="false" show-icon />
            <el-alert v-if="datasetOverlaps.length" :title="datasetOverlapText" type="warning" :closable="false" show-icon />
            <div class="dataset-dashboard">
              <div v-for="row in datasetRows" :key="row.id" class="dataset-row">
                <strong>{{ row.name }}</strong>
                <span>训练 {{ row.trainCount }} 张</span>
                <span>测试 {{ row.testCount }} 张</span>
                <el-tag size="small" :type="row.ready ? 'success' : 'warning'">{{ row.ready ? "达到最低训练数量" : "训练图不足" }}</el-tag>
              </div>
            </div>
            <div class="class-grid">
              <article v-for="item in classItems" :key="item.id" class="class-card lab-module" data-testid="class-card">
                <div class="class-card__head">
                  <div class="class-title">
                    <template v-if="editingClassId === item.id">
                      <input :data-class-id="item.id" v-model="classMap[item.index].name" class="class-name-edit" data-testid="class-name-edit" @blur="saveClassName(item.index)" @keydown.enter.prevent="saveClassName(item.index)" />
                    </template>
                    <template v-else>
                      <strong>{{ item.name }}</strong>
                      <button type="button" class="icon-action" @click="startEditClassName(item.id)">编辑</button>
                    </template>
                  </div>
                  <button v-if="item.canDelete" type="button" class="icon-action danger" @click="removeClass(item.index)">删除</button>
                </div>
                <div class="class-meta"><span>{{ item.files.length }} 张训练图片</span><span v-if="item.files.length < 2" class="warning-text">至少需要 2 张</span></div>
                <div class="sample-actions camera-entry-actions">
                  <label class="sample-button">上传训练图片<input class="hidden-input" data-testid="class-image-upload" type="file" accept=".png,.jpg,.jpeg,.webp" multiple @change="handleClassFiles(item.index, $event)" /></label>
                  <button type="button" class="sample-button camera-sample-button" data-testid="camera-button" @click="openCameraCapture(item.id)">摄像头采集图片</button>
                </div>
                <div v-if="item.files.length" class="thumb-strip">
                  <div v-for="fileEntry in item.files" :key="fileEntry.id" class="thumb-item" data-testid="class-image-thumb">
                    <img :src="fileEntry.url" :alt="fileEntry.file.name" class="thumb-image" />
                    <button type="button" class="thumb-remove" :aria-label="`删除训练图片 ${fileEntry.file.name}`" @click="removeClassImage(item.index, fileEntry.id)">×</button>
                  </div>
                </div>
                <p v-else class="empty-line">上传后在这里预览缩略图。</p>
              </article>
            </div>
            <div class="pi-field"><label class="pi-label">数据集说明</label><textarea v-model="datasetNote" class="pi-textarea" rows="3" placeholder="说明训练集、测试集、图片类别和样本来源，并确认不上传敏感信息" @blur="logExperimentEvent('update_project_info', '填写数据集说明')"></textarea></div>
            <div class="checklist-grid">
              <div v-for="item in datasetChecklist" :key="item.label" class="check-item" :class="{ done: item.done }"><span>{{ item.done ? "✓" : "·" }}</span>{{ item.label }}</div>
            </div>
          </article>

          <article id="lab-step-train" class="stem-step-card lab-module" data-testid="train-panel">
            <div class="stem-step-head">
              <span class="stem-step-index">步骤 4</span>
              <div><h2>训练{{ getVersionLabel() }}</h2><p>本步骤对应 T 技术实现：使用图像分类技术训练第一个模型原型。</p></div>
              <span class="status-pill" :class="`is-${trainState}`">{{ trainingStatusLabel }}</span>
            </div>
            <div class="param-list four-col">
              <div class="param-row lab-module" :class="{ active: meta.id === 'epoch-count' }"><span>epochs</span><div class="stepper"><button type="button" @click="updateEpoch(-1)">-</button><span>{{ form.epochs }}</span><button type="button" @click="updateEpoch(1)">+</button></div></div>
              <div class="param-row lab-module"><span>batchSize</span><div class="stepper"><button type="button" @click="updateBatchSize(-1)">-</button><span>{{ form.batchSize }}</span><button type="button" @click="updateBatchSize(1)">+</button></div></div>
              <label class="param-row lab-module"><span>learningRate</span><input v-model.number="form.learningRate" class="param-input" type="number" min="0.0001" step="0.0001" @change="logTrainConfigChange()" /></label>
              <div class="param-row lab-module"><span>imageSize</span><span class="readonly-chip">{{ form.imageSize }}</span></div>
            </div>
            <div class="train-actions">
              <el-button type="primary" data-testid="start-real-training" :disabled="!canTrainReal || trainState === 'running'" @click="startRealTraining">{{ trainState === "running" ? "训练中..." : trainState === "completed" ? "重新训练当前模型" : `开始训练${getVersionLabel()}` }}</el-button>
              <el-button plain @click="resetTrainConfig">恢复默认参数</el-button>
            </div>
            <div class="train-progress"><div class="train-progress__bar"><div class="train-progress__fill" :style="{ width: `${trainProgress}%` }"></div></div><div class="train-progress__text">{{ trainLogText }}</div></div>
            <div class="train-hint">{{ canTrainReal ? "样本已满足训练条件，训练参数会作为实验条件保存。" : datasetError() }}</div>
            <el-alert v-if="trainError" :title="trainError" type="error" :closable="false" show-icon />
          </article>

          <article id="lab-step-test" class="stem-step-card lab-module" data-testid="preview-panel">
            <div class="stem-step-head">
              <span class="stem-step-index">步骤 5</span>
              <div><h2>测试分析</h2><p>本步骤对应 M 数学分析：用准确率、错误率和混淆矩阵判断模型表现。</p></div>
            </div>
            <el-alert v-if="datasetOverlaps.length" :title="datasetOverlapText" type="warning" :closable="false" show-icon />
            <div class="test-layout">
              <div class="single-test-block">
                <el-tag type="info" effect="plain">辅助观察 · 单图体验</el-tag>
                <label class="predict-upload"><input class="hidden-input" data-testid="single-predict-upload" type="file" accept=".png,.jpg,.jpeg,.webp" @change="handleTestFile" /><strong>上传单张测试图片</strong><span>用于观察一张图的预测类别和置信度。</span></label>
                <div class="predict-preview"><img v-if="testPreviewUrl" :src="testPreviewUrl" alt="测试图片预览" class="preview-image" /><div v-else class="preview-empty">等待上传测试图片</div></div>
                <div class="predict-actions"><el-button type="primary" :loading="testPredicting" @click="doPredict">开始预测</el-button><el-button plain @click="resetPrediction">清空</el-button></div>
                <el-alert v-if="testError" :title="testError" type="error" :closable="false" show-icon />
                <div class="prediction-output lab-module" data-testid="prediction-output">
                  <div class="prediction-head"><strong>预测输出</strong><span v-if="testPrediction">{{ formatPercent(testPrediction.confidence) }}</span></div>
                  <div v-if="!testPrediction" class="output-empty">完成训练后再上传测试图片查看预测结果。</div>
                  <template v-else>
                    <div class="prediction-main">{{ testPrediction.predictedLabel }}</div>
                    <label class="truth-select"><span>真实类别</span><select v-model="selectedTrueLabel" @change="updateCorrectState"><option value="">请选择真实类别</option><option v-for="name in trainedClassNames" :key="name" :value="name">{{ name }}</option></select></label>
                    <div class="result-actions"><span v-if="testIsCorrect === true" class="judge-tag success">预测正确</span><span v-else-if="testIsCorrect === false" class="judge-tag danger">预测错误</span><el-button plain @click="addTestResult">加入测试结果</el-button></div>
                  </template>
                  <div v-for="item in predictionRows" :key="item.label" class="probability-row"><div class="probability-label">{{ item.label }}</div><div class="probability-track"><div class="probability-fill" :class="`tone-${item.tone % 4}`" :style="{ width: `${item.width}%` }"></div></div><div class="probability-value">{{ Math.round((item.confidence || 0) * 100) }}%</div></div>
                </div>
              </div>
              <div class="batch-test-block">
                <div class="metric-grid">
                  <div><span>测试总数</span><strong>{{ safeText(batchStats.testCount) }}</strong></div>
                  <div><span>正确数量</span><strong>{{ safeText(batchStats.correctCount) }}</strong></div>
                  <div><span>错误数量</span><strong>{{ safeText(batchStats.errorCount) }}</strong></div>
                  <div><span>总体准确率</span><strong>{{ batchStats.accuracy === null ? "-" : formatPercent(batchStats.accuracy) }}</strong></div>
                </div>
                <div class="batch-summary lab-module">
                  <div class="batch-summary__head"><strong>批量测试是本步骤主任务</strong><span>{{ batchSummaryText }}</span></div>
                  <div class="batch-summary__body">
                    <div v-for="(item, index) in batchTestMap" :key="item.classId" class="batch-item lab-module">
                      <div class="batch-item__head"><strong>{{ item.name }}</strong><span>{{ item.files.length }} 张测试图</span></div>
                      <div class="batch-item__actions">
                        <label class="sample-button mini">上传测试图<input class="hidden-input" type="file" accept=".png,.jpg,.jpeg,.webp" multiple @change="handleBatchFiles(index, $event)" /></label>
                        <button type="button" class="add-link" @click="resetBatchFiles(index)">清空</button>
                      </div>
                      <div v-if="item.files.length" class="thumb-strip test-thumb-strip">
                        <div v-for="fileEntry in item.files" :key="fileEntry.id" class="thumb-item" data-testid="test-image-thumb">
                          <img :src="fileEntry.url" :alt="fileEntry.file.name" class="thumb-image" />
                          <button type="button" class="thumb-remove" :aria-label="`删除测试图片 ${fileEntry.file.name}`" @click="removeBatchImage(index, fileEntry.id)">×</button>
                        </div>
                      </div>
                    </div>
                    <el-button type="primary" :loading="batchTesting" @click="doBatchTest">执行{{ getVersionLabel() }}批量测试</el-button>
                    <el-alert v-if="batchTestError" :title="batchTestError" type="error" :closable="false" show-icon />
                    <ConfusionMatrix v-if="batchTestResult?.confusionMatrix" :confusion-matrix="batchTestResult.confusionMatrix" />
                  </div>
                </div>
                <div class="analysis-prompts lab-module">
                  <strong>模型问题诊断</strong>
                  <p>{{ diagnosisText }}</p>
                  <ol>
                    <li>哪一类最容易被识别错？</li>
                    <li>错误是否集中在某两个类别之间？</li>
                    <li>错误图片是否存在模糊、角度单一、背景复杂等问题？</li>
                    <li>当前模型是否足够可靠？</li>
                    <li>下一步应该优化数据还是训练参数？</li>
                  </ol>
                </div>
              </div>
            </div>
          </article>

          <article id="lab-step-iterate" class="stem-step-card lab-module">
            <div class="stem-step-head">
              <span class="stem-step-index">步骤 6</span>
              <div><h2>优化迭代与保存</h2><p>本步骤对应 E 工程优化：根据测试证据改进模型，并用数据比较优化是否有效。</p></div>
              <span class="version-badge" :class="modelVersion === 0 ? 'v1' : 'v2'">{{ getVersionLabel() }}</span>
            </div>
            <p class="iteration-note">模型 1.0 不是终点。请根据测试结果提出优化方案，再进入模型 2.0。</p>
            <div class="pi-textareas three-col">
              <div class="pi-field"><label class="pi-label">优化方案</label><textarea v-model="optimizationPlan" class="pi-textarea opt-textarea" rows="3" placeholder="说明模型 1.0 暴露的问题，以及准备如何优化" @blur="logExperimentEvent('write_optimization_plan', '填写优化方案')"></textarea></div>
              <div class="pi-field"><label class="pi-label">实验结论</label><textarea v-model="conclusion" class="pi-textarea opt-textarea" rows="3" placeholder="根据测试结果说明实验结论" @blur="logExperimentEvent('write_conclusion', '填写实验结论')"></textarea></div>
              <div class="pi-field"><label class="pi-label">实验反思</label><textarea v-model="reflection" class="pi-textarea opt-textarea" rows="3" placeholder="说明如果继续优化，还会怎么改进" @blur="logExperimentEvent('write_reflection', '填写实验反思')"></textarea></div>
            </div>
            <div class="version-compare lab-module">
              <strong>模型 1.0 / 2.0 对比</strong>
              <template v-if="version1Snapshot">
                <p class="compare-plan">优化措施：{{ version1Snapshot.plan || "未记录" }}</p>
                <div class="comparison-table" role="table" aria-label="模型版本指标对比">
                  <div class="comparison-row comparison-head" role="row"><span role="columnheader">对比项</span><span role="columnheader">模型 1.0</span><span role="columnheader">模型 2.0</span><span role="columnheader">变化</span></div>
                  <div v-for="row in versionComparisonRows" :key="row.label" class="comparison-row" role="row">
                    <strong role="cell">{{ row.label }}</strong><span role="cell">{{ row.before }}</span><span role="cell">{{ row.after }}</span><el-tag role="cell" size="small" :type="row.status === '改善' ? 'success' : row.status === '下降' ? 'danger' : row.status === '待测试' ? 'info' : 'warning'">{{ row.status }}</el-tag>
                  </div>
                </div>
                <div v-if="classAccuracyComparison.length" class="class-comparison">
                  <strong>每类准确率</strong>
                  <div v-for="item in classAccuracyComparison" :key="item.className" class="class-comparison-row"><span>{{ item.className }}</span><span>1.0：{{ item.before }}</span><span>2.0：{{ item.after }}</span><el-tag size="small" :type="item.status === '改善' ? 'success' : item.status === '下降' ? 'danger' : 'info'">{{ item.status }}</el-tag></div>
                </div>
                <div class="matrix-comparison">
                  <div><strong>模型 1.0 混淆矩阵</strong><ConfusionMatrix v-if="version1Snapshot.confusionMatrix" :confusion-matrix="version1Snapshot.confusionMatrix" /><p v-else>暂无数据</p></div>
                  <div><strong>模型 2.0 混淆矩阵</strong><ConfusionMatrix v-if="batchTestResult?.confusionMatrix" :confusion-matrix="batchTestResult.confusionMatrix" /><p v-else>待完成模型 2.0 批量测试</p></div>
                </div>
              </template>
              <p v-else>暂无优化对比。完成模型 1.0 批量测试并填写优化方案后，可进入模型 2.0。</p>
            </div>
            <div v-if="trainState === 'completed'" class="model-save-status">
              <div class="model-save-status__copy"><strong>本机模型</strong><p>{{ modelStatusText }}</p></div>
              <el-tag :type="savedModelInfo ? 'success' : 'info'">{{ modelStatusLabel }}</el-tag>
              <el-button plain data-testid="save-model" :disabled="!canSaveModel || Boolean(savedModelInfo)" :loading="modelSaving" @click="saveCurrentModel">{{ savedModelInfo ? "模型已保存" : "保存模型" }}</el-button>
              <el-button plain data-testid="export-model" :disabled="!canExportModel" :loading="modelExporting" @click="exportCurrentModel">导出模型</el-button>
            </div>
            <div class="record-actions">
              <el-tooltip v-if="modelVersion === 0" :content="enterVersion2Reason" :disabled="canEnterVersion2" placement="top">
                <span class="version-switch-wrap"><el-button type="warning" plain :disabled="!canEnterVersion2" @click="switchToNextVersion">进入模型 2.0</el-button></span>
              </el-tooltip>
              <span v-if="modelVersion === 0 && !canEnterVersion2" class="version-switch-hint">{{ enterVersion2Reason }}</span>
              <el-button type="primary" data-testid="save-record" :loading="saving" @click="saveRecord">保存实验记录</el-button>
              <el-button plain @click="router.push('/records')">查看实验记录</el-button>
              <el-button v-if="savedRecordId" plain @click="router.push(`/report/${savedRecordId}`)">查看报告</el-button>
            </div>
            <el-alert v-if="modelSaveError" :title="modelSaveError" type="error" :closable="false" show-icon />
            <el-alert v-if="modelExportError" :title="modelExportError" type="error" :closable="false" show-icon />
            <el-alert v-if="saveError" :title="saveError" type="error" :closable="false" show-icon />
          </article>
        </section>

        <aside class="stem-side-panel">
          <section class="evidence-panel lab-module">
            <h2>STEM 证据面板</h2>
            <div v-for="group in stemEvidenceGroups" :key="group.title" class="evidence-group">
              <div class="evidence-group__head"><strong>{{ group.title }}</strong><el-tag size="small" :type="group.status === '已完成' ? 'success' : group.status === '进行中' ? 'warning' : 'info'">{{ group.status }}</el-tag></div>
              <ul><li v-for="item in group.items" :key="item.label" :class="{ done: item.done }">{{ item.done ? "✓" : "·" }} {{ item.label }}</li></ul>
            </div>
          </section>
          <section class="experiment-log-panel lab-module">
            <h2>实验过程记录</h2>
            <p>只记录明确动作，不保存原始图片或 base64。</p>
            <div class="log-timeline">
              <div v-for="(entry, i) in latestLogs" :key="`${entry.time}-${i}`" class="log-entry">
                <span class="log-time">{{ new Date(entry.time).toLocaleTimeString("zh-CN") }}</span>
                <span class="log-event">{{ entry.action || entry.event }}</span>
                <span v-if="entry.detail" class="log-detail">{{ entry.detail }}</span>
              </div>
            </div>
          </section>
        </aside>
      </main>
      <CameraCaptureDialog
        v-model="cameraDialogVisible"
        :category-name="cameraTargetCategory?.name || ''"
        :split="cameraTarget.split"
        @captured="handleCameraCaptured"
      />
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

.lab-progress-card {
  min-width: 210px;
  padding: 14px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  background: var(--surface);
  box-shadow: var(--shadow-soft);
  display: grid;
  gap: 6px;
}

.recovery-banner {
  margin-bottom: 14px;
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border-color: rgba(15, 118, 110, 0.3);
  background: #eef7f4;
}

.recovery-banner strong { color: var(--heading); }
.recovery-banner p { margin: 5px 0 0; color: var(--muted); line-height: 1.6; }
.recovery-actions { display: flex; gap: 8px; flex: 0 0 auto; }

.lab-progress-card span {
  color: var(--muted);
  font-size: 12px;
  font-weight: 800;
}

.lab-progress-card strong {
  color: var(--heading);
  font-size: 24px;
}

.lab-progress-track {
  height: 8px;
  border-radius: 999px;
  background: var(--surface-alt);
  overflow: hidden;
}

.lab-progress-track div {
  height: 100%;
  border-radius: inherit;
  background: var(--primary);
}

.stem-step-nav {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 14px;
}

.stem-step-chip {
  min-height: 86px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  background: var(--surface);
  display: grid;
  align-content: start;
  gap: 4px;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.stem-step-chip span {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--surface-alt);
  color: var(--muted);
  display: inline-grid;
  place-items: center;
  font-weight: 900;
}

.stem-step-chip strong {
  color: var(--heading);
  font-size: 14px;
}

.stem-step-chip small {
  color: var(--muted);
  font-size: 12px;
  font-weight: 800;
}

.stem-step-chip.active {
  border-color: var(--border-active);
  background: var(--surface-active);
}

.stem-step-chip:focus-visible,
.variable-options button:focus-visible,
.icon-action:focus-visible,
.add-link:focus-visible {
  outline: 3px solid rgba(37, 99, 235, 0.28);
  outline-offset: 2px;
}

.stem-step-card {
  scroll-margin-top: 90px;
}

.version-switch-wrap {
  display: inline-flex;
}

.version-switch-hint {
  color: var(--warning);
  font-size: 13px;
  font-weight: 700;
}

.stem-step-chip.done span {
  background: var(--primary);
  color: #fff;
}

.stem-workbench {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 14px;
  align-items: start;
}

.stem-flow,
.stem-side-panel,
.class-grid,
.checklist-grid,
.batch-summary__body,
.log-timeline {
  display: grid;
  gap: 12px;
}

.stem-side-panel {
  position: sticky;
  top: 84px;
}

.stem-step-card {
  padding: 18px;
  display: grid;
  gap: 16px;
}

.stem-step-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
}

.stem-step-head h2,
.evidence-panel h2,
.experiment-log-panel h2 {
  margin: 0;
  color: var(--heading);
  font-size: 18px;
}

.stem-step-head p,
.iteration-note,
.experiment-log-panel p,
.analysis-prompts p {
  margin: 0;
  color: var(--muted);
  line-height: 1.7;
}

.stem-step-index {
  flex: 0 0 auto;
  padding: 7px 10px;
  border-radius: var(--radius-control);
  background: var(--primary-soft);
  color: var(--primary);
  font-size: 12px;
  font-weight: 900;
}

.two-col {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.three-col {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.four-col {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.variable-options {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.variable-options button {
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-control);
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
  font-weight: 800;
}

.variable-options button.active {
  border-color: var(--border-active);
  background: var(--primary-soft);
  color: var(--primary);
}

.dataset-dashboard,
.metric-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 8px;
}

.dataset-row,
.metric-grid div,
.check-item,
.evidence-group {
  padding: 11px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  background: var(--surface-alt);
}

.dataset-row {
  display: grid;
  gap: 5px;
}

.dataset-row strong,
.metric-grid strong {
  color: var(--heading);
}

.dataset-row span,
.metric-grid span {
  color: var(--muted);
  font-size: 12px;
  font-weight: 800;
}

.class-grid {
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}

.checklist-grid {
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
}

.check-item {
  color: var(--muted);
  font-weight: 800;
}

.check-item.done {
  color: var(--success);
  background: #eef7f4;
  border-color: rgba(15, 118, 110, 0.22);
}

.test-layout {
  display: grid;
  grid-template-columns: minmax(260px, 0.75fr) minmax(0, 1.25fr);
  gap: 14px;
  align-items: start;
}

.single-test-block,
.batch-test-block {
  display: grid;
  gap: 12px;
}

.analysis-prompts {
  padding: 14px;
}

.analysis-prompts ol {
  margin: 8px 0 0;
  padding-left: 20px;
  color: var(--text);
  line-height: 1.8;
}

.version-compare {
  display: grid;
  gap: 12px;
  padding: 14px;
}

.compare-plan { margin: 0; color: var(--muted); line-height: 1.6; }

.comparison-table {
  display: grid;
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  overflow: hidden;
}

.comparison-row {
  min-width: 600px;
  padding: 10px 12px;
  display: grid;
  grid-template-columns: 1.25fr 1fr 1fr 90px;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}

.comparison-row:last-child { border-bottom: 0; }
.comparison-head { background: var(--surface-alt); color: var(--muted); font-size: 12px; font-weight: 900; }
.comparison-table { overflow-x: auto; }

.class-comparison { display: grid; gap: 8px; }
.class-comparison-row {
  padding: 9px 10px;
  display: grid;
  grid-template-columns: 1.2fr 1fr 1fr 80px;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius-control);
  background: var(--surface-alt);
  font-size: 13px;
}

.matrix-comparison {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.matrix-comparison > div {
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  overflow-x: auto;
}

.evidence-panel,
.experiment-log-panel {
  padding: 16px;
  display: grid;
  gap: 14px;
}

.evidence-group {
  display: grid;
  gap: 10px;
}

.evidence-group__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.evidence-group ul {
  margin: 0;
  padding: 0;
  display: grid;
  gap: 6px;
  list-style: none;
  color: var(--muted);
  font-size: 13px;
}

.evidence-group li.done {
  color: var(--success);
  font-weight: 800;
}

.experiment-log-panel .log-timeline {
  max-height: 420px;
  overflow: auto;
}

.log-entry {
  display: grid;
  gap: 3px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
}

.log-entry:last-child {
  border-bottom: 0;
}

.log-time {
  color: var(--muted);
  font-size: 12px;
  font-weight: 800;
}

.log-event {
  color: var(--heading);
  font-weight: 800;
}

.log-detail {
  color: var(--muted);
  font-size: 12px;
  line-height: 1.5;
}

@media (max-width: 1180px) {
  .stem-step-nav {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .stem-workbench,
  .test-layout {
    grid-template-columns: 1fr;
  }

  .stem-side-panel {
    position: static;
  }

  .matrix-comparison {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .two-col,
  .three-col,
  .four-col {
    grid-template-columns: 1fr;
  }

  .stem-step-nav {
    grid-template-columns: none;
    grid-auto-flow: column;
    grid-auto-columns: minmax(154px, 72vw);
    overflow-x: auto;
    padding: 2px 2px 10px;
    scroll-snap-type: x proximity;
  }

  .stem-step-chip { scroll-snap-align: start; }

  .recovery-banner {
    align-items: stretch;
    flex-direction: column;
  }

  .recovery-actions { flex-wrap: wrap; }

  .class-comparison-row {
    grid-template-columns: 1fr 1fr;
  }

  .pi-input,
  .pi-textarea,
  .param-input,
  .class-name-edit,
  .truth-select select {
    font-size: 16px;
  }

  .lab-progress-card {
    width: 100%;
  }
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
  flex-wrap: wrap;
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

.camera-sample-button {
  border: 1px solid var(--border-active);
  background: var(--surface);
  color: var(--primary);
  font: inherit;
}

.camera-sample-button:hover,
.camera-sample-button:focus-visible {
  border-color: var(--primary);
  background: var(--primary-soft);
  color: var(--primary-hover);
  outline: none;
}

.test-thumb-strip { margin-top: 8px; }

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
.pi-input:focus { border-color: var(--border-active); box-shadow: 0 0 0 3px var(--primary-soft); }
.pi-textareas { display: flex; flex-direction: column; gap: 10px; margin-top: 12px; }
.pi-textarea { width: 100%; min-height: 52px; padding: 8px 12px; border: 1px solid var(--border); border-radius: var(--radius-control); background: #fff; color: var(--text); font-size: 13px; line-height: 1.6; resize: vertical; outline: none; }
.pi-textarea:focus { border-color: var(--border-active); box-shadow: 0 0 0 3px var(--primary-soft); }
.pi-input::placeholder,
.pi-textarea::placeholder { color: var(--muted); opacity: 0.8; }

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
