import { getRecord } from "./api";
import { getExperimentMeta } from "./experimentContent";
import { exportModelFiles, loadModelFromIndexedDB } from "./tfTrainer";

function compactValue(value, fallback = "") {
  return value === undefined || value === null || value === "" ? fallback : value;
}

function classNamesFromRecord(record, fallback = {}) {
  const modelInfo = record?.summary?.modelInfo || {};
  if (Array.isArray(modelInfo.classNames) && modelInfo.classNames.length) {
    return modelInfo.classNames;
  }
  if (Array.isArray(record?.confusionMatrix?.labels) && record.confusionMatrix.labels.length) {
    return record.confusionMatrix.labels;
  }
  if (Array.isArray(record?.datasetSummary?.classes) && record.datasetSummary.classes.length) {
    return record.datasetSummary.classes.map((item) => item.name).filter(Boolean);
  }
  return Array.isArray(fallback.classNames) ? fallback.classNames : [];
}

function getRecordModelKey(record, fallback = {}) {
  return (
    record?.summary?.modelInfo?.modelKey ||
    record?.trainConfig?.modelStorage?.modelKey ||
    fallback.modelKey ||
    ""
  );
}

export function buildLabExportMetadata(options = {}) {
  const {
    labData = {},
    meta = {},
    trainingResult = {},
    modelInfo = {},
    classNames = [],
    summary = {},
    createdAt
  } = options;
  const trainConfig = trainingResult.trainConfig || modelInfo.trainConfig || {};
  const imageSize = Number(modelInfo.imageSize || trainConfig.imageSize || 64);

  return {
    modelKey: modelInfo.modelKey || "",
    classNames,
    imageSize,
    experimentId: compactValue(labData.experimentId, meta.id),
    experimentTitle: compactValue(labData.title, meta.title),
    trainConfig,
    summary: {
      ...(trainingResult.summary || {}),
      ...summary
    },
    createdAt: compactValue(createdAt, modelInfo.createdAt || modelInfo.savedAt || new Date().toISOString())
  };
}

export function buildRecordExportMetadata(record, fallback = {}) {
  const modelInfo = record?.summary?.modelInfo || {};
  const trainConfig = record?.trainConfig || modelInfo.trainConfig || {};
  const meta = getExperimentMeta(record?.experimentId || fallback.experimentId);
  const imageSize = Number(modelInfo.imageSize || trainConfig.imageSize || fallback.imageSize || 64);

  return {
    modelKey: getRecordModelKey(record, fallback),
    classNames: classNamesFromRecord(record, fallback),
    imageSize,
    experimentId: compactValue(record?.experimentId, fallback.experimentId),
    experimentTitle: compactValue(record?.title, fallback.title || meta.title),
    trainConfig,
    summary: record?.summary || fallback.summary || {},
    createdAt: compactValue(
      modelInfo.createdAt || modelInfo.savedAt || record?.createdAt,
      fallback.createdAt || new Date().toISOString()
    )
  };
}

export function createModelExportBaseName(metadata = {}, fallback = "model") {
  const experimentId = metadata.experimentId || "experiment";
  const createdAt = String(metadata.createdAt || Date.now()).replace(/[:.]/g, "-");
  return `tuiangfenlei-${experimentId}-${createdAt || fallback}`;
}

export async function exportSavedRecordModel(recordId, fallback = {}) {
  const record = await getRecord(recordId);
  const metadata = buildRecordExportMetadata(record, fallback);
  if (!metadata.modelKey) {
    throw new Error("当前记录没有可导出的本机模型。");
  }

  const model = await loadModelFromIndexedDB(metadata.modelKey);
  try {
    return await exportModelFiles(model, metadata, {
      baseName: createModelExportBaseName(metadata, `record-${recordId}`)
    });
  } finally {
    model?.dispose?.();
  }
}
