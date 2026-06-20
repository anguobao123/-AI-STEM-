import "@tensorflow/tfjs-backend-cpu";
import * as tf from "@tensorflow/tfjs";
import { filesToDataset, imageToTensor, loadImageFromFile } from "./imagePreprocess";

export async function ensureTfReady(preferredBackend = "cpu") {
  let backend = "";
  let backendError = "";

  try {
    const current = tf.getBackend();
    if (!current && preferredBackend) {
      await tf.setBackend(preferredBackend);
    }
    await tf.ready();
    backend = tf.getBackend();
  } catch (error) {
    backendError = error?.message || String(error);
    try {
      if (preferredBackend) {
        await tf.setBackend(preferredBackend);
        await tf.ready();
        backend = tf.getBackend();
      }
    } catch (fallbackError) {
      backendError = fallbackError?.message || backendError;
    }
  }

  return {
    backend,
    version: tf.version?.tfjs || "",
    memory: tf.memory(),
    backendError
  };
}

export function getTfDebugInfo(model = null) {
  const hasIndexedDB =
    typeof window !== "undefined" && typeof window.indexedDB !== "undefined";
  const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const memory = tf.memory();
  const info = {
    backend: tf.getBackend(),
    version: tf.version?.tfjs || "",
    memory,
    tensorCount: memory?.numTensors ?? 0,
    dataBufferCount: memory?.numDataBuffers ?? 0,
    unreliableMemory: Boolean(memory?.unreliable),
    indexedDBAvailable: hasIndexedDB,
    userAgent,
    hasModel: !!model,
    hasSaveMethod: typeof model?.save === "function",
    modelType: model?.constructor?.name || "",
    modelInputs: model?.inputs?.length || 0,
    modelOutputs: model?.outputs?.length || 0,
    isLayersModelLike: typeof model?.getWeights === "function" && typeof model?.save === "function",
    weightCount: 0
  };

  if (!model) {
    return info;
  }

  try {
    info.weightCount = model.getWeights().length;
  } catch (error) {
    info.weightCount = -1;
    info.debugError = error?.message || String(error);
  }

  return info;
}

export async function createAndSaveMinimalModelForDebug(modelKey = "debug-minimal-model") {
  let model = null;
  let loaded = null;

  try {
    const tfInfo = await ensureTfReady("cpu");
    model = tf.sequential();
    model.add(tf.layers.dense({ inputShape: [2], units: 2, activation: "relu" }));
    model.add(tf.layers.dense({ units: 2, activation: "softmax" }));
    model.compile({
      optimizer: "adam",
      loss: "categoricalCrossentropy",
      metrics: ["accuracy"]
    });

    await model.save(`indexeddb://${modelKey}`);
    loaded = await tf.loadLayersModel(`indexeddb://${modelKey}`);

    return {
      saved: true,
      loaded: true,
      modelKey,
      backend: tfInfo.backend
    };
  } finally {
    loaded?.dispose?.();
    model?.dispose?.();
  }
}

export function createImageClassifier(classCount, imageSize = 64) {
  const model = tf.sequential();
  model.add(tf.layers.flatten({ inputShape: [imageSize, imageSize, 3] }));
  model.add(tf.layers.dense({ units: 32, activation: "relu" }));
  model.add(tf.layers.dense({ units: 16, activation: "relu" }));
  model.add(tf.layers.dense({ units: classCount, activation: "softmax" }));
  return model;
}

export async function inspectModelWeights(model) {
  if (!model) {
    throw new Error("模型不存在，无法检查权重。");
  }

  if (typeof model.getWeights !== "function") {
    throw new Error("当前模型不支持读取权重。");
  }

  const weights = model.getWeights();
  const inspection = {
    weightCount: weights.length,
    weights: [],
    allReadable: true
  };

  for (let index = 0; index < weights.length; index += 1) {
    const weight = weights[index];
    const item = {
      index,
      shape: Array.isArray(weight?.shape) ? [...weight.shape] : [],
      dtype: weight?.dtype || "",
      size: weight?.size ?? 0,
      canRead: true,
      error: ""
    };

    try {
      await weight.data();
    } catch (error) {
      item.canRead = false;
      item.error = error?.message || String(error);
      inspection.allReadable = false;
    }

    inspection.weights.push(item);
  }

  return inspection;
}

export async function cloneWeightsSafely(model) {
  if (!model) {
    throw new Error("模型不存在，无法复制权重。");
  }

  if (typeof model.getWeights !== "function") {
    throw new Error("当前模型不支持读取权重。");
  }

  const weights = model.getWeights();
  const copiedWeights = [];

  try {
    for (let index = 0; index < weights.length; index += 1) {
      const weight = weights[index];
      try {
        const values = await weight.data();
        copiedWeights.push(tf.tensor(Array.from(values), weight.shape, weight.dtype));
      } catch (error) {
        throw new Error(`复制第 ${index + 1} 个权重失败：${error?.message || String(error)}`);
      }
    }

    return copiedWeights;
  } catch (error) {
    copiedWeights.forEach((tensor) => tensor.dispose?.());
    throw error;
  }
}

export async function rebuildInferenceModelFromTrainedModel(
  trainedModel,
  classCount,
  imageSize = 64
) {
  if (!trainedModel) {
    throw new Error("训练模型不存在，无法重建推理模型。");
  }

  if (classCount < 2) {
    throw new Error("类别数量不足，无法重建推理模型。");
  }

  await ensureTfReady("cpu");

  let inferenceModel = null;
  let copiedWeights = null;

  try {
    inferenceModel = createImageClassifier(classCount, imageSize);
    const dummy = tf.zeros([1, imageSize, imageSize, 3]);
    const output = inferenceModel.predict(dummy);
    dummy.dispose();

    if (Array.isArray(output)) {
      output.forEach((tensor) => tensor.dispose?.());
    } else {
      output?.dispose?.();
    }

    copiedWeights = await cloneWeightsSafely(trainedModel);
    const targetWeights = inferenceModel.getWeights();

    if (copiedWeights.length !== targetWeights.length) {
      targetWeights.forEach((tensor) => tensor.dispose?.());
      throw new Error(
        `权重数量不一致：原模型 ${copiedWeights.length}，推理模型 ${targetWeights.length}`
      );
    }

    targetWeights.forEach((tensor) => tensor.dispose?.());
    inferenceModel.setWeights(copiedWeights);

    const verification = await inspectModelWeights(inferenceModel);
    if (!verification.allReadable) {
      throw new Error("重建后的推理模型权重不可读。");
    }

    return inferenceModel;
  } catch (error) {
    copiedWeights?.forEach((tensor) => tensor.dispose?.());
    inferenceModel?.dispose?.();
    throw new Error(error?.message || "重建推理模型失败。");
  }
}

export async function trainImageClassifier(options) {
  const {
    classFileMap,
    epochs = 10,
    batchSize = 4,
    learningRate = 0.001,
    imageSize = 64,
    onEpochEnd
  } = options || {};

  if (!Array.isArray(classFileMap) || classFileMap.length < 2) {
    throw new Error("至少需要 2 个类别才能开始真实训练。");
  }

  const activeClasses = classFileMap
    .map((item) => ({
      className: item.className?.trim() || "",
      files: Array.isArray(item.files) ? item.files.slice(0, 20) : []
    }))
    .filter((item) => item.className && item.files.length > 0);

  if (activeClasses.length < 2) {
    throw new Error("至少需要 2 个有效类别，并为每个类别上传图片。");
  }

  for (const item of activeClasses) {
    if (item.files.length < 2) {
      throw new Error(`类别“${item.className}”至少需要 2 张图片。`);
    }
  }

  let model;
  let xs;
  let ys;

  try {
    const tfInfo = await ensureTfReady("cpu");
    const dataset = await filesToDataset(activeClasses, imageSize);
    xs = dataset.xs;
    ys = dataset.ys;

    const validationSplit = dataset.sampleCount >= 5 ? 0.2 : 0;
    const epochLogs = [];

    model = createImageClassifier(dataset.classNames.length, imageSize);
    model.compile({
      optimizer: tf.train.adam(learningRate),
      loss: "categoricalCrossentropy",
      metrics: ["accuracy"]
    });

    await model.fit(xs, ys, {
      epochs,
      batchSize,
      shuffle: true,
      validationSplit,
      callbacks: {
        onEpochEnd: async (epoch, logs) => {
          const entry = {
            epoch: epoch + 1,
            accuracy: Number(logs?.acc ?? logs?.accuracy ?? 0),
            loss: Number(logs?.loss ?? 0),
            valAccuracy: Number(
              logs?.val_acc ?? logs?.val_accuracy ?? logs?.acc ?? logs?.accuracy ?? 0
            ),
            valLoss: Number(logs?.val_loss ?? logs?.loss ?? 0)
          };
          epochLogs.push(entry);
          if (onEpochEnd) {
            await onEpochEnd(entry);
          }
          await tf.nextFrame();
        }
      }
    });

    const evaluation = model.evaluate(xs, ys, { batchSize });
    const [lossTensor, accuracyTensor] = Array.isArray(evaluation) ? evaluation : [evaluation];
    const loss = Number(lossTensor.dataSync()[0] || 0);
    const accuracy = Number(accuracyTensor?.dataSync?.()[0] || 0);

    const predictionTensor = model.predict(xs);
    const predictedIndexes = Array.from(predictionTensor.argMax(-1).dataSync());
    const actualIndexes = Array.from(ys.argMax(-1).dataSync());

    const confusionMatrix = buildConfusionMatrix(dataset.classNames, actualIndexes, predictedIndexes);
    const errorSamples = buildErrorSamples(
      activeClasses,
      dataset.classNames,
      actualIndexes,
      predictedIndexes,
      predictionTensor.arraySync()
    );

    predictionTensor.dispose?.();
    lossTensor?.dispose?.();
    accuracyTensor?.dispose?.();

    return {
      model,
      modelReady: true,
      tfBackend: tfInfo.backend || tf.getBackend(),
      classNames: dataset.classNames,
      summary: {
        accuracy,
        loss,
        classCount: dataset.classNames.length,
        sampleCount: dataset.sampleCount,
        errorCount: errorSamples.length
      },
      chartData: {
        epochs: epochLogs.map((item) => item.epoch),
        accuracy: epochLogs.map((item) => item.accuracy),
        loss: epochLogs.map((item) => item.loss),
        valAccuracy: epochLogs.map((item) => item.valAccuracy),
        valLoss: epochLogs.map((item) => item.valLoss)
      },
      datasetSummary: {
        classCount: dataset.classNames.length,
        totalImages: dataset.sampleCount,
        classes: dataset.classStats
      },
      trainConfig: {
        epochs,
        batchSize,
        learningRate,
        imageSize,
        validationSplit,
        augmentation: {
          flip: false,
          crop: false,
          brightness: false,
          rotation: false
        }
      },
      confusionMatrix,
      errorSamples,
      suggestions: buildSuggestions(
        { accuracy, errorCount: errorSamples.length },
        errorSamples,
        { totalImages: dataset.sampleCount }
      )
    };
  } catch (error) {
    model?.dispose?.();
    throw new Error(error?.message || "TensorFlow.js 训练失败。");
  } finally {
    xs?.dispose?.();
    ys?.dispose?.();
  }
}

export async function predictImage(model, file, classNames, imageSize = 64) {
  if (!model) {
    throw new Error("模型不存在，无法执行预测。");
  }

  if (!(file instanceof File)) {
    throw new Error("请选择有效的测试图片。");
  }

  await ensureTfReady("cpu");
  const image = await loadImageFromFile(file);
  const inputTensor = tf.tidy(() => imageToTensor(image, imageSize).expandDims(0));

  try {
    const output = model.predict(inputTensor);
    const probabilities = Array.from(output.dataSync());
    const topPredictions = probabilities
      .map((confidence, index) => ({
        label: classNames[index],
        confidence: Number(confidence || 0)
      }))
      .sort((a, b) => b.confidence - a.confidence);

    output.dispose?.();

    return {
      predictedLabel: topPredictions[0]?.label || "",
      confidence: topPredictions[0]?.confidence || 0,
      topPredictions
    };
  } catch (error) {
    throw new Error(error?.message || "测试图片预测失败。");
  } finally {
    inputTensor.dispose?.();
  }
}

export async function evaluateTestDataset(options) {
  const { model, classNames = [], testFileMap = [], imageSize = 64 } = options || {};

  if (!model) {
    throw new Error("请先完成真实训练，再进行批量测试。");
  }

  const matrix = classNames.map(() => classNames.map(() => 0));
  const classCounter = new Map(
    classNames.map((name) => [name, { className: name, total: 0, correct: 0, accuracy: 0 }])
  );
  const testResults = [];
  const errorSamples = [];

  for (const item of testFileMap) {
    if (!item?.className || !Array.isArray(item.files) || item.files.length === 0) {
      continue;
    }

    for (const file of item.files) {
      const predicted = await predictImage(model, file, classNames, imageSize);
      const isCorrect = predicted.predictedLabel === item.className;
      const result = {
        id: Date.now() + testResults.length,
        imageName: file.name,
        trueLabel: item.className,
        predictedLabel: predicted.predictedLabel,
        confidence: predicted.confidence,
        topPredictions: predicted.topPredictions,
        isCorrect,
        createdAt: new Date().toISOString()
      };

      testResults.push(result);

      const classMetric = classCounter.get(item.className);
      if (classMetric) {
        classMetric.total += 1;
        if (isCorrect) {
          classMetric.correct += 1;
        }
      }

      const trueIndex = classNames.indexOf(item.className);
      const predictedIndex = classNames.indexOf(predicted.predictedLabel);
      if (trueIndex >= 0 && predictedIndex >= 0) {
        matrix[trueIndex][predictedIndex] += 1;
      }

      if (!isCorrect) {
        errorSamples.push({
          id: result.id,
          imageName: result.imageName,
          trueLabel: result.trueLabel,
          predictedLabel: result.predictedLabel,
          confidence: result.confidence,
          reason: "测试集预测错误，可能与样本数量、样本质量或类别相似度有关。"
        });
      }
    }
  }

  if (testResults.length === 0) {
    throw new Error("请至少上传一张测试图片。");
  }

  const testCorrectCount = testResults.filter((item) => item.isCorrect).length;
  const classMetrics = Array.from(classCounter.values()).map((item) => ({
    ...item,
    accuracy: item.total ? item.correct / item.total : 0
  }));

  return {
    summary: {
      testCount: testResults.length,
      testCorrectCount,
      testAccuracy: testCorrectCount / testResults.length
    },
    classMetrics,
    confusionMatrix: {
      labels: classNames,
      matrix
    },
    testResults,
    errorSamples
  };
}

export async function saveModelToIndexedDB(model, modelKey, options = {}) {
  const { classCount, imageSize = 64, rebuildForSave = true } = options;

  if (!model) {
    throw new Error("没有可保存的模型，请先完成真实训练。");
  }

  if (!modelKey) {
    throw new Error("缺少模型 key，无法保存本机模型。");
  }

  if (typeof model.save !== "function") {
    throw new Error("当前模型不支持保存，请确认训练结果返回的是 tf.LayersModel。");
  }

  await ensureTfReady("cpu");

  let rebuiltModel = null;
  let rebuildSaveError = null;
  let directSaveError = null;

  try {
    if (rebuildForSave) {
      try {
        rebuiltModel = await rebuildInferenceModelFromTrainedModel(model, classCount, imageSize);
        await rebuiltModel.save(`indexeddb://${modelKey}`);
        return {
          modelKey,
          savedAt: new Date().toISOString(),
          storage: "indexeddb",
          localOnly: true,
          backend: tf.getBackend(),
          rebuiltForSave: true
        };
      } catch (error) {
        rebuildSaveError = error;
        console.error("Rebuilt inference model save failed:", error);
      }
    }

    try {
      await model.save(`indexeddb://${modelKey}`);
      return {
        modelKey,
        savedAt: new Date().toISOString(),
        storage: "indexeddb",
        localOnly: true,
        backend: tf.getBackend(),
        rebuiltForSave: false,
        rebuildError: rebuildSaveError?.message || ""
      };
    } catch (error) {
      directSaveError = error;
    }

    throw new Error(
      `重建推理模型保存失败：${rebuildSaveError?.message || "未执行重建保存。"}\n直接保存原模型失败：${directSaveError?.message || "未执行直接保存。"}`
    );
  } catch (error) {
    const debugInfo = getTfDebugInfo(model);
    console.error("IndexedDB model save failed:", error, debugInfo);
    throw new Error(`模型保存失败：${error?.message || String(error)}`);
  } finally {
    rebuiltModel?.dispose?.();
  }
}

export async function loadModelFromIndexedDB(modelKey) {
  if (!modelKey || !String(modelKey).trim()) {
    throw new Error("模型标识不能为空，无法加载本机模型。");
  }

  try {
    await ensureTfReady("cpu");
    const loadedModel = await tf.loadLayersModel(`indexeddb://${modelKey}`);
    const classCount = loadedModel?.outputs?.[0]?.shape?.at?.(-1);
    const imageSize = loadedModel?.inputs?.[0]?.shape?.[1] || 64;
    if (typeof classCount === "number" && classCount >= 2) {
      const rebuiltModel = await rebuildInferenceModelFromTrainedModel(loadedModel, classCount, imageSize);
      loadedModel.dispose?.();
      return rebuiltModel;
    }
    return loadedModel;
  } catch (error) {
    throw new Error(
      `模型加载失败，可能是浏览器缓存被清理，或该模型不是在当前浏览器中保存的。原始错误：${error?.message || String(error)}`
    );
  }
}

export async function loadModelFromBrowserFiles(modelJsonFile, weightFiles = []) {
  if (!(modelJsonFile instanceof File)) {
    throw new Error("请先选择 model.json 文件。");
  }

  const normalizedWeights = Array.isArray(weightFiles) ? weightFiles.filter((file) => file instanceof File) : [];
  if (!normalizedWeights.length) {
    throw new Error("请至少选择一个 weights 权重文件。");
  }

  try {
    await ensureTfReady("cpu");
    return await tf.loadLayersModel(tf.io.browserFiles([modelJsonFile, ...normalizedWeights]));
  } catch (error) {
    throw new Error(`模型加载失败，请确认 model.json 与 weights 文件来自同一次导出。原始错误：${error?.message || String(error)}`);
  }
}

function downloadBlob(blob, filename) {
  if (typeof document === "undefined") {
    throw new Error("当前环境不支持浏览器下载。");
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function sanitizeDownloadName(value) {
  return (
    String(value || "model")
      .trim()
      .replace(/[\\/:*?"<>|]+/g, "-")
      .replace(/\s+/g, "-")
      .slice(0, 80) || "model"
  );
}

export async function exportModelFiles(model, metadata = {}, options = {}) {
  if (!model || typeof model.save !== "function") {
    throw new Error("没有可导出的 TensorFlow.js 模型。");
  }

  await ensureTfReady("cpu");

  let artifacts = null;
  await model.save(
    tf.io.withSaveHandler(async (modelArtifacts) => {
      artifacts = modelArtifacts;
      const topologyBytes = new Blob([JSON.stringify(modelArtifacts.modelTopology || {})]).size;
      const weightSpecsBytes = new Blob([JSON.stringify(modelArtifacts.weightSpecs || [])]).size;
      return {
        modelArtifactsInfo: {
          dateSaved: new Date(),
          modelTopologyType: "JSON",
          modelTopologyBytes: topologyBytes,
          weightSpecsBytes,
          weightDataBytes: modelArtifacts.weightData?.byteLength || 0
        }
      };
    })
  );

  if (!artifacts?.weightData) {
    throw new Error("模型权重数据为空，无法导出。");
  }

  const baseName = sanitizeDownloadName(
    options.baseName || metadata.modelKey || metadata.experimentId || `tuiangfenlei-${Date.now()}`
  );
  const modelJsonFile = `${baseName}-model.json`;
  const weightsFile = `${baseName}-weights.bin`;
  const metadataFile = `${baseName}-metadata.json`;

  const modelJson = {
    format: artifacts.format,
    generatedBy: artifacts.generatedBy,
    convertedBy: artifacts.convertedBy,
    modelTopology: artifacts.modelTopology,
    weightsManifest: [
      {
        paths: [weightsFile],
        weights: artifacts.weightSpecs || []
      }
    ]
  };

  const exportMetadata = {
    ...metadata,
    exportedAt: new Date().toISOString(),
    files: {
      modelJson: modelJsonFile,
      weights: weightsFile,
      metadata: metadataFile
    }
  };

  downloadBlob(new Blob([JSON.stringify(modelJson, null, 2)], { type: "application/json" }), modelJsonFile);
  downloadBlob(new Blob([artifacts.weightData], { type: "application/octet-stream" }), weightsFile);
  downloadBlob(new Blob([JSON.stringify(exportMetadata, null, 2)], { type: "application/json" }), metadataFile);

  return {
    modelJsonFile,
    weightsFile,
    metadataFile
  };
}

export async function removeModelFromIndexedDB(modelKey) {
  if (!modelKey || !String(modelKey).trim()) {
    throw new Error("模型标识不能为空，无法删除本机模型。");
  }

  try {
    await ensureTfReady("cpu");
    return await tf.io.removeModel(`indexeddb://${modelKey}`);
  } catch (error) {
    throw new Error(error?.message || "本机模型删除失败。");
  }
}

function buildConfusionMatrix(classNames, actualIndexes, predictedIndexes) {
  const matrix = classNames.map(() => classNames.map(() => 0));
  actualIndexes.forEach((actual, index) => {
    const predicted = predictedIndexes[index];
    matrix[actual][predicted] += 1;
  });
  return {
    labels: classNames,
    matrix
  };
}

function buildErrorSamples(activeClasses, classNames, actualIndexes, predictedIndexes, probabilities) {
  const fileLookup = [];
  activeClasses.forEach((item) => {
    item.files.forEach((file) => {
      fileLookup.push({
        imageName: file.name,
        trueLabel: item.className
      });
    });
  });

  return actualIndexes
    .map((actualIndex, index) => {
      const predictedIndex = predictedIndexes[index];
      if (actualIndex === predictedIndex) {
        return null;
      }

      return {
        id: index + 1,
        imageName: fileLookup[index]?.imageName || `sample_${index + 1}.png`,
        trueLabel: classNames[actualIndex],
        predictedLabel: classNames[predictedIndex],
        confidence: Number(probabilities[index]?.[predictedIndex] || 0),
        reason: "模型对该样本产生了混淆，建议补充更多同类样本并减少背景干扰。"
      };
    })
    .filter(Boolean);
}

function buildSuggestions(summary, errorSamples, datasetSummary) {
  const suggestions = [];

  if ((summary.accuracy || 0) < 0.7) {
    suggestions.push("当前模型准确率偏低，建议增加每类训练样本数量。");
  } else {
    suggestions.push("当前模型已形成基本分类能力，可继续补充样本提升稳定性。");
  }

  if ((datasetSummary.totalImages || 0) < 30) {
    suggestions.push("当前总样本量较少，后续可增加每类图片数量以改善泛化表现。");
  }

  if (errorSamples.length) {
    suggestions.push("建议针对容易混淆的类别补充不同角度、不同背景的训练图片。");
  }

  suggestions.push("后续阶段可升级为 MobileNet 迁移学习，但当前阶段先保持轻量 CNN 闭环。");
  return suggestions;
}
