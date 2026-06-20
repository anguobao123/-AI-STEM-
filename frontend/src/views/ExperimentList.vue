<script setup>
import { computed } from "vue";
import { useExperimentStore } from "../store/experimentStore";

const store = useExperimentStore();

const taskDetails = {
  "exp-01": {
    route: "/lab/sample-count",
    duration: "1 课时",
    question: "AI 能否区分常见水果图片？",
    variable: "类别名称与基础样本数量",
    dataset: "准备 2-3 类水果，每类训练图不少于 2 张，并预留独立测试图。",
    output: "完成一次基础分类体验，记录模型预测现象。",
    stem: "S 提问假设 / T 训练模型"
  },
  "exp-02": {
    route: "/lab/sample-count",
    duration: "1—2 课时",
    question: "每类样本数量增加后，模型准确率会提高吗？",
    variable: "每类训练样本数量",
    dataset: "同一组类别分阶段补充样本，测试集保持不变。",
    output: "形成样本数量与准确率、错误数之间的证据说明。",
    stem: "S 变量设计 / M 指标比较"
  },
  "exp-03": {
    route: "/lab/augmentation",
    duration: "2 课时",
    question: "如何优化校园物品分类模型，让它在新图片上更稳定？",
    variable: "图片质量、背景复杂度或样本多样性",
    dataset: "选择校园物品，补充不同角度、背景和光照的图片。",
    output: "完成模型 1.0 / 2.0 对比、优化方案和作品展示。",
    stem: "E 工程优化 / M 错误分析"
  },
  "exp-04": {
    route: "/lab/class-similarity",
    duration: "1 课时",
    question: "相似类别之间为什么更容易混淆？",
    variable: "类别相似度",
    dataset: "选择外观接近的两类物品，准备独立测试图。",
    output: "用混淆矩阵解释易错类别，并提出优化建议。",
    stem: "M 混淆矩阵 / E 优化策略"
  }
};

const experiments = computed(() =>
  store.experiments.slice(0, 4).map((exp, index) => ({
    ...exp,
    ...(taskDetails[exp.id] || taskDetails[`exp-0${index + 1}`] || taskDetails["exp-01"])
  }))
);
</script>

<template>
  <section class="experiment-page page-layout">
    <header class="page-heading">
      <div class="page-heading__copy">
        <span class="exp-kicker">数据如何教会 AI · 实验任务</span>
        <h1 class="page-title">选择你的实验任务</h1>
      </div>
      <p class="page-subtitle">
        每个实验只改变一个核心变量。选好任务后，按要求准备数据、训练模型、分析结果。
      </p>
    </header>

    <div class="experiment-grid">
      <div v-for="exp in experiments" :key="exp.id" class="experiment-card lab-module">
        <div class="card-head">
          <span class="stem-tag">STEM</span>
          <strong>{{ exp.title }}</strong>
        </div>
        <div class="task-meta">
          <span>推荐课时：{{ exp.duration }}</span>
          <span>STEM 重点：{{ exp.stem }}</span>
        </div>
        <dl class="task-brief">
          <div><dt>研究问题</dt><dd>{{ exp.question }}</dd></div>
          <div><dt>控制变量</dt><dd>{{ exp.variable }}</dd></div>
          <div><dt>数据集建议</dt><dd>{{ exp.dataset }}</dd></div>
          <div><dt>预期产出</dt><dd>{{ exp.output }}</dd></div>
        </dl>
        <router-link :to="exp.route">
          <el-button type="primary" plain>进入实验</el-button>
        </router-link>
      </div>
    </div>
  </section>
</template>

<style scoped>
.exp-kicker {
  color: var(--primary);
  font-size: 14px;
  font-weight: 800;
}

.experiment-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

.experiment-card {
  padding: 20px;
  display: grid;
  gap: 12px;
  transition: border-color 0.18s ease, transform 0.18s ease;
}

.experiment-card:hover {
  border-color: var(--border-hover);
  transform: translateY(-2px);
}

.card-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.stem-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 28px;
  border-radius: var(--radius-control);
  background: var(--primary-soft);
  color: var(--primary);
  font-size: 14px;
  font-weight: 800;
  flex-shrink: 0;
}

.card-head strong {
  color: var(--heading);
  font-size: 16px;
}

.card-summary {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.65;
}

.task-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.task-meta span {
  padding: 6px 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius-control);
  background: var(--surface-alt);
  color: var(--muted);
  font-size: 12px;
  font-weight: 800;
}

.task-brief {
  margin: 0;
  display: grid;
  gap: 10px;
}

.task-brief div {
  display: grid;
  gap: 4px;
}

.task-brief dt {
  color: var(--primary);
  font-size: 12px;
  font-weight: 900;
}

.task-brief dd {
  margin: 0;
  color: var(--text);
  line-height: 1.65;
  font-size: 13px;
}
</style>
