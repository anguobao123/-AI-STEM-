<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { getCommunityShare } from "../utils/api";
import { formatDateTime, formatPercent, safeText } from "../utils/formatters";
import EmptyState from "../components/EmptyState.vue";

const route = useRoute();
const router = useRouter();
const loading = ref(true);
const error = ref("");
const share = ref(null);

const report = computed(() => share.value?.reportSnapshot || {});
const reportSummary = computed(() => report.value?.summary || share.value?.summary || {});
const datasetClasses = computed(() => report.value?.datasetSummary?.classes || []);
const suggestions = computed(() => report.value?.suggestions || []);
const modelMetadata = computed(() => share.value?.modelMetadata || {});

async function loadShare() {
  loading.value = true;
  error.value = "";
  try {
    share.value = await getCommunityShare(route.params.shareId);
  } catch (err) {
    error.value = err.message || "社区成果详情加载失败。";
  } finally {
    loading.value = false;
  }
}

onMounted(loadShare);
</script>

<template>
  <section class="community-detail-page page-layout">
    <header class="page-heading">
      <div class="page-heading__copy">
        <span class="community-kicker">社区成果详情</span>
        <h1 class="page-title">{{ share?.title || "社区成果" }}</h1>
        <p class="page-subtitle">查看同学发布的实验摘要、报告快照和模型元数据说明。</p>
      </div>
      <div class="detail-actions">
        <el-button plain @click="router.push('/community')">返回社区</el-button>
        <el-button plain @click="router.push('/gallery')">成果库</el-button>
      </div>
    </header>

    <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon />
    <div v-else-if="loading" class="workspace-shell"><div class="workspace-body"><el-skeleton :rows="10" animated /></div></div>
    <EmptyState v-else-if="!share" title="未找到社区成果" description="该分享可能已不存在。" />

    <template v-else>
      <section class="summary-strip">
        <div>
          <span>来源实验</span>
          <strong>{{ safeText(share.experimentTitle) }}</strong>
        </div>
        <div>
          <span>测试准确率</span>
          <strong>{{ formatPercent(share.accuracy) }}</strong>
        </div>
        <div>
          <span>类别数量</span>
          <strong>{{ safeText(share.classCount) }}</strong>
        </div>
        <div>
          <span>样本数量</span>
          <strong>{{ safeText(share.sampleCount) }}</strong>
        </div>
        <div>
          <span>发布时间</span>
          <strong>{{ formatDateTime(share.createdAt) }}</strong>
        </div>
      </section>

      <section class="detail-layout">
        <main class="detail-main">
          <div class="workspace-shell">
            <div class="workspace-toolbar">
              <strong>报告快照</strong>
              <span class="community-note">{{ report.privacyNote || "社区分享不包含原始训练图片。" }}</span>
            </div>
            <div class="workspace-body report-snapshot">
              <div>
                <span>实验目标</span>
                <p>{{ safeText(report.objective) }}</p>
              </div>
              <div class="metric-grid">
                <div>
                  <span>训练准确率</span>
                  <strong>{{ formatPercent(reportSummary.accuracy) }}</strong>
                </div>
                <div>
                  <span>测试准确率</span>
                  <strong>{{ formatPercent(reportSummary.testAccuracy ?? share.accuracy) }}</strong>
                </div>
                <div>
                  <span>损失值</span>
                  <strong>{{ safeText(reportSummary.loss) }}</strong>
                </div>
                <div>
                  <span>错误数</span>
                  <strong>{{ safeText(reportSummary.errorCount) }}</strong>
                </div>
              </div>
              <div v-if="suggestions.length">
                <span>改进建议</span>
                <ul class="snapshot-list">
                  <li v-for="item in suggestions" :key="item">{{ item }}</li>
                </ul>
              </div>
            </div>
          </div>

          <div class="workspace-shell">
            <div class="workspace-toolbar"><strong>数据集摘要</strong></div>
            <div class="workspace-body">
              <div v-if="datasetClasses.length" class="class-grid">
                <div v-for="item in datasetClasses" :key="item.name">
                  <span>{{ item.name }}</span>
                  <strong>{{ safeText(item.imageCount ?? item.total ?? item.trainCount) }}</strong>
                </div>
              </div>
              <p v-else class="community-muted">该分享没有保存类别明细。</p>
            </div>
          </div>
        </main>

        <aside class="workspace-shell model-panel">
          <div class="workspace-toolbar">
            <strong>模型可用性</strong>
            <el-tag :type="share.modelIncluded ? 'success' : 'info'">{{ share.modelIncluded ? "含模型元数据" : "无模型" }}</el-tag>
          </div>
          <div class="workspace-body model-body">
            <p v-if="share.modelIncluded">{{ modelMetadata.availabilityNote || "模型文件不会自动同步到社区，需后续模型上传/导出支持。" }}</p>
            <p v-else>该社区成果只分享实验报告快照，没有附带模型元数据。</p>
            <div v-if="share.modelIncluded" class="model-meta">
              <div>
                <span>存储方式</span>
                <strong>{{ safeText(modelMetadata.storage) }}</strong>
              </div>
              <div>
                <span>图片尺寸</span>
                <strong>{{ safeText(modelMetadata.imageSize) }}</strong>
              </div>
              <div>
                <span>类别</span>
                <strong>{{ Array.isArray(modelMetadata.classNames) ? modelMetadata.classNames.join(" / ") : "-" }}</strong>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </template>
  </section>
</template>

<style scoped>
.community-kicker,
.community-note {
  color: var(--primary);
  font-size: 13px;
  font-weight: 800;
}

.detail-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.summary-strip {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
}

.summary-strip div,
.metric-grid div,
.class-grid div,
.model-meta div {
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  background: var(--surface);
  display: grid;
  gap: 5px;
}

.summary-strip span,
.report-snapshot span,
.metric-grid span,
.class-grid span,
.model-meta span {
  color: var(--muted);
  font-size: 12px;
  font-weight: 800;
}

.summary-strip strong,
.metric-grid strong,
.class-grid strong,
.model-meta strong {
  color: var(--heading);
}

.detail-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 16px;
  align-items: start;
}

.detail-main,
.report-snapshot,
.model-body {
  display: grid;
  gap: 14px;
}

.report-snapshot p,
.model-body p,
.community-muted,
.snapshot-list {
  margin: 0;
  color: var(--muted);
  line-height: 1.7;
}

.metric-grid,
.class-grid,
.model-meta {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.class-grid {
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
}

.model-meta {
  grid-template-columns: 1fr;
}

.snapshot-list {
  padding-left: 18px;
}

@media (max-width: 960px) {
  .summary-strip,
  .detail-layout,
  .metric-grid {
    grid-template-columns: 1fr;
  }
}
</style>
