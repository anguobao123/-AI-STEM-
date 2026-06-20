<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { deleteRecord, getRecordList } from "../utils/api";
import { formatDateTime, formatPercent, safeText } from "../utils/formatters";
import { getExperimentMeta } from "../utils/experimentContent";
import { exportSavedRecordModel } from "../utils/modelExport";
import EmptyState from "../components/EmptyState.vue";

const router = useRouter();
const loading = ref(true);
const error = ref("");
const deletingId = ref(null);
const exportingModelId = ref(null);
const items = ref([]);
const keyword = ref("");
const experimentFilter = ref("");

const experimentOptions = computed(() => {
  const map = new Map();
  items.value.forEach((item) => {
    const meta = getExperimentMeta(item.experimentId);
    map.set(item.experimentId, meta.title);
  });
  return Array.from(map, ([id, title]) => ({ id, title }));
});

const filteredItems = computed(() => {
  const text = keyword.value.trim().toLowerCase();
  return items.value.filter((item) => {
    const meta = getExperimentMeta(item.experimentId);
    const matchesExperiment = !experimentFilter.value || item.experimentId === experimentFilter.value;
    const matchesKeyword = !text || `${item.title} ${meta.title} ${item.recordId}`.toLowerCase().includes(text);
    return matchesExperiment && matchesKeyword;
  });
});

async function loadRecords() {
  loading.value = true;
  try {
    const data = await getRecordList();
    items.value = data.items || [];
  } catch (err) {
    error.value = err.message || "实验记录加载失败。";
  } finally {
    loading.value = false;
  }
}

async function handleDelete(record) {
  try {
    await ElMessageBox.confirm(`确认删除记录 ${record.recordId} 吗？此操作不可撤销。`, "删除确认", {
      type: "warning",
      confirmButtonText: "确认删除",
      cancelButtonText: "取消"
    });
  } catch {
    return;
  }

  deletingId.value = record.recordId;
  try {
    await deleteRecord(record.recordId);
    ElMessage.success("记录已删除");
    await loadRecords();
  } catch (err) {
    ElMessage.error(err.message || "删除记录失败");
  } finally {
    deletingId.value = null;
  }
}

async function handleExportModel(record) {
  if (!record.hasLocalModel) {
    ElMessage.warning("当前记录没有可导出的本机模型。");
    return;
  }

  exportingModelId.value = record.recordId;
  try {
    await exportSavedRecordModel(record.recordId, record);
    ElMessage.success("模型导出已开始，请查看浏览器下载列表。");
  } catch (err) {
    ElMessage.error(err.message || "模型导出失败");
  } finally {
    exportingModelId.value = null;
  }
}

onMounted(loadRecords);
</script>

<template>
  <section class="record-page page-layout">
    <header class="page-heading">
      <div class="page-heading__copy">
        <span class="record-kicker">记录中心</span>
        <h1 class="page-title">实验记录列表</h1>
      </div>
      <el-button plain @click="router.push('/model-import')">导入模型测试</el-button>
      <p class="page-subtitle">按行查看每次实验的结果、保存时间和分析报告入口。</p>
    </header>

    <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon />
    <div v-else-if="loading" class="workspace-shell"><div class="workspace-body"><el-skeleton :rows="8" animated /></div></div>
    <EmptyState
      v-else-if="items.length === 0"
      title="暂无实验记录"
      description="请先完成一次图像分类实验并保存记录。"
    />

    <section v-else class="workspace-shell">
      <div class="workspace-toolbar record-toolbar">
        <div class="filter-group">
          <input v-model="keyword" class="filter-input" type="search" placeholder="搜索记录名称或编号" />
          <select v-model="experimentFilter" class="filter-input">
            <option value="">全部实验</option>
            <option v-for="option in experimentOptions" :key="option.id" :value="option.id">{{ option.title }}</option>
          </select>
        </div>
        <span class="record-count">{{ filteredItems.length }} 条记录</span>
      </div>

      <div class="workspace-body">
        <div class="decision-table record-table">
          <div class="decision-table__row decision-table__row--head record-row">
            <span>实验名称</span>
            <span>准确率</span>
            <span>样本数</span>
            <span>错误数</span>
            <span>保存时间</span>
            <span>状态</span>
            <span>本机模型</span>
            <span>操作</span>
          </div>

          <div v-if="filteredItems.length === 0" class="record-empty">没有符合筛选条件的记录。</div>

          <div class="decision-table__row record-row" v-for="row in filteredItems" :key="row.recordId">
            <div class="record-name" data-label="实验名称">
              <strong>{{ row.title }}</strong>
              <small>{{ getExperimentMeta(row.experimentId).title }}</small>
            </div>
            <span data-label="准确率">{{ formatPercent(row.accuracy) }}</span>
            <span data-label="样本数">{{ safeText(row.sampleCount) }}</span>
            <span data-label="错误数">{{ safeText(row.errorCount) }}</span>
            <span data-label="保存时间">{{ formatDateTime(row.createdAt) }}</span>
            <span data-label="状态"><el-tag type="success">已保存</el-tag></span>
            <span data-label="本机模型">
              <el-tag :type="row.hasLocalModel ? 'success' : 'info'">
                {{ row.hasLocalModel ? "已保存" : "未保存" }}
              </el-tag>
            </span>
            <div class="record-actions" data-label="操作">
              <el-button @click="router.push(`/analysis/${row.recordId}`)">查看分析</el-button>
              <el-button type="primary" plain @click="router.push(`/report/${row.recordId}`)">查看报告</el-button>
              <el-button
                plain
                :disabled="!row.hasLocalModel"
                :loading="exportingModelId === row.recordId"
                @click="handleExportModel(row)"
              >
                导出模型
              </el-button>
              <el-button type="danger" :loading="deletingId === row.recordId" @click="handleDelete(row)">删除</el-button>
            </div>
          </div>
        </div>
      </div>
    </section>
  </section>
</template>

<style scoped>
.record-kicker {
  color: var(--primary);
  font-size: 14px;
  font-weight: 800;
}

.record-toolbar,
.filter-group,
.record-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}

.filter-group {
  flex: 1 1 auto;
}

.filter-input {
  min-height: 36px;
  min-width: 220px;
  padding: 0 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-control);
  background: var(--surface);
  color: var(--text);
}

.record-count {
  color: var(--muted);
  font-size: 13px;
  font-weight: 800;
}

.record-row {
  grid-template-columns: minmax(200px, 1.15fr) minmax(86px, 0.45fr) minmax(70px, 0.38fr) minmax(70px, 0.38fr) minmax(145px, 0.7fr) minmax(82px, 0.38fr) minmax(96px, 0.46fr) minmax(320px, 1.45fr);
}

.record-name {
  display: grid;
  gap: 4px;
}

.record-name strong {
  color: var(--heading);
}

.record-name small {
  color: var(--muted);
}

.record-empty {
  padding: 28px;
  color: var(--muted);
  text-align: center;
}

@media (max-width: 1100px) {
  .decision-table__row--head {
    display: none;
  }

  .record-row {
    grid-template-columns: 1fr;
  }

  .record-row > *::before {
    content: attr(data-label);
    display: block;
    margin-bottom: 4px;
    color: var(--muted);
    font-size: 12px;
    font-weight: 800;
  }

  .record-actions {
    align-items: stretch;
  }
}
</style>
