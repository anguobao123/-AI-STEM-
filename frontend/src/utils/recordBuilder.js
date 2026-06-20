export function buildMockRecordPayload(labData) {
  return {
    experimentId: labData.experimentId,
    title: labData.title,
    objective: labData.objective,
    status: "completed",
    datasetSummary: labData.datasetSummary,
    trainConfig: labData.trainConfig,
    summary: {
      accuracy: 0.91,
      loss: 0.18,
      classCount: labData.datasetSummary?.classCount ?? 0,
      sampleCount: labData.datasetSummary?.totalImages ?? 0,
      errorCount: 6
    },
    chartData: {
      epochs: [1, 5, 10, 15, 20],
      accuracy: [0.42, 0.58, 0.74, 0.86, 0.91],
      valAccuracy: [0.38, 0.52, 0.68, 0.8, 0.86],
      loss: [1.28, 0.96, 0.61, 0.33, 0.18],
      valLoss: [1.36, 1.04, 0.78, 0.46, 0.29]
    },
    confusionMatrix: {
      labels: labData.datasetSummary?.classes?.map((item) => item.name) || [],
      matrix: [
        [18, 1, 1],
        [2, 17, 1],
        [0, 1, 19]
      ]
    },
    errorSamples: [
      {
        id: 1,
        imageName: "plant_08.jpg",
        trueLabel: "校园植物",
        predictedLabel: "生活用品",
        confidence: 0.67,
        reason: "背景中出现桌面和物品，模型可能更关注背景特征。"
      },
      {
        id: 2,
        imageName: "object_11.jpg",
        trueLabel: "生活用品",
        predictedLabel: "校园植物",
        confidence: 0.61,
        reason: "图像中绿色面积较大，与植物类别特征相近。"
      }
    ],
    optimizationPlan: null,
    reflection: null,
    versionCompare: [],
    stemSummary: null,
    modelVersion: 0,
    suggestions: [
      "增加每个类别的样本数量。",
      "减少背景干扰明显的图片。",
      "为容易混淆的类别补充更多不同角度的样本。",
      "后续可以对比开启和关闭数据增强后的效果。"
    ]
  };
}

export function buildRealRecordPayload(
  labData,
  trainingResult,
  testResults = [],
  batchTestResult = null,
  modelInfo = null,
  courseFields = {}
) {
  if (!trainingResult) {
    throw new Error("真实训练结果不存在，无法保存实验记录。");
  }

  const effectiveTestResults = batchTestResult?.testResults?.length
    ? batchTestResult.testResults
    : testResults;
  const effectiveClassMetrics = batchTestResult?.classMetrics || [];

  let testCount = 0;
  let testCorrectCount = 0;
  let testAccuracy = null;

  if (batchTestResult?.summary) {
    testCount = batchTestResult.summary.testCount ?? 0;
    testCorrectCount = batchTestResult.summary.testCorrectCount ?? 0;
    testAccuracy = batchTestResult.summary.testAccuracy ?? null;
  } else {
    const labeledResults = effectiveTestResults.filter((item) => item.trueLabel);
    testCount = effectiveTestResults.length;
    testCorrectCount = labeledResults.filter((item) => item.isCorrect === true).length;
    testAccuracy = labeledResults.length ? testCorrectCount / labeledResults.length : null;
  }

  const predictionErrors = effectiveTestResults
    .filter((item) => item.isCorrect === false)
    .map((item) => ({
      id: item.id,
      imageName: item.imageName,
      trueLabel: item.trueLabel,
      predictedLabel: item.predictedLabel,
      confidence: item.confidence,
      reason: "测试图片预测错误，可能与训练样本数量、样本质量或类别相似度有关。"
    }));

  const suggestions = [...(trainingResult.suggestions || [])];
  suggestions.push("建议继续上传更多独立测试图片，观察模型在未参与训练图片上的表现。");
  if (typeof testAccuracy === "number") {
    if (testAccuracy < 0.7) {
      suggestions.push("测试集准确率偏低，建议补充更多高质量训练样本或检查类别边界是否清晰。");
    } else {
      suggestions.push("测试集表现较稳定，可继续增加独立测试样本验证模型泛化能力。");
    }
  }

  const normalizedModelInfo = modelInfo
    ? {
        modelKey: modelInfo.modelKey,
        classNames: Array.isArray(modelInfo.classNames) ? modelInfo.classNames : [],
        imageSize: Number(modelInfo.imageSize || modelInfo.trainConfig?.imageSize || 0) || null,
        experimentId: modelInfo.experimentId || labData.experimentId,
        trainConfig: modelInfo.trainConfig || {},
        accuracy: typeof modelInfo.accuracy === "number" ? modelInfo.accuracy : null,
        testAccuracy: typeof modelInfo.testAccuracy === "number" ? modelInfo.testAccuracy : null,
        createdAt: modelInfo.createdAt || modelInfo.savedAt || null,
        savedAt: modelInfo.savedAt || modelInfo.createdAt || null,
        storage: modelInfo.storage || "indexeddb",
        localOnly: modelInfo.localOnly !== false,
        backend: modelInfo.backend || "cpu",
        rebuiltForSave: modelInfo.rebuiltForSave === true
      }
    : null;

  return {
    experimentId: labData.experimentId,
    title: `${labData.title}（真实训练）`,
    modelVersion: courseFields.modelVersion ?? 0,
    optimizationPlan: courseFields.optimizationPlan ?? null,
    reflection: courseFields.reflection ?? null,
    versionCompare: courseFields.versionCompare ?? [],
    stemSummary: courseFields.stemSummary ?? null,
    projectName: courseFields.projectName ?? "",
    groupName: courseFields.groupName ?? "",
    authorName: courseFields.authorName ?? "",
    hypothesis: courseFields.hypothesis ?? "",
    variableType: courseFields.variableType ?? "",
    variableDescription: courseFields.variableDescription ?? "",
    controlledConditions: courseFields.controlledConditions ?? "",
    expectedChange: courseFields.expectedChange ?? "",
    datasetNote: courseFields.datasetNote ?? "",
    conclusion: courseFields.conclusion ?? "",
    experimentLog: courseFields.experimentLog ?? [],
    objective: courseFields.objective ?? labData.objective,
    status: "completed",
    datasetSummary: trainingResult.datasetSummary,
    trainConfig: {
      ...trainingResult.trainConfig,
      ...(normalizedModelInfo
        ? {
            modelStorage: {
              modelKey: normalizedModelInfo.modelKey,
              storage: normalizedModelInfo.storage,
              localOnly: normalizedModelInfo.localOnly,
              createdAt: normalizedModelInfo.createdAt,
              classNames: normalizedModelInfo.classNames,
              imageSize: normalizedModelInfo.imageSize
            }
          }
        : {})
    },
    summary: {
      ...trainingResult.summary,
      testCount,
      testCorrectCount,
      testAccuracy,
      testResults: effectiveTestResults,
      classMetrics: effectiveClassMetrics,
      ...(normalizedModelInfo ? { modelInfo: normalizedModelInfo } : {})
    },
    chartData: trainingResult.chartData,
    confusionMatrix: batchTestResult?.confusionMatrix || trainingResult.confusionMatrix,
    errorSamples: [...(trainingResult.errorSamples || []), ...(batchTestResult?.errorSamples || predictionErrors)],
    suggestions
  };
}
