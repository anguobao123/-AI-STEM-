<script setup>
import * as echarts from "echarts";
import { onBeforeUnmount, onMounted, ref, watch } from "vue";

const props = defineProps({
  chartData: {
    type: Object,
    required: true
  }
});

const accuracyRef = ref(null);
const lossRef = ref(null);
let accuracyChart;
let lossChart;

function buildOption(title, xAxisData, series) {
  return {
    title: { text: title, left: "center", textStyle: { fontSize: 14 } },
    tooltip: { trigger: "axis" },
    legend: { top: 28 },
    grid: { left: 40, right: 20, top: 70, bottom: 30 },
    xAxis: {
      type: "category",
      data: xAxisData
    },
    yAxis: {
      type: "value"
    },
    series
  };
}

function renderCharts() {
  if (!accuracyRef.value || !lossRef.value || !props.chartData) {
    return;
  }

  accuracyChart ??= echarts.init(accuracyRef.value);
  lossChart ??= echarts.init(lossRef.value);

  accuracyChart.setOption(
    buildOption("准确率曲线", props.chartData.epochs || [], [
      { name: "accuracy", type: "line", smooth: true, data: props.chartData.accuracy || [] },
      { name: "valAccuracy", type: "line", smooth: true, data: props.chartData.valAccuracy || [] }
    ])
  );

  lossChart.setOption(
    buildOption("损失值曲线", props.chartData.epochs || [], [
      { name: "loss", type: "line", smooth: true, data: props.chartData.loss || [] },
      { name: "valLoss", type: "line", smooth: true, data: props.chartData.valLoss || [] }
    ])
  );
}

onMounted(() => {
  renderCharts();
  window.addEventListener("resize", renderCharts);
});

watch(() => props.chartData, renderCharts, { deep: true });

onBeforeUnmount(() => {
  window.removeEventListener("resize", renderCharts);
  accuracyChart?.dispose();
  lossChart?.dispose();
});
</script>

<template>
  <div class="grid grid-2">
    <div class="page-card">
      <div ref="accuracyRef" class="chart-box"></div>
    </div>
    <div class="page-card">
      <div ref="lossRef" class="chart-box"></div>
    </div>
  </div>
</template>

<style scoped>
.chart-box {
  width: 100%;
  height: 320px;
}
</style>
