<script setup>
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { getCommunityShares } from "../utils/api";
import { formatDateTime, formatPercent, safeText } from "../utils/formatters";
import EmptyState from "../components/EmptyState.vue";

const router = useRouter();
const loading = ref(true);
const error = ref("");
const items = ref([]);

async function loadShares() {
  loading.value = true;
  error.value = "";
  try {
    const data = await getCommunityShares();
    items.value = data.items || [];
  } catch (err) {
    error.value = err.message || "社区成果加载失败。";
  } finally {
    loading.value = false;
  }
}

onMounted(loadShares);
</script>

<template>
  <section class="community-page page-layout">
    <header class="page-heading">
      <div class="page-heading__copy">
        <span class="community-kicker">社区学习</span>
        <h1 class="page-title">社区成果分享</h1>
        <p class="page-subtitle">浏览同学发布的实验成果、报告快照和模型元数据。社区分享不包含原始训练图片。</p>
      </div>
      <div class="community-heading__actions">
        <el-button plain @click="router.push('/gallery')">返回成果库</el-button>
      </div>
    </header>

    <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon />
    <div v-else-if="loading" class="workspace-shell"><div class="workspace-body"><el-skeleton :rows="8" animated /></div></div>
    <EmptyState v-else-if="items.length === 0" title="暂无社区分享" description="可以先在成果页选择自己的实验成果发布到社区。" />

    <section v-else class="workspace-shell">
      <div class="workspace-toolbar">
        <strong>社区成果列表</strong>
        <span class="community-note">{{ items.length }} 条分享</span>
      </div>
      <div class="workspace-body">
        <div class="decision-table community-table">
          <div class="decision-table__row decision-table__row--head community-row">
            <span>成果名称</span>
            <span>来源实验</span>
            <span>类别</span>
            <span>样本</span>
            <span>准确率</span>
            <span>模型</span>
            <span>发布时间</span>
            <span>操作</span>
          </div>

          <div class="decision-table__row community-row" v-for="item in items" :key="item.shareId">
            <div class="community-title" data-label="成果名称">
              <strong>{{ item.title }}</strong>
              <small>#{{ item.shareId }} / 记录 #{{ item.recordId }}</small>
            </div>
            <span data-label="来源实验">{{ safeText(item.experimentTitle) }}</span>
            <span data-label="类别">{{ safeText(item.classCount) }}</span>
            <span data-label="样本">{{ safeText(item.sampleCount) }}</span>
            <span data-label="准确率">{{ formatPercent(item.accuracy) }}</span>
            <span data-label="模型" class="model-note">
              <el-tag :type="item.modelIncluded ? 'success' : 'info'">{{ item.modelIncluded ? "含元数据" : "无模型" }}</el-tag>
              <small v-if="item.modelIncluded">{{ item.modelMetadata?.availabilityNote || "模型文件不会自动同步到社区" }}</small>
            </span>
            <span data-label="发布时间">{{ formatDateTime(item.createdAt) }}</span>
            <div class="community-actions" data-label="操作">
              <el-button type="primary" plain @click="router.push(`/community/${item.shareId}`)">查看详情</el-button>
              <el-button plain @click="router.push(`/community/${item.shareId}`)">查看报告快照</el-button>
            </div>
          </div>
        </div>
      </div>
    </section>
  </section>
</template>

<style scoped>
.community-kicker,
.community-note {
  color: var(--primary);
  font-size: 13px;
  font-weight: 800;
}

.community-heading__actions,
.community-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.community-row {
  grid-template-columns: minmax(200px, 1.05fr) minmax(170px, 0.9fr) minmax(70px, 0.35fr) minmax(70px, 0.35fr) minmax(90px, 0.42fr) minmax(150px, 0.8fr) minmax(150px, 0.75fr) minmax(190px, 0.9fr);
}

.community-title,
.model-note {
  display: grid;
  gap: 5px;
}

.community-title strong {
  color: var(--heading);
}

.community-title small,
.model-note small,
.community-row > span {
  color: var(--muted);
}

.model-note small {
  font-size: 12px;
  line-height: 1.4;
}

@media (max-width: 1100px) {
  .decision-table__row--head {
    display: none;
  }

  .community-row {
    grid-template-columns: 1fr;
  }

  .community-row > *::before {
    content: attr(data-label);
    display: block;
    margin-bottom: 4px;
    color: var(--muted);
    font-size: 12px;
    font-weight: 800;
  }
}
</style>
