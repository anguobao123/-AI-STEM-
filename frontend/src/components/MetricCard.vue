<script setup>
defineProps({
  title: String,
  value: [String, Number],
  note: String
});
</script>

<template>
  <div class="metric-card">
    <div class="metric-card__title">{{ title }}</div>
    <div class="metric-card__value">{{ value }}</div>
    <div class="metric-card__note">{{ note }}</div>
  </div>
</template>

<style scoped>
.metric-card {
  padding: 20px;
  border-radius: 16px;
  border: 1px solid var(--border);
  background: linear-gradient(180deg, #fff, #f8fbff);
}

.metric-card__title,
.metric-card__note {
  color: var(--muted);
}

.metric-card__value {
  margin: 10px 0 8px;
  font-size: 32px;
  font-weight: 800;
  color: var(--primary);
}
</style>
