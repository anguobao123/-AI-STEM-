<script setup>
import { computed } from "vue";
import { useExperimentStore } from "../store/experimentStore";

const store = useExperimentStore();

const experiments = computed(() =>
  store.experiments.map((exp) => {
    return {
      ...exp,
      question: exp.summary.split("——")[1]?.trim() || exp.summary,
      stemDimension: exp.id === "exp-01" ? "S" : exp.id === "exp-02" || exp.id === "exp-03" ? "T" : exp.id === "exp-04" ? "M" : "E"
    };
  })
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
          <span class="stem-tag">{{ exp.stemDimension }}</span>
          <strong>{{ exp.title }}</strong>
        </div>
        <p class="card-summary">{{ exp.summary }}</p>
        <router-link :to="exp.id === 'exp-01' ? '/lab/sample-count' : exp.id === 'exp-02' ? '/lab/sample-count' : exp.id === 'exp-03' ? '/lab/epoch-count' : exp.id === 'exp-04' ? '/lab/class-similarity' : '/lab/augmentation'">
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
  width: 28px;
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
</style>