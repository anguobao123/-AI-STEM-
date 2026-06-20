<script setup>
import { ElMessage } from "element-plus";
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { getDemoRecord, getRecord } from "../utils/api";
import { mapRecordToReport } from "../utils/reportMapper";

const route = useRoute();
const router = useRouter();

const loading = ref(true);
const error = ref("");
const report = ref(null);
const sourceInfo = ref({
  type: "info",
  label: "演示记录",
  note: "当前报告来源于演示数据。"
});

const analysisPath = computed(() => `/analysis/${route.params.recordId}`);

const reportPlainText = computed(() => {
  if (!report.value) return "";

  const lines = [
    "标准实验报告",
    `报告编号：${report.value.code}`,
    `实验编号：${report.value.id}`,
    `生成时间：${report.value.createdAt}`,
    "",
    "一、实验名称",
    report.value.title,
    "",
    "二、实验目的",
    report.value.purpose,
    "",
    "三、实验原理",
    report.value.principle,
    "",
    "四、变量设计",
    `实验问题：${report.value.variableDesign.question}`,
    `控制变量：${report.value.variableDesign.controlVariable}`,
    `保持不变：${report.value.variableDesign.constants}`,
    `观察指标：${report.value.variableDesign.metrics}`,
    `报告分析重点：${report.value.variableDesign.focus}`,
    "",
    "五、实验步骤",
    ...report.value.process.map((item, index) => `${index + 1}. ${item}`),
    "",
    "六、数据结果",
    ...report.value.resultTable.map((item) => `${item.label}：${item.value}`),
    "",
    "七、结果分析",
    ...report.value.analysis.map((item) => `- ${item}`),
    ...(report.value.errorAnalysis.length
      ? ["", "错误样本：", ...report.value.errorAnalysis.map(
          (item) =>
            `${item.imageName}｜真实类别：${item.trueLabel}｜预测类别：${item.predictedLabel}｜置信度：${item.confidence}｜原因：${item.reason}`
        )]
      : ["", "错误样本：当前记录没有明显错误样本。"]),
    "",
    "八、改进建议",
    ...report.value.suggestions.map((item) => `- ${item}`),
    "",
    "九、优化方案（模型 1.0 → 2.0）",
    report.value.optimizationPlan || "暂无优化方案",
    "",
    "十、模型版本对比",
    ...(report.value.versionCompare && report.value.versionCompare.length
      ? report.value.versionCompare.map(
          (item) => "模型 " + (item.fromVersion + 1) + ".0 → 模型 " + (item.toVersion + 1) + ".0：" + (item.plan || "未记录")
        )
      : ["暂无版本对比数据"]),
    "",
    "十一、实验反思",
    report.value.reflection || "暂无反思",
    "",
    "十二、STEM 总结",
    ...(report.value.stemSummary
      ? [
          "S 科学探究：" + (report.value.stemSummary.science || ""),
          "T 技术实现：" + (report.value.stemSummary.tech || ""),
          "E 工程优化：" + (report.value.stemSummary.engineering || ""),
          "M 数学分析：" + (report.value.stemSummary.math || "")
        ]
      : ["暂无 STEM 总结"]),
    "",
    "十三、实验结论",
    report.value.conclusion
  ];

  return lines.join("\n");
});

async function loadReport(recordId) {
  try {
    report.value = mapRecordToReport(await getRecord(recordId));
    sourceInfo.value = {
      type: "success",
      label: "真实实验记录",
      note: "当前报告来源于已保存的实验记录。"
    };
  } catch {
    report.value = mapRecordToReport(await getDemoRecord(recordId));
    sourceInfo.value = {
      type: "info",
      label: "演示记录",
      note: "未找到真实记录时，已回退到演示数据。"
    };
  }
}

onMounted(async () => {
  try {
    await loadReport(route.params.recordId);
  } catch (err) {
    error.value = err.message || "报告数据加载失败。";
  } finally {
    loading.value = false;
  }
});

async function copyReportContent() {
  if (!reportPlainText.value) return;

  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(reportPlainText.value);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = reportPlainText.value;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    ElMessage.success("报告内容已复制");
  } catch {
    ElMessage.error("复制失败，请稍后重试");
  }
}

function printReport() {
  window.print();
}
</script>

<template>
  <section class="report-page page-layout">
    <header class="page-heading report-toolbar">
      <div class="page-heading__copy">
        <span class="report-kicker">数据如何教会 AI · 实验报告</span>
        <h1 class="page-title">数据如何教会 AI：图像分类模型实验报告</h1>
        <p class="page-subtitle">报告页只负责正式呈现实验结论，操作记录请回到分析页或记录中心查看。</p>
        <div class="source-indicator">
          <el-tag :type="sourceInfo.type">{{ sourceInfo.label }}</el-tag>
          <small>{{ sourceInfo.note }}</small>
        </div>
      </div>
      <div class="report-toolbar__actions">
        <el-button plain @click="router.push(analysisPath)">返回分析页</el-button>
        <el-button plain @click="printReport">打印报告</el-button>
        <el-button type="primary" plain @click="copyReportContent">复制报告内容</el-button>
      </div>
    </header>

    <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon />
    <div v-else-if="loading" class="workspace-shell"><div class="workspace-body"><el-skeleton :rows="12" animated /></div></div>

    <article v-else-if="report" class="report-paper">
      <div class="report-paper__head">
        <div>
          <span class="report-paper__eyebrow">图像分类实验课程</span>
          <h2>{{ report.title }}</h2>
          <p>本页按照正式实验报告格式整理实验目的、原理、变量设计、步骤、数据、分析、建议与结论。</p>
        </div>
        <div class="report-meta-grid">
          <div class="report-meta-item">
            <span>报告编号</span>
            <strong>{{ report.code }}</strong>
          </div>
          <div class="report-meta-item">
            <span>实验记录号</span>
            <strong>{{ report.id }}</strong>
          </div>
          <div class="report-meta-item wide">
            <span>生成时间</span>
            <strong>{{ report.createdAt }}</strong>
          </div>
        </div>
      </div>

      <section class="report-section">
        <h3>一、实验名称</h3>
        <p>{{ report.title }}</p>
      </section>

      <section class="report-section">
        <h3>二、实验目的</h3>
        <p>{{ report.purpose }}</p>
      </section>

      <section class="report-section">
        <h3>三、实验原理</h3>
        <p>{{ report.principle }}</p>
      </section>

      <section class="report-section">
        <h3>四、变量设计</h3>
        <div class="report-table">
          <div class="report-row"><strong>实验问题</strong><span>{{ report.variableDesign.question }}</span></div>
          <div class="report-row"><strong>控制变量</strong><span>{{ report.variableDesign.controlVariable }}</span></div>
          <div class="report-row"><strong>保持不变</strong><span>{{ report.variableDesign.constants }}</span></div>
          <div class="report-row"><strong>观察指标</strong><span>{{ report.variableDesign.metrics }}</span></div>
        </div>
      </section>

      <section class="report-section">
        <h3>五、实验步骤</h3>
        <ol class="report-list">
          <li v-for="(item, index) in report.process" :key="`${index}-${item}`">{{ item }}</li>
        </ol>
      </section>

      <section class="report-section">
        <h3>六、数据结果</h3>
        <table class="result-table">
          <tbody>
            <tr v-for="item in report.resultTable" :key="item.label">
              <th>{{ item.label }}</th>
              <td>{{ item.value }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="report-section">
        <h3>七、结果分析</h3>
        <p v-for="item in report.analysis" :key="item">{{ item }}</p>
        <div class="error-analysis">
          <strong>错误样本分析</strong>
          <table v-if="report.errorAnalysis.length" class="error-table">
            <thead>
              <tr>
                <th>样本</th>
                <th>真实类别</th>
                <th>预测类别</th>
                <th>置信度</th>
                <th>原因分析</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in report.errorAnalysis" :key="`${item.imageName}-${item.trueLabel}`">
                <td>{{ item.imageName }}</td>
                <td>{{ item.trueLabel }}</td>
                <td>{{ item.predictedLabel }}</td>
                <td>{{ item.confidence }}</td>
                <td>{{ item.reason }}</td>
              </tr>
            </tbody>
          </table>
          <p v-else>当前记录没有明显错误样本。</p>
        </div>
      </section>

      <section class="report-section">
        <h3>八、改进建议</h3>
        <ul class="report-list">
          <li v-for="(item, index) in report.suggestions" :key="`${index}-${item}`">{{ item }}</li>
        </ul>
      </section>

      <section v-if="report.optimizationPlan" class="report-section">
        <h3>九、优化方案（模型 1.0 → 2.0）</h3>
        <p>{{ report.optimizationPlan }}</p>
      </section>

      <section v-if="report.versionCompare && report.versionCompare.length" class="report-section">
        <h3>十、模型版本对比</h3>
        <div class="report-table">
          <div v-for="(item, idx) in report.versionCompare" :key="idx" class="report-row">
            <strong>模型 {{ item.fromVersion + 1 }}.0 → 模型 {{ item.toVersion + 1 }}.0</strong>
            <span>准确率：{{ (item.accuracy * 100).toFixed(1) }}% | 优化措施：{{ item.plan || "未记录" }}</span>
          </div>
        </div>
      </section>

      <section v-if="report.reflection" class="report-section">
        <h3>十一、实验反思</h3>
        <p>{{ report.reflection }}</p>
      </section>

      <section v-if="report.stemSummary" class="report-section">
        <h3>十二、STEM 总结</h3>
        <div class="report-table">
          <div class="report-row"><strong>S 科学探究</strong><span>{{ report.stemSummary.science }}</span></div>
          <div class="report-row"><strong>T 技术实现</strong><span>{{ report.stemSummary.tech }}</span></div>
          <div class="report-row"><strong>E 工程优化</strong><span>{{ report.stemSummary.engineering }}</span></div>
          <div class="report-row"><strong>M 数学分析</strong><span>{{ report.stemSummary.math }}</span></div>
        </div>
      </section>

      <section class="report-section">
        <h3>十三、实验结论</h3>
        <p>{{ report.conclusion }}</p>
      </section>
    </article>
  </section>
</template>

<style scoped>
.report-page {
  display: grid;
  gap: 18px;
}

.report-kicker {
  color: var(--primary);
  font-size: 14px;
  font-weight: 800;
}

.report-toolbar__actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.source-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.source-indicator small {
  color: var(--muted);
  font-size: 12px;
  line-height: 1.4;
}

.report-paper {
  width: min(960px, 100%);
  margin: 0 auto;
  padding: 48px 56px;
  border-radius: var(--radius-card);
  border: 1px solid var(--border);
  background: #fff;
  box-shadow: var(--shadow-soft);
  display: grid;
  gap: 24px;
}

.report-paper__head {
  display: grid;
  gap: 18px;
  padding-bottom: 22px;
  border-bottom: 2px solid var(--heading);
}

.report-paper__eyebrow {
  display: inline-flex;
  color: var(--primary);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.report-paper__head h2,
.report-section h3 {
  margin: 0;
}

.report-paper__head h2 {
  color: var(--heading);
  font-size: 28px;
  line-height: 1.3;
}

.report-section h3 {
  color: var(--heading);
  font-size: 18px;
}

.report-paper__head p,
.report-section p,
.report-row span,
.report-list li,
.result-table td,
.error-table td {
  margin: 0;
  color: var(--muted);
  line-height: 1.8;
}

.report-meta-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.report-meta-item {
  padding: 14px 16px;
  border-radius: var(--radius-card);
  border: 1px solid var(--border);
  background: var(--surface-alt);
  display: grid;
  gap: 6px;
}

.report-meta-item.wide {
  grid-column: span 1;
}

.report-meta-item span {
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
}

.report-section {
  display: grid;
  gap: 12px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border);
}

.report-section:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.report-table {
  display: grid;
  gap: 10px;
}

.report-row {
  display: grid;
  grid-template-columns: 170px 1fr;
  gap: 14px;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  background: var(--surface-alt);
}

.report-list {
  margin: 0;
  padding-left: 20px;
}

.result-table,
.error-table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid var(--border);
}

.result-table th,
.result-table td,
.error-table th,
.error-table td {
  padding: 12px 14px;
  border-bottom: 1px solid var(--border);
  text-align: left;
  vertical-align: top;
}

.result-table th,
.error-table th {
  width: 180px;
  background: var(--surface-alt);
  font-weight: 700;
}

.result-table tr:last-child th,
.result-table tr:last-child td,
.error-table tr:last-child td {
  border-bottom: none;
}

.error-analysis {
  display: grid;
  gap: 10px;
  margin-top: 4px;
}

@media (max-width: 900px) {
  .report-paper {
    padding: 28px 22px;
  }

  .report-meta-grid,
  .report-row {
    grid-template-columns: 1fr;
  }

  .report-toolbar__actions {
    width: 100%;
  }
}

@media print {
  .report-toolbar,
  .el-alert {
    display: none !important;
  }

  .report-page {
    gap: 0;
  }

  .report-paper {
    width: 100%;
    margin: 0;
    padding: 0;
    border: none;
    box-shadow: none;
  }

  .report-section {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .report-paper__head {
    border-bottom-color: #000;
  }
}
</style>
