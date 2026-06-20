<script setup>
defineProps({
  experiment: {
    type: Object,
    required: true
  }
});
</script>

<template>
  <div class="experiment-card">
    <div class="experiment-card__id">{{ experiment.id }}</div>
    <h3>{{ experiment.title }}</h3>
    <p class="experiment-card__subtitle">{{ experiment.subtitle }}</p>
    <div class="experiment-card__meta">
      <span>难度：{{ experiment.difficulty }}</span>
      <span>时长：{{ experiment.duration }}</span>
    </div>
    <p>{{ experiment.objective }}</p>
    <div class="experiment-card__chips">
      <span v-for="item in experiment.variables" :key="item" class="chip">{{ item }}</span>
    </div>
    <div class="experiment-card__chips">
      <span v-for="item in experiment.metrics" :key="item" class="chip chip--soft">{{ item }}</span>
    </div>
    <router-link :to="experiment.route">
      <el-button type="primary">开始实验</el-button>
    </router-link>
  </div>
</template>

<style scoped>
.experiment-card {
  padding: 22px;
  border-radius: 18px;
  background: #fff;
  border: 1px solid var(--border);
  box-shadow: 0 14px 30px rgba(29, 78, 216, 0.08);
}

.experiment-card__id {
  color: var(--primary);
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 10px;
}

h3 {
  margin: 0 0 10px;
}

p {
  margin: 0 0 18px;
  color: var(--muted);
  line-height: 1.7;
}

.experiment-card__subtitle {
  margin-bottom: 10px;
  color: var(--text);
}

.experiment-card__meta {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
  color: var(--primary);
  font-size: 13px;
  font-weight: 600;
}

.experiment-card__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}

.chip {
  padding: 6px 10px;
  border-radius: 999px;
  background: #eaf2ff;
  color: var(--primary);
  font-size: 12px;
}

.chip--soft {
  background: #ecfdf5;
  color: var(--success);
}
</style>
