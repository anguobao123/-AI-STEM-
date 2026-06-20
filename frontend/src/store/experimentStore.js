import { defineStore } from "pinia";

export const useExperimentStore = defineStore("experiment", {
  state: () => ({
    courseTitle: "数据如何教会 AI：图像分类模型实验课",
    courseSubtitle: "初中八年级 STEM 校本课程",
    experiments: [
      {
        id: "exp-01",
        title: "认识图像分类",
        summary: "从样本、标签和预测结果理解图像分类的基本流程 —— AI 为什么会认错图片？"
      },
      {
        id: "exp-02",
        title: "样本数量对模型准确率的影响",
        summary: "对比不同样本数量训练条件下模型的表现差异 —— 数据数量如何影响 AI？"
      },
      {
        id: "exp-03",
        title: "数据质量对模型稳定性的影响",
        summary: "比较图片质量、背景复杂度和样本多样性变化后的模型表现 —— 怎样让 AI 更稳定？"
      },
      {
        id: "exp-04",
        title: "类别相似度对分类效果的影响",
        summary: "比较类别边界清晰与相似类别条件下的误判情况 —— 数据质量如何影响 AI？"
      },
      {
        id: "exp-05",
        title: "数据增强对泛化能力的影响",
        summary: "探究样本多样性对模型泛化能力的提升效果 —— 训练方式如何影响 AI？"
      }
    ],
    stemFramework: {
      science: "科学探究：数据数量、数据质量和训练方式，会怎样影响 AI 的识别效果？",
      tech: "技术实现：上传图片、训练模型、预测测试，亲自动手教 AI 认图。",
      engineering: "工程优化：从模型 1.0 到模型 2.0，记录优化措施，对比改进效果。",
      math: "数学分析：准确率、错误率、每类准确率、混淆矩阵、错误样本分析。"
    },
    metrics: {
      accuracy: "92.6%",
      loss: "0.184",
      classCount: 5,
      sampleCount: 1280
    }
  })
});
