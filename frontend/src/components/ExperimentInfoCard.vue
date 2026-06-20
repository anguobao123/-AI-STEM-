<script setup>
defineProps({
  title: String,
  value: String
});
</script>

<template>
  <div class="info-card">
    <div class="info-card__title">{{ title }}</div>
    <div class="info-card__value">{{ value }}</div>
  </div>
</template>

<style scoped>
.info-card {
  padding: 18px;
  border-radius: 18px;
  border: 1px solid var(--border);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(245, 248, 255, 0.92));
}

.info-card__title {
  margin-bottom: 10px;
  color: var(--muted);
  font-size: 13px;
}

.info-card__value {
  color: var(--text);
  font-weight: 700;
  line-height: 1.7;
}
</style>
