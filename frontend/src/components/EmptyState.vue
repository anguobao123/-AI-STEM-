<script setup>
defineProps({
  title: String,
  description: String
});
</script>

<template>
  <div class="empty-state">
    <h3>{{ title }}</h3>
    <p>{{ description }}</p>
  </div>
</template>

<style scoped>
.empty-state {
  padding: 30px;
  border-radius: 18px;
  background: #f8fbff;
  border: 1px dashed #b8c9ec;
  text-align: center;
}

h3 {
  margin: 0 0 12px;
}

p {
  margin: 0;
  color: var(--muted);
}
</style>
