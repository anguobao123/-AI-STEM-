export const LAB_STEP_KEYS = ["project", "variable", "dataset", "train", "test", "iterate"];

export function getLabStepTargetId(stepKey) {
  return LAB_STEP_KEYS.includes(stepKey) ? `lab-step-${stepKey}` : "lab-step-project";
}

export function getVersion2EntryReason({ modelVersion, trainState, hasModel, testCount, optimizationPlan }) {
  if (modelVersion !== 0) return "当前已进入模型 2.0。";
  if (trainState !== "completed" || !hasModel) return "请先完成模型 1.0 训练。";
  if (!Number(testCount)) return "请先完成模型 1.0 批量测试。";
  if (!String(optimizationPlan || "").trim()) return "请先填写优化方案，再进入模型 2.0。";
  return "";
}

export function clonePlainValue(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

export function createVersion1Snapshot(input) {
  const testedAt = input.testedAt || new Date().toISOString();
  return {
    version: "1.0",
    fromVersion: 0,
    toVersion: 1,
    trainConfig: clonePlainValue(input.trainConfig || {}),
    trainingImageCounts: clonePlainValue(input.trainingImageCounts || []),
    testImageCounts: clonePlainValue(input.testImageCounts || []),
    testCount: Number(input.testCount || 0),
    correctCount: Number(input.correctCount || 0),
    errorCount: Number(input.errorCount || 0),
    accuracy: typeof input.accuracy === "number" ? input.accuracy : null,
    beforeAccuracy: typeof input.accuracy === "number" ? input.accuracy : null,
    beforeErrorCount: Number(input.errorCount || 0),
    classMetrics: clonePlainValue(input.classMetrics || []),
    confusionMatrix: clonePlainValue(input.confusionMatrix || null),
    errorSamples: clonePlainValue(input.errorSamples || []),
    batchTestResult: clonePlainValue(input.batchTestResult || null),
    singleTestResults: clonePlainValue(input.singleTestResults || []),
    testedAt,
    diagnosis: input.diagnosis || "",
    plan: input.plan || "",
    conclusion: input.conclusion || "",
    reflection: input.reflection || "",
    timestamp: testedAt
  };
}

export function createPersistableLabSession(state) {
  const fields = [
    "projectName", "groupName", "authorName", "objective", "hypothesis", "variableType",
    "variableDescription", "controlledConditions", "expectedChange", "datasetNote", "optimizationPlan",
    "conclusion", "reflection", "modelVersion", "activeStepKey", "versionHistory", "experimentLog",
    "form", "batchTestResult", "testResults", "classDefinitions", "runtimeModelInfo", "runtimeTrainingResult"
  ];
  return fields.reduce((session, field) => {
    session[field] = clonePlainValue(state[field]);
    return session;
  }, { savedAt: new Date().toISOString(), schemaVersion: 1 });
}

function fileSignature(file) {
  return `${String(file?.name || "").trim().toLowerCase()}::${Number(file?.size || 0)}`;
}

export function findDatasetOverlaps(trainingGroups = [], testGroups = []) {
  const trainingFiles = new Map();
  trainingGroups.forEach((group) => {
    (group.files || []).forEach((entry) => {
      const file = entry.file || entry;
      trainingFiles.set(fileSignature(file), { className: group.name, fileName: file.name });
    });
  });

  const overlaps = [];
  testGroups.forEach((group) => {
    (group.files || []).forEach((entry) => {
      const file = entry.file || entry;
      const trainingMatch = trainingFiles.get(fileSignature(file));
      if (trainingMatch) {
        overlaps.push({
          fileName: file.name,
          trainingClass: trainingMatch.className,
          testClass: group.name
        });
      }
    });
  });
  return overlaps;
}

export function metricTrend(before, after, higherIsBetter = true) {
  if (typeof before !== "number" || typeof after !== "number") return "待测试";
  if (Math.abs(before - after) < 0.000001) return "不变";
  const improved = higherIsBetter ? after > before : after < before;
  return improved ? "改善" : "下降";
}
