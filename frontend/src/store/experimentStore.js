import { defineStore } from "pinia";

export const useExperimentStore = defineStore("experiment", {
  state: () => ({
    experiments: [
      {
        id: "exp-01",
        title: "认识图像分类",
        summary: "从样本、标签和预测结果理解图像分类的基本流程。"
      },
      {
        id: "exp-02",
        title: "样本数量对模型准确率的影响",
        summary: "对比小样本和大样本训练条件下的模拟结果。"
      },
      {
        id: "exp-03",
        title: "训练轮次对模型效果的影响",
        summary: "观察 epoch 变化对准确率和损失的趋势影响。"
      },
      {
        id: "exp-04",
        title: "类别相似度对分类效果的影响",
        summary: "比较类别边界清晰与相似类别条件下的误判情况。"
      },
      {
        id: "exp-05",
        title: "数据增强对泛化能力的影响",
        summary: "以 mock 数据展示增强策略对验证集表现的提升。"
      }
    ],
    metrics: {
      accuracy: "92.6%",
      loss: "0.184",
      classCount: 5,
      sampleCount: 1280
    }
  })
});
