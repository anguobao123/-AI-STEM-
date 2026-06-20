<script setup>
defineProps({
  confusionMatrix: {
    type: Object,
    required: true
  }
});
</script>

<template>
  <div class="page-card">
    <h3>混淆矩阵</h3>
    <p class="intro">混淆矩阵用于观察哪些类别容易被模型混淆。</p>
    <div class="matrix-wrap">
      <table class="matrix-table">
        <thead>
          <tr>
            <th>真实 \ 预测</th>
            <th v-for="label in confusionMatrix.labels || []" :key="label">{{ label }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, rowIndex) in confusionMatrix.matrix || []" :key="confusionMatrix.labels?.[rowIndex] || rowIndex">
            <th>{{ confusionMatrix.labels?.[rowIndex] || "-" }}</th>
            <td
              v-for="(value, colIndex) in row"
              :key="`${rowIndex}-${colIndex}`"
              :class="{ diagonal: rowIndex === colIndex }"
            >
              {{ value }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
h3 {
  margin: 0 0 8px;
}

.intro {
  margin: 0 0 16px;
  color: var(--muted);
}

.matrix-wrap {
  overflow-x: auto;
}

.matrix-table {
  width: 100%;
  border-collapse: collapse;
}

.matrix-table th,
.matrix-table td {
  border: 1px solid var(--border);
  padding: 12px;
  text-align: center;
}

.matrix-table th {
  background: #f8fbff;
}

.diagonal {
  background: #dff7ea;
  color: var(--success);
  font-weight: 700;
}
</style>
