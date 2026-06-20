<script setup>
defineProps({
  datasetSummary: {
    type: Object,
    required: true
  }
});
</script>

<template>
  <div class="page-card">
    <div class="summary-head">
      <div>
        <h3>数据集摘要</h3>
        <p>类别数量：{{ datasetSummary.classCount ?? "-" }}，总图片数：{{ datasetSummary.totalImages ?? "-" }}</p>
      </div>
    </div>
    <el-table :data="datasetSummary.classes || []" stripe style="margin-top: 16px; width: 100%">
      <el-table-column prop="name" label="类别名称" />
      <el-table-column prop="imageCount" label="图片总数" />
      <el-table-column prop="trainCount" label="训练集" />
      <el-table-column prop="valCount" label="验证集" />
    </el-table>
  </div>
</template>

<style scoped>
h3 {
  margin: 0 0 8px;
}

p {
  margin: 0;
  color: var(--muted);
}
</style>
