import { getExperimentMeta } from "./experimentContent";
import { formatPercent, safeText } from "./formatters";

export function mapRecordToReport(record) {
  if (!record) {
    return null;
  }

  const meta = getExperimentMeta(record.experimentId);
  const summary = record.summary || {};
  const errorSamples = record.errorSamples || [];
  const testAccuracy = summary.testAccuracy ?? summary.accuracy ?? 0;
  const testCount = summary.testCount ?? summary.sampleCount ?? 0;
  const correctCount = summary.testCorrectCount ?? "-";
  const errorCount = summary.errorCount ?? errorSamples.length ?? 0;
  const classCount = summary.classCount ?? record.datasetSummary?.classCount ?? "-";
  const createdAt = formatDateTime(record.createdAt || record.updatedAt || new Date().toISOString());

  return {
    id: record.recordId,
    code: `EXP-${String(record.recordId).padStart(4, "0")}`,
    createdAt,
    experimentId: record.experimentId || meta.id,
    title: meta.title,
    purpose: meta.objective,
    principle: meta.principle,
    operationBrief: meta.operationFocus,
    primaryParameter: meta.primaryParameter,
    parameterHint: meta.parameterHint,
    resultFocus: meta.resultFocus,
    labTips: meta.labTips || [],
    variableDesign: {
      question: meta.question,
      controlVariable: meta.controlVariable,
      constants: meta.constants,
      metrics: meta.metrics,
      focus: meta.reportFocus || meta.focus
    },
    process: buildProcess(meta),
    results: {
      accuracy: formatPercent(testAccuracy),
      testCount: safeText(testCount),
      correctCount: safeText(correctCount),
      errorCount: safeText(errorCount),
      classCount: safeText(classCount),
      confusionSummary: record.confusionMatrix?.labels?.join("、") || "暂无混淆矩阵数据"
    },
    resultTable: [
      { label: "测试准确率", value: formatPercent(testAccuracy) },
      { label: "测试样本数", value: safeText(testCount) },
      { label: "预测正确数", value: safeText(correctCount) },
      { label: "错误样本数", value: safeText(errorCount) },
      { label: "类别数量", value: safeText(classCount) },
      { label: "混淆矩阵摘要", value: record.confusionMatrix?.labels?.join("、") || "暂无混淆矩阵数据" }
    ],
    analysis: buildResultAnalysis(meta, testAccuracy, summary, errorSamples),
    errorAnalysis: errorSamples.map((item) => ({
      imageName: item.imageName,
      trueLabel: item.trueLabel,
      predictedLabel: item.predictedLabel,
      confidence: formatPercent(item.confidence || 0),
      reason: item.reason || "模型在该样本上产生误判，建议结合类别边界与训练样本质量继续分析。"
    })),
    suggestions: buildSuggestions(meta, testAccuracy, errorSamples),
    conclusion: buildConclusion(meta, testAccuracy, errorSamples.length)
  };
}

function buildProcess(meta) {
  return [
    `明确实验问题：“${meta.question}”。`,
    `围绕“${meta.primaryParameter}”组织本次操作，${meta.operationFocus}`,
    ...meta.guideSteps,
    `完成真实训练后，上传测试图片并重点观察：${meta.resultFocus}`,
    "保存实验记录，进入分析页与正式实验报告页。"
  ];
}

function buildResultAnalysis(meta, testAccuracy, summary, errorSamples) {
  const analysis = [];
  const accuracyText = formatPercent(testAccuracy);
  const lossText =
    typeof summary.loss === "number" && !Number.isNaN(summary.loss) ? summary.loss.toFixed(4) : "-";

  analysis.push(`本次实验的测试准确率为 ${accuracyText}，训练损失值为 ${lossText}。`);
  analysis.push(`本实验的结果观察重点是：${meta.resultFocus}`);

  if (meta.id === "sample-count") {
    analysis.push("本实验重点考察样本数量变化对模型稳定性的影响。样本越充分，模型越容易学习稳定的类别边界。");
  } else if (meta.id === "epoch-count") {
    analysis.push("本实验重点考察训练轮次变化对准确率与损失值趋势的影响，需要同时警惕过拟合。");
  } else if (meta.id === "class-similarity") {
    analysis.push("本实验重点考察相似类别之间的混淆情况，应结合混淆矩阵和错误样本进行分析。");
  } else if (meta.id === "augmentation") {
    analysis.push("本实验重点考察数据多样性提升后模型的泛化能力，应关注新图片上的表现是否改善。");
  }

  if (errorSamples.length) {
    analysis.push(`当前记录中共有 ${errorSamples.length} 个重点错误样本，可据此判断模型在哪些类别边界上仍不稳定。`);
  } else {
    analysis.push("当前记录未发现明显错误样本，说明模型在当前测试条件下具备较好的基础分类能力。");
  }

  return analysis;
}

function buildSuggestions(meta, testAccuracy, errorSamples) {
  const suggestions = [];

  if (testAccuracy < 0.8) {
    suggestions.push("建议补充更高质量的训练样本，并检查类别标签是否准确。");
  } else {
    suggestions.push("建议继续增加独立测试样本，进一步验证模型在新图片上的泛化能力。");
  }

  suggestions.push(`继续围绕“${meta.primaryParameter}”做对照实验，避免同时调整多个变量。`);

  if (meta.id === "sample-count") {
    suggestions.push("建议继续扩大每类样本数量，对比准确率是否继续提升。");
  } else if (meta.id === "epoch-count") {
    suggestions.push("建议继续对比不同训练轮次，观察损失值是否已趋于稳定。");
  } else if (meta.id === "class-similarity") {
    suggestions.push("建议为容易混淆的类别补充更多差异化训练图片。");
  } else if (meta.id === "augmentation") {
    suggestions.push("建议继续补充不同背景、角度和光照条件的样本，验证泛化提升是否稳定。");
  }

  if (errorSamples.length) {
    suggestions.push("建议重点分析错误样本的背景、角度和光照条件，补充更具区分度的训练图片。");
  }

  return suggestions;
}

function buildConclusion(meta, testAccuracy, errorCount) {
  const accuracyText = formatPercent(testAccuracy);
  return `本次“${meta.title}”实验围绕“${meta.question}”展开。当前测试准确率为 ${accuracyText}，错误样本数为 ${errorCount}。综合实验结果可见，${meta.reportFocus || meta.focus}`;
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return safeText(value, "未记录");
  }
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
}
