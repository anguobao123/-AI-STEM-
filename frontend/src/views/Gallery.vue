<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { getRecordList } from "../utils/api";
import { demoAchievements, getExperimentMeta } from "../utils/experimentContent";
import { formatDateTime, formatPercent, safeText } from "../utils/formatters";

const router = useRouter();
const loading = ref(true);
const error = ref("");
const records = ref([]);

const stats = computed(() => {
  const items = records.value;
  if (items.length === 0) {
    return { total: 0, avgAccuracy: null, optimizationCount: 0, uniqueClasses: 0 };
  }

  const accuracies = items
    .map((r) => (typeof r.accuracy === "number" && !Number.isNaN(r.accuracy) ? r.accuracy : null))
    .filter((v) => v !== null);
  const avgAccuracy = accuracies.length > 0 ? accuracies.reduce((a, b) => a + b, 0) / accuracies.length : null;

  const optimizationCount = items.filter(
    (r) => r.hasVersionCompare || (r.optimizationPlan && r.optimizationPlan.trim())
  ).length;

  const classSets = new Set();
  items.forEach((r) => {
    const names = r.classNames || [];
    names.forEach((n) => { if (n) classSets.add(n); });
  });

  return {
    total: items.length,
    avgAccuracy,
    optimizationCount,
    uniqueClasses: classSets.size
  };
});

const realAchievements = computed(() =>
  records.value.map((item) => {
    const meta = getExperimentMeta(item.experimentId);
    const classNames = item.classNames || [];
    const hasV2 = item.hasVersionCompare || (item.modelVersion && item.modelVersion >= 2);
    const planText = item.optimizationPlan || "";
    const reflectText = item.reflection || "";
    const stemData = item.stemSummary || {};

    return {
      id: `record-${item.recordId}`,
      recordId: item.recordId,
      sourceType: "record",
      sourceLabel: "真实实验",
      title: item.title || meta.title,
      experimentName: meta.shortName || meta.title,
      objective: item.objective || meta.objective || "",
      modelVersion: item.modelVersion || 0,
      accuracy: item.accuracy,
      testTotal: item.sampleCount || 0,
      errorCount: item.errorCount,
      classCount: item.classCount || classNames.length,
      classNames,
      hasVersionCompare: hasV2,
      optimizationPlan: planText ? (planText.length > 80 ? planText.slice(0, 80) + "..." : planText) : "",
      reflection: reflectText ? (reflectText.length > 80 ? reflectText.slice(0, 80) + "..." : reflectText) : "",
      stemSummary: stemData,
      savedAt: item.createdAt,
      analysisPath: `/analysis/${item.recordId}`,
      reportPath: `/report/${item.recordId}`
    };
  })
);

const demoAchievementCards = computed(() =>
  demoAchievements.map((item) => ({
    id: `demo-${item.reportId}-${item.title}`,
    recordId: item.reportId,
    sourceType: "demo",
    sourceLabel: "示例成果",
    title: item.title,
    experimentName: item.sourceExperiment,
    objective: item.modelNote || "",
    modelVersion: 0,
    accuracy: item.accuracy,
    testTotal: item.sampleCount || 0,
    errorCount: null,
    classCount: item.classCount || 0,
    classNames: item.classLabel ? item.classLabel.split(" / ") : [],
    hasVersionCompare: false,
    optimizationPlan: "",
    reflection: "",
    stemSummary: null,
    savedAt: "",
    analysisPath: `/analysis/${item.reportId}`,
    reportPath: `/report/${item.reportId}`
  }))
);

const hasRealRecords = computed(() => records.value.length > 0);

onMounted(async () => {
  try {
    const data = await getRecordList();
    records.value = data.items || [];
  } catch (err) {
    error.value = err.message || "课程成果加载失败，请检查后端服务是否已启动。";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <section class="gallery-page page-layout">
    <header class="page-heading">
      <div class="page-heading__copy">
        <span class="gallery-kicker">STEM 课程成果</span>
        <h1 class="page-title">课程成果展示</h1>
        <p class="page-subtitle">这里展示同学们完成的图像分类实验成果。真实成果来自已保存的实验记录，示例成果用于展示课程可能产出。</p>
      </div>
    </header>

    <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon />

    <div v-else-if="loading" class="workspace-shell">
      <div class="workspace-body">
        <el-skeleton :rows="6" animated />
      </div>
    </div>

    <template v-else>
      <!-- Stats summary bar -->
      <section class="stats-bar" v-if="stats.total > 0">
        <div class="stat-card">
          <span class="stat-value">{{ stats.total }}</span>
          <span class="stat-label">已保存成果</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ stats.avgAccuracy !== null ? formatPercent(stats.avgAccuracy) : "-" }}</span>
          <span class="stat-label">平均准确率</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ stats.optimizationCount }}</span>
          <span class="stat-label">含优化对比</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ stats.uniqueClasses || "-" }}</span>
          <span class="stat-label">分类类别总数</span>
        </div>
      </section>

      <!-- Real achievement cards -->
      <section class="achievement-section" v-if="hasRealRecords">
        <h2 class="section-title">真实实验成果</h2>
        <div class="achievement-grid">
          <article class="achievement-card" v-for="item in realAchievements" :key="item.id">
            <div class="card-header">
              <div class="card-title-row">
                <h3 class="card-title">{{ item.title }}</h3>
                <el-tag size="small" type="success">{{ item.sourceLabel }}</el-tag>
              </div>
              <span class="card-meta" v-if="item.savedAt">{{ formatDateTime(item.savedAt) }}</span>
              <span class="card-meta" v-else>-</span>
            </div>

            <div class="card-body">
              <p class="card-objective" v-if="item.objective">{{ item.objective }}</p>

              <div class="card-stats">
                <div class="card-stat">
                  <span class="card-stat-value">{{ formatPercent(item.accuracy) }}</span>
                  <span class="card-stat-label">准确率</span>
                </div>
                <div class="card-stat">
                  <span class="card-stat-value">{{ safeText(item.testTotal) }}</span>
                  <span class="card-stat-label">测试图片</span>
                </div>
                <div class="card-stat">
                  <span class="card-stat-value">{{ safeText(item.errorCount) }}</span>
                  <span class="card-stat-label">错误数量</span>
                </div>
                <div class="card-stat">
                  <span class="card-stat-value">{{ safeText(item.classCount) }}</span>
                  <span class="card-stat-label">分类类别</span>
                </div>
              </div>

              <div class="card-details">
                <div class="card-detail" v-if="item.modelVersion > 0">
                  <span class="detail-label">模型版本</span>
                  <el-tag size="small" type="warning">v{{ item.modelVersion }}</el-tag>
                </div>
                <div class="card-detail" v-if="item.hasVersionCompare">
                  <span class="detail-label">版本对比</span>
                  <el-tag size="small" type="primary">含模型 1.0 / 2.0 对比</el-tag>
                </div>
                <div class="card-detail" v-if="item.classNames.length > 0">
                  <span class="detail-label">分类任务</span>
                  <span class="detail-text">{{ item.classNames.join(" / ") }}</span>
                </div>
              </div>

              <div class="card-excerpt" v-if="item.optimizationPlan">
                <span class="excerpt-label">优化方案</span>
                <p class="excerpt-text">{{ item.optimizationPlan }}</p>
              </div>

              <div class="card-excerpt" v-if="item.reflection">
                <span class="excerpt-label">实验反思</span>
                <p class="excerpt-text">{{ item.reflection }}</p>
              </div>

              <div class="card-stem" v-if="item.stemSummary && Object.keys(item.stemSummary).length > 0">
                <span class="excerpt-label">STEM 亮点</span>
                <div class="stem-tags">
                  <el-tag
                    v-for="(val, key) in item.stemSummary"
                    :key="key"
                    size="small"
                    type="info"
                  >{{ key }}: {{ val }}</el-tag>
                </div>
              </div>
            </div>

            <div class="card-footer">
              <el-button @click="router.push(item.analysisPath)">查看分析</el-button>
              <el-button type="primary" plain @click="router.push(item.reportPath)">查看报告</el-button>
            </div>
          </article>
        </div>
      </section>

      <!-- Demo achievement cards -->
      <section class="achievement-section">
        <h2 class="section-title" v-if="hasRealRecords">示例成果</h2>
        <h2 class="section-title" v-else>示例成果</h2>
        <p class="section-desc" v-if="!hasRealRecords">暂无真实成果，请先完成一次实验并保存记录。以下为示例成果，展示课程可能的产出。</p>
        <p class="section-desc" v-else>以下为示例成果，用于展示课程可能产出，非真实实验记录。</p>

        <div class="achievement-grid">
          <article class="achievement-card achievement-card--demo" v-for="item in demoAchievementCards" :key="item.id">
            <div class="card-header">
              <div class="card-title-row">
                <h3 class="card-title">{{ item.title }}</h3>
                <el-tag size="small" type="info">{{ item.sourceLabel }}</el-tag>
              </div>
              <span class="card-meta">课程演示组</span>
            </div>

            <div class="card-body">
              <p class="card-objective" v-if="item.objective">{{ item.objective }}</p>

              <div class="card-stats">
                <div class="card-stat">
                  <span class="card-stat-value">{{ formatPercent(item.accuracy) }}</span>
                  <span class="card-stat-label">准确率</span>
                </div>
                <div class="card-stat">
                  <span class="card-stat-value">{{ safeText(item.testTotal) }}</span>
                  <span class="card-stat-label">样本数量</span>
                </div>
                <div class="card-stat">
                  <span class="card-stat-value">{{ safeText(item.classCount) }}</span>
                  <span class="card-stat-label">分类类别</span>
                </div>
              </div>

              <div class="card-details" v-if="item.classNames.length > 0">
                <div class="card-detail">
                  <span class="detail-label">分类任务</span>
                  <span class="detail-text">{{ item.classNames.join(" / ") }}</span>
                </div>
              </div>
            </div>

            <div class="card-footer">
              <el-button @click="router.push(item.analysisPath)">查看分析</el-button>
              <el-button type="primary" plain @click="router.push(item.reportPath)">查看报告</el-button>
            </div>
          </article>
        </div>
      </section>
    </template>
  </section>
</template>

<style scoped>
.gallery-kicker {
  color: var(--primary);
  font-size: 14px;
  font-weight: 800;
}

/* Stats bar */
.stats-bar {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 32px;
}

.stat-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-control);
  padding: 20px 16px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-value {
  font-size: 28px;
  font-weight: 800;
  color: var(--heading);
}

.stat-label {
  font-size: 13px;
  color: var(--muted);
  font-weight: 700;
}

/* Section headers */
.achievement-section {
  margin-bottom: 36px;
}

.section-title {
  font-size: 20px;
  font-weight: 800;
  color: var(--heading);
  margin: 0 0 8px 0;
}

.section-desc {
  color: var(--muted);
  font-size: 14px;
  margin: 0 0 20px 0;
}

/* Achievement grid */
.achievement-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 20px;
}

/* Achievement card */
.achievement-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-control);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  transition: box-shadow 0.2s;
}

.achievement-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.achievement-card--demo {
  border-style: dashed;
  opacity: 0.85;
}

.card-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.card-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.card-title {
  font-size: 16px;
  font-weight: 800;
  color: var(--heading);
  margin: 0;
  flex: 1;
}

.card-meta {
  font-size: 12px;
  color: var(--muted);
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
}

.card-objective {
  font-size: 13px;
  color: var(--muted);
  margin: 0;
  line-height: 1.6;
}

/* Card mini stats */
.card-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.card-stat {
  text-align: center;
  padding: 8px 4px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.card-stat-value {
  font-size: 18px;
  font-weight: 800;
  color: var(--heading);
}

.card-stat-label {
  font-size: 11px;
  color: var(--muted);
  font-weight: 700;
}

/* Card details */
.card-details {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.card-detail {
  display: flex;
  align-items: center;
  gap: 8px;
}

.detail-label {
  font-size: 12px;
  color: var(--muted);
  font-weight: 700;
  min-width: 64px;
}

.detail-text {
  font-size: 13px;
  color: var(--text);
}

/* Excerpts */
.card-excerpt {
  border-left: 3px solid var(--border);
  padding-left: 12px;
}

.excerpt-label {
  font-size: 12px;
  color: var(--muted);
  font-weight: 700;
  display: block;
  margin-bottom: 4px;
}

.excerpt-text {
  font-size: 13px;
  color: var(--text);
  margin: 0;
  line-height: 1.5;
}

/* STEM tags */
.card-stem {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stem-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

/* Card footer */
.card-footer {
  display: flex;
  gap: 10px;
  padding-top: 8px;
  border-top: 1px solid var(--border);
}

/* Responsive */
@media (max-width: 900px) {
  .stats-bar {
    grid-template-columns: repeat(2, 1fr);
  }

  .achievement-grid {
    grid-template-columns: 1fr;
  }

  .card-stats {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 560px) {
  .stats-bar {
    grid-template-columns: 1fr 1fr;
  }

  .card-footer {
    flex-direction: column;
  }
}
</style>