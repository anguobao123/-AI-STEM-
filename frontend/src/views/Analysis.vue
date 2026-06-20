<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { getDemoRecord, getRecord } from "../utils/api";
import { getExperimentMeta } from "../utils/experimentContent";
import { formatLoss, formatPercent, safeText } from "../utils/formatters";
import EmptyState from "../components/EmptyState.vue";
import TrainingCurve from "../components/TrainingCurve.vue";
import ConfusionMatrix from "../components/ConfusionMatrix.vue";

const route = useRoute();
const loading = ref(true);
const error = ref("");
const record = ref(null);
const sourceInfo = ref({
  type: "info",
  label: "演示记录",
  note: "当前展示的是演示数据。"
});

const meta = computed(() => getExperimentMeta(record.value?.experimentId));
const summary = computed(() => record.value?.summary || {});
const classMetrics = computed(() => summary.value.classMetrics || []);
const errorSamples = computed(() => record.value?.errorSamples || []);
const modelVersion = computed(() => record.value?.modelVersion ?? 0);
const versionLabel = computed(() => formatModelVersionLabel(modelVersion.value, "模型 1.0"));
const optimizationPlan = computed(() => record.value?.optimizationPlan || '');
const reflection = computed(() => record.value?.reflection || '');
const versionCompare = computed(() => record.value?.versionCompare || []);
const stemSummary = computed(() => record.value?.stemSummary || {});
const datasetSummary = computed(() => record.value?.datasetSummary || {});
const trainConfig = computed(() => record.value?.trainConfig || {});
const experimentLog = computed(() => record.value?.experimentLog || []);
const summaryRows = computed(() => [
  { label: "测试准确率", value: formatPercent(summary.value.testAccuracy ?? summary.value.accuracy) },
  { label: "测试样本数", value: safeText(summary.value.testCount ?? summary.value.sampleCount) },
  { label: "正确数量", value: safeText(summary.value.testCorrectCount) },
  { label: "错误数量", value: safeText(summary.value.errorCount) },
  { label: "类别数量", value: safeText(summary.value.classCount) },
  { label: "损失值", value: formatLoss(summary.value.loss) }
]);
const experimentConclusion = computed(() => {
  const accuracy = formatPercent(summary.value.testAccuracy ?? summary.value.accuracy);
  const errorCount = safeText(summary.value.errorCount);
  return `本次实验中，模型准确率为 ${accuracy}。结果说明当前数据集和训练配置已经能够完成基本分类任务，但仍存在 ${errorCount} 个错误样本，建议继续补充样本并重点检查易混淆类别。`;
});
const nextStepSuggestion = computed(() => {
  const accuracy = summary.value.testAccuracy ?? summary.value.accuracy;
  if (typeof accuracy === "number" && accuracy < 0.7) {
    return "下一步优先优化数据：补充清晰样本、减少背景干扰，并重新训练模型 2.0。";
  }
  if (errorSamples.value.length) {
    return "下一步围绕错误样本优化：找出最容易混淆的类别，补充更有区分度的训练图。";
  }
  return "下一步增加独立测试图片，确认模型在新图片上依然稳定。";
});

function formatModelVersionLabel(version, fallback = "优化后模型") {
  const value = Number(version);
  if (Number.isNaN(value)) return fallback;
  if (value <= 0) return "模型 1.0";
  if (value === 1) return "模型 2.0";
  return "优化后模型";
}

function formatVersionCompareTitle(item = {}) {
  return `${formatModelVersionLabel(item.fromVersion, "模型 1.0")} → ${formatModelVersionLabel(item.toVersion, "优化后模型")}`;
}

async function loadRecord(recordId) {
  try {
    record.value = await getRecord(recordId);
    sourceInfo.value = {
      type: "success",
      label: "真实实验记录",
      note: "当前展示的是已保存的实验记录。"
    };
  } catch {
    record.value = await getDemoRecord(recordId);
    sourceInfo.value = {
      type: "info",
      label: "演示记录",
      note: "未找到真实记录时，已回退到演示数据。"
    };
  }
}

onMounted(async () => {
  try {
    await loadRecord(route.params.recordId);
  } catch (err) {
    error.value = err.message || "实验记录加载失败。";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <section class="analysis-page page-layout">
    <header class="page-heading">
      <div class="page-heading__copy">
        <span class="analysis-kicker">记录编号：{{ route.params.recordId }}</span>
        <h1 class="page-title">实验分析报告</h1>
        <p class="page-subtitle">按摘要、图表、结论建议和错误样本表组织本次实验分析。</p>
      </div>
      <div class="source-indicator">
        <el-tag :type="sourceInfo.type">{{ sourceInfo.label }}</el-tag>
        <small>{{ sourceInfo.note }}</small>
      </div>
    </header>

    <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon />
    <div v-else-if="loading" class="workspace-shell"><div class="workspace-body"><el-skeleton :rows="8" animated /></div></div>
    <EmptyState v-else-if="!record" title="暂无实验记录" description="当前记录接口没有返回可展示的数据。" />

    <template v-else>
      <section class="summary-strip">
        <div class="summary-main">
          <span>实验名称</span>
          <strong>{{ safeText(record.projectName || record.title) }}</strong>
          <small>{{ record.groupName || "未填写小组" }}{{ record.authorName ? ' / ' + record.authorName : '' }}</small>
          <small>{{ record.objective || meta.question }}</small>
        </div>
        <div class="summary-metrics">
          <div v-for="item in summaryRows" :key="item.label">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </div>
        </div>
      </section>

      <section class="analysis-brief-grid">
        <div class="workspace-shell">
          <div class="workspace-toolbar"><strong>项目信息摘要</strong></div>
          <div class="workspace-body insight-body">
            <div><span>实验假设</span><p>{{ record.hypothesis || "未填写实验假设" }}</p></div>
            <div><span>控制变量</span><p>{{ record.variableType || meta.controlVariable }}；{{ record.variableDescription || "未填写变量说明" }}</p></div>
            <div><span>控制条件</span><p>{{ record.controlledConditions || meta.constants || "未填写控制条件" }}</p></div>
            <div><span>预期变化</span><p>{{ record.expectedChange || "未填写预期变化" }}</p></div>
          </div>
        </div>
        <div class="workspace-shell">
          <div class="workspace-toolbar"><strong>数据集摘要</strong></div>
          <div class="workspace-body insight-body">
            <div><span>类别数量</span><p>{{ safeText(datasetSummary.classCount ?? summary.classCount) }}</p></div>
            <div><span>样本数量</span><p>{{ safeText(datasetSummary.totalImages ?? summary.sampleCount) }}</p></div>
            <div><span>数据集说明</span><p>{{ record.datasetNote || "未填写数据集说明" }}</p></div>
            <div><span>训练参数</span><p>epochs {{ safeText(trainConfig.epochs) }}，batchSize {{ safeText(trainConfig.batchSize) }}，learningRate {{ safeText(trainConfig.learningRate) }}</p></div>
          </div>
        </div>
      </section>

      <section class="analysis-layout">
        <main class="chart-zone">
          <div class="workspace-shell chart-shell">
            <div class="workspace-toolbar"><strong>图表区</strong><span>训练曲线 / 混淆矩阵</span></div>
            <div class="workspace-body chart-stack">
              <TrainingCurve v-if="record.chartData" :chart-data="record.chartData" />
              <ConfusionMatrix v-if="record.confusionMatrix" :confusion-matrix="record.confusionMatrix" />
            </div>
          </div>

          <div class="workspace-shell">
            <div class="workspace-toolbar"><strong>各类别准确率</strong></div>
            <div class="workspace-body">
              <el-table v-if="classMetrics.length" :data="classMetrics" stripe style="width: 100%">
                <el-table-column prop="className" label="类别" min-width="140" />
                <el-table-column prop="total" label="测试数量" width="100" />
                <el-table-column prop="correct" label="正确数量" width="100" />
                <el-table-column label="准确率" width="120">
                  <template #default="{ row }">{{ formatPercent(row.accuracy) }}</template>
                </el-table-column>
              </el-table>
              <p v-else class="page-subtitle">当前记录没有保存各类别测试指标。</p>
            </div>
          </div>
        </main>

        <aside class="insight-panel">
          <div class="workspace-shell">
            <div class="workspace-toolbar"><strong>结论、诊断和下一步</strong></div>
            <div class="workspace-body insight-body">
              <div>
                <span>控制变量</span>
                <strong>{{ meta.controlVariable }}</strong>
              </div>
              <div>
                <span>保持不变</span>
                <p>{{ meta.constants }}</p>
              </div>
              <div>
                <span>实验结论</span>
                <p>{{ experimentConclusion }}</p>
              </div>
              <div>
                <span>下一步优化建议</span>
                <p>{{ nextStepSuggestion }}</p>
              </div>
            </div>
          </div>
        </aside>
      </section>


          <div v-if="optimizationPlan" class="workspace-shell">
            <div class="workspace-toolbar"><strong>{{ versionLabel }} 优化方案</strong></div>
            <div class="workspace-body insight-body">
              <p>{{ optimizationPlan }}</p>
            </div>
          </div>

          <div v-if="reflection" class="workspace-shell">
            <div class="workspace-toolbar"><strong>实验反思</strong></div>
            <div class="workspace-body insight-body">
              <p>{{ reflection }}</p>
            </div>
          </div>

          <div v-if="versionCompare.length" class="workspace-shell">
            <div class="workspace-toolbar"><strong>模型版本对比</strong></div>
            <div class="workspace-body insight-body">
              <div v-for="(item, idx) in versionCompare" :key="idx">
                <span>{{ formatVersionCompareTitle(item) }}</span>
                <p>优化措施：{{ item.plan || '未记录' }}</p>
              </div>
            </div>
          </div>

          <div v-if="stemSummary.science" class="workspace-shell">
            <div class="workspace-toolbar"><strong>STEM 证据摘要</strong></div>
            <div class="workspace-body insight-body">
              <div><span>S 科学探究</span><p>{{ stemSummary.science }}</p></div>
              <div><span>T 技术实现</span><p>{{ stemSummary.tech }}</p></div>
              <div><span>E 工程优化</span><p>{{ stemSummary.engineering }}</p></div>
              <div><span>M 数学分析</span><p>{{ stemSummary.math }}</p></div>
            </div>
          </div>      <section class="workspace-shell">
        <div class="workspace-toolbar"><strong>错误样本分析</strong><span>错误不是失败，是模型 2.0 的优化依据。</span></div>
        <div class="workspace-body">
          <el-table v-if="errorSamples.length" :data="errorSamples" stripe style="width: 100%">
            <el-table-column prop="imageName" label="样本" min-width="160" />
            <el-table-column label="真实类别" min-width="120">
              <template #default="{ row }">{{ safeText(row.trueLabel) }}</template>
            </el-table-column>
            <el-table-column label="预测类别" min-width="120">
              <template #default="{ row }">{{ safeText(row.predictedLabel) }}</template>
            </el-table-column>
            <el-table-column label="置信度" width="110">
              <template #default="{ row }">{{ formatPercent(row.confidence) }}</template>
            </el-table-column>
            <el-table-column label="可能原因" min-width="220">
              <template #default="{ row }">{{ safeText(row.reason) }}</template>
            </el-table-column>
          </el-table>
          <p v-else class="page-subtitle">当前记录没有错误样本。</p>
        </div>
      </section>
    </template>
      <!-- 实验过程摘要 -->
    <section v-if="record && experimentLog.length" class="analysis-section">
      <h3>实验过程摘要</h3>
      <div class="log-mini">
        <div v-for="(entry, i) in experimentLog.slice(-8)" :key="i" class="log-mini-entry">
          <span class="log-mini-time">{{ new Date(entry.time).toLocaleTimeString("zh-CN") }}</span>
          <span>{{ entry.action || entry.event }}</span>
          <span v-if="entry.detail" class="log-mini-detail">- {{ entry.detail }}</span>
        </div>
      </div>
    </section>

    <!-- 实验留痕文本 -->
    <section v-if="record && (record.optimizationPlan || record.reflection || record.conclusion)" class="analysis-section">
      <h3>实验留痕文本</h3>
      <div v-if="record.optimizationPlan" class="analysis-text-block">
        <strong>优化方案</strong>{{ record.optimizationPlan }}
      </div>
      <div v-if="record.reflection" class="analysis-text-block">
        <strong>实验反思</strong>{{ record.reflection }}
      </div>
      <div v-if="record.conclusion" class="analysis-text-block">
        <strong>实验结论</strong>{{ record.conclusion }}
      </div>
    </section>
  </section>
</template>

<style scoped>
.analysis-kicker {
  color: var(--primary);
  font-size: 14px;
  font-weight: 800;
}

.source-indicator {
  display: grid;
  justify-items: end;
  gap: 6px;
  text-align: right;
}

.source-indicator small {
  max-width: 220px;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.4;
}

.summary-strip {
  display: grid;
  grid-template-columns: minmax(240px, 0.8fr) minmax(0, 1.2fr);
  gap: 14px;
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  background: var(--surface);
}

.summary-main {
  display: grid;
  gap: 5px;
  align-content: center;
}

.summary-main span,
.summary-main small,
.summary-metrics span,
.insight-body span {
  color: var(--muted);
  font-size: 13px;
  font-weight: 800;
}

.summary-main strong {
  color: var(--heading);
  font-size: 20px;
}

.summary-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.summary-metrics div {
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  background: var(--surface-alt);
  display: grid;
  gap: 4px;
}

.summary-metrics strong {
  color: var(--heading);
}

.analysis-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 330px;
  gap: 16px;
  align-items: start;
}

.analysis-brief-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.chart-zone,
.chart-stack,
.insight-body {
  display: grid;
  gap: 16px;
}

.chart-shell :deep(.page-card) {
  box-shadow: none;
}

.insight-panel {
  position: sticky;
  top: 82px;
}

.insight-body > div {
  display: grid;
  gap: 6px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}

.insight-body > div:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}

.insight-body strong {
  color: var(--heading);
}

.insight-body p {
  margin: 0;
  color: var(--muted);
  line-height: 1.75;
}

@media (max-width: 960px) {
  .summary-strip,
  .analysis-layout,
  .analysis-brief-grid {
    grid-template-columns: 1fr;
  }

  .source-indicator {
    justify-items: start;
    text-align: left;
  }

  .summary-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .insight-panel {
    position: static;
  }
}

@media (max-width: 560px) {
  .summary-metrics {
    grid-template-columns: 1fr;
  }
}
.log-mini { display: flex; flex-direction: column; gap: 6px; padding: 12px; background: var(--surface-alt); border-radius: var(--radius-control); }
.log-mini-entry { display: flex; gap: 8px; font-size: 13px; align-items: baseline; }
.log-mini-time { color: var(--muted); font-size: 12px; min-width: 70px; }
.log-mini-detail { color: var(--muted); font-size: 12px; }
.analysis-text-block { padding: 10px 14px; background: var(--surface-alt); border-radius: var(--radius-control); font-size: 13px; line-height: 1.7; color: var(--text); }
.analysis-text-block strong { color: var(--heading); display: block; margin-bottom: 4px; }
</style>
