<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { createCommunityShare, getRecordList } from "../utils/api";
import { demoAchievements, getExperimentMeta } from "../utils/experimentContent";
import { formatDateTime, formatPercent, safeText } from "../utils/formatters";
import { exportSavedRecordModel } from "../utils/modelExport";

const router = useRouter();
const loading = ref(true);
const error = ref("");
const records = ref([]);
const exportingModelId = ref(null);
const sharingId = ref(null);

const myAchievements = computed(() =>
  records.value.map((item) => {
    const meta = getExperimentMeta(item.experimentId);
    const hasModel = item.hasLocalModel === true || Boolean(item.modelKey);
    const classCount = item.classCount || item.classNames?.length || 0;
    return {
      id: `record-${item.recordId}`,
      recordId: item.recordId,
      sourceType: "mine",
      sourceLabel: "我的实验",
      title: item.title || `${meta.title}模型`,
      experimentName: meta.title,
      classCount,
      sampleCount: item.sampleCount || 0,
      testAccuracy: item.testAccuracy ?? item.accuracy,
      hasModel,
      canExport: hasModel,
      savedAt: item.createdAt,
      modelScope: hasModel ? "仅当前浏览器可用" : "未保存本机模型",
      analysisPath: `/analysis/${item.recordId}`,
      reportPath: `/report/${item.recordId}`,
      modelKey: item.modelKey || ""
    };
  })
);

const modelRows = computed(() => [
  ...myAchievements.value,
  ...demoAchievements.map((item) => ({
    id: `demo-${item.reportId}-${item.title}`,
    recordId: item.reportId,
    sourceType: "demo",
    sourceLabel: "示例成果",
    title: item.title,
    experimentName: item.sourceExperiment,
    classCount: item.classCount || 0,
    sampleCount: item.sampleCount || 0,
    testAccuracy: item.accuracy,
    hasModel: false,
    canExport: false,
    savedAt: "",
    modelScope: "示例仅展示结果",
    analysisPath: `/analysis/${item.reportId}`,
    reportPath: `/report/${item.reportId}`
  }))
]);

async function handleExportModel(item) {
  if (!item.canExport) {
    ElMessage.warning("当前成果没有可导出的本机模型。");
    return;
  }

  exportingModelId.value = item.recordId;
  try {
    await exportSavedRecordModel(item.recordId, item);
    ElMessage.success("模型导出已开始，请查看浏览器下载列表。");
  } catch (err) {
    ElMessage.error(err.message || "模型导出失败");
  } finally {
    exportingModelId.value = null;
  }
}

function handleTestModel(item) {
  if (item.sourceType === "mine" && item.hasModel) {
    router.push({ path: "/model-import", query: { recordId: item.recordId } });
    return;
  }

  ElMessage.info("该成果没有可直接读取的本机模型，可在导入测试页上传导出的模型文件进行测试。");
  router.push("/model-import");
}

function handleShare(item) {
  if (item.sourceType !== "mine") {
    ElMessage.warning("示例成果不能发布到社区，请分享自己的实验成果。");
    return;
  }

  sharingId.value = item.recordId;
  createCommunityShare({
    recordId: item.recordId,
    title: item.title,
    experimentTitle: item.experimentName
  })
    .then((share) => {
      ElMessage.success("成果已发布到社区。模型文件不会自动同步到社区。");
      router.push(`/community/${share.shareId}`);
    })
    .catch((err) => {
      ElMessage.error(err.message || "社区分享失败");
    })
    .finally(() => {
      sharingId.value = null;
    });
}

onMounted(async () => {
  try {
    const data = await getRecordList();
    records.value = data.items || [];
  } catch (err) {
    error.value = err.message || "成果展示加载失败。";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <section class="gallery-page page-layout">
    <header class="page-heading">
      <div class="page-heading__copy">
        <span class="gallery-kicker">模型成果库</span>
        <h1 class="page-title">图像分类模型成果列表</h1>
      </div>
      <div class="gallery-heading__actions">
        <router-link to="/community"><el-button plain>社区成果</el-button></router-link>
        <router-link to="/model-import"><el-button plain>导入模型测试</el-button></router-link>
        <router-link to="/records"><el-button type="primary" plain>前往记录中心</el-button></router-link>
      </div>
    </header>

    <section class="workspace-shell">
      <div class="workspace-toolbar">
        <strong>成果列表</strong>
        <span class="gallery-note">汇总实验记录、分析报告、已保存模型、导出和导入测试入口</span>
      </div>

      <div class="workspace-body">
        <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon />
        <div v-else-if="loading"><el-skeleton :rows="6" animated /></div>
        <div v-else class="decision-table model-table">
          <div class="decision-table__row decision-table__row--head model-row">
            <span>成果名称</span>
            <span>来源实验</span>
            <span>类别数量</span>
            <span>样本数量</span>
            <span>测试准确率</span>
            <span>是否包含模型</span>
            <span>是否支持导出</span>
            <span>保存时间</span>
            <span>操作</span>
          </div>

          <div class="decision-table__row model-row" v-for="item in modelRows" :key="item.id">
            <div class="model-name" data-label="成果名称">
              <strong>{{ item.title }}</strong>
              <div class="result-meta">
                <el-tag :type="item.sourceType === 'mine' ? 'success' : 'info'">{{ item.sourceLabel }}</el-tag>
                <small>#{{ item.recordId }}</small>
              </div>
            </div>
            <span data-label="来源实验">{{ item.experimentName }}</span>
            <span data-label="类别数量">{{ safeText(item.classCount) }}</span>
            <span data-label="样本数量">{{ safeText(item.sampleCount) }}</span>
            <span data-label="测试准确率">{{ formatPercent(item.testAccuracy) }}</span>
            <span data-label="是否包含模型" class="model-state">
              <el-tag :type="item.hasModel ? 'success' : 'info'">{{ item.hasModel ? "包含模型" : "无模型文件" }}</el-tag>
              <small v-if="item.hasModel">{{ item.modelScope }}</small>
              <small v-else>{{ item.modelScope }}</small>
            </span>
            <span data-label="是否支持导出">
              <el-tag :type="item.canExport ? 'success' : 'info'">{{ item.canExport ? "支持导出" : "不可导出" }}</el-tag>
            </span>
            <span data-label="保存时间">{{ item.savedAt ? formatDateTime(item.savedAt) : "示例" }}</span>
            <div class="model-actions" data-label="操作">
              <router-link :to="item.analysisPath"><el-button>查看分析</el-button></router-link>
              <router-link :to="item.reportPath"><el-button type="primary" plain>查看报告</el-button></router-link>
              <el-button plain @click="handleTestModel(item)">测试模型</el-button>
              <el-button
                plain
                :disabled="!item.canExport"
                :loading="exportingModelId === item.recordId"
                @click="handleExportModel(item)"
              >
                导出模型
              </el-button>
              <el-button plain :loading="sharingId === item.recordId" @click="handleShare(item)">分享到社区</el-button>
            </div>
          </div>

          <div v-if="modelRows.length === 0" class="gallery-empty">
            暂无我的模型成果。请先完成一次图像分类实验并保存记录。
          </div>
        </div>
      </div>
    </section>
  </section>
</template>

<style scoped>
.gallery-kicker {
  color: var(--primary);
  font-size: 14px;
  font-weight: 800;
}

.gallery-note {
  color: var(--muted);
  font-size: 13px;
  font-weight: 800;
}

.gallery-heading__actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}

.model-row {
  grid-template-columns: minmax(190px, 1.05fr) minmax(150px, 0.82fr) minmax(76px, 0.36fr) minmax(82px, 0.38fr) minmax(96px, 0.48fr) minmax(130px, 0.7fr) minmax(96px, 0.48fr) minmax(140px, 0.62fr) minmax(430px, 1.8fr);
}

.model-name {
  display: grid;
  gap: 4px;
}

.model-name strong {
  color: var(--heading);
}

.model-name small,
.model-row > span {
  color: var(--muted);
}

.result-meta,
.model-state {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  align-items: center;
}

.model-state {
  align-items: flex-start;
  flex-direction: column;
}

.model-state small {
  color: var(--muted);
  font-size: 12px;
  font-weight: 700;
  line-height: 1.4;
}

.model-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.gallery-empty {
  padding: 28px;
  color: var(--muted);
  text-align: center;
}

@media (max-width: 1100px) {
  .decision-table__row--head {
    display: none;
  }

  .model-row {
    grid-template-columns: 1fr;
  }

  .model-row > *::before {
    content: attr(data-label);
    display: block;
    margin-bottom: 4px;
    color: var(--muted);
    font-size: 12px;
    font-weight: 800;
  }
}
</style>
