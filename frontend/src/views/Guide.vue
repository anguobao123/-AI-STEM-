<script setup>
import { computed, ref } from "vue";

const mustReadSections = [
  {
    key: "concept",
    title: "AI 为什么会认错",
    subtitle: "先理解模型在判断什么，为什么数据是关键。",
    points: [
      "图像分类的输入是图片，输出是类别和置信度。",
      "样本必须有正确标签，标签错了会直接影响训练。",
      "训练集负责让模型学习，测试集负责检验新图片。"
    ],
    tip: "先准备清晰、类别正确、训练和测试不混用的图片。"
  },
  {
    key: "variable",
    title: "数据如何影响 AI",
    subtitle: "在本课程中，我们重点探究三个因素。",
    points: [
      "数据数量：每类训练图片多还是少，会影响模型稳定性。",
      "数据质量：类别区分度、背景干扰，会影响模型准确性。",
      "训练方式：训练轮次、数据增强，会影响模型泛化能力。"
    ],
    tip: "选定实验后，只围绕该实验的控制变量做调整。"
  },
  {
    key: "train-test",
    title: "训练与测试",
    subtitle: "先训练模型 1.0，然后用新图片检验。",
    points: [
      "训练时观察准确率和损失值是否稳定变化。",
      "单图预测看某一张图的类别和概率。",
      "批量测试看整体正确率和错误分布。"
    ],
    tip: "完成训练和测试后，保存记录，再进入分析与报告。"
  },
  {
    key: "analysis",
    title: "结果分析与优化",
    subtitle: "基于错误分析，优化数据，训练模型 2.0。",
    points: [
      "准确率回答：整体分类效果好不好。",
      "混淆矩阵回答：哪些类别容易混淆。",
      "错误样本帮助判断数据是否需要补充或调整。",
      "优化后重新训练，对比模型 1.0 和模型 2.0。"
    ],
    tip: "写结论时引用指标和错误现象，不只写主观感觉。"
  }
];

const preflightChecks = ["类别名称清晰", "训练图和测试图分开", "只改变一个变量", "优化后对比 1.0 与 2.0", "保存记录后再分析"];
const stemMap = [
  { key: "S", title: "科学探究", step: "提出问题、实验假设、变量设计" },
  { key: "T", title: "技术实现", step: "上传数据、训练图像分类模型" },
  { key: "E", title: "工程优化", step: "根据错误样本改进模型 2.0" },
  { key: "M", title: "数学分析", step: "用准确率、错误率、混淆矩阵判断表现" }
];
const beforeLabNotes = [
  "类别名称要清楚",
  "训练集和测试集要分开",
  "一次只改变一个主要变量",
  "批量测试比单图预测更可靠",
  "模型错误是优化依据，不是失败"
];
const activeKey = ref("concept");
const activeSection = computed(() => mustReadSections.find((section) => section.key === activeKey.value) || mustReadSections[0]);
</script>

<template>
  <section class="guide-page page-layout">
    <header class="page-heading">
      <div class="page-heading__copy">
        <span class="guide-kicker">数据如何教会 AI · 课程导学</span>
        <h1 class="page-title">先读懂四件事，再开始图像分类实验</h1>
      </div>
      <p class="page-subtitle">
        左侧选择导学段落，右侧只看当前必读内容。
        实验前请完成以下确认：
        <span v-for="check in preflightChecks" :key="check" class="preflight-chip">{{ check }}</span>
      </p>
    </header>

    <section class="workspace-shell guide-workspace">
      <div class="workspace-split">
        <aside class="workspace-sidebar guide-nav" aria-label="导学目录">
          <div class="guide-nav__title">实验前目录</div>
          <button
            v-for="section in mustReadSections"
            :key="section.key"
            type="button"
            class="guide-nav__item lab-module"
            :class="{ 'is-active': activeKey === section.key }"
            @click="activeKey = section.key"
          >
            <span class="guide-nav__head">
              <span>{{ section.title }}</span>
              <span v-if="activeKey === section.key" class="status-badge is-active">当前</span>
            </span>
            <small>{{ section.subtitle }}</small>
          </button>
        </aside>

        <main class="workspace-main reading-panel">
          <div class="workspace-toolbar">
            <div>
              <h2 class="section-title">{{ activeSection.title }}</h2>
            </div>
          </div>

          <div class="workspace-body reading-body">
            <p class="reading-lead">{{ activeSection.subtitle }}</p>
            <ol class="reading-list">
              <li v-for="point in activeSection.points" :key="point">{{ point }}</li>
            </ol>
            <div class="attention-line lab-module is-active">
              <strong>进入实验时需要注意</strong>
              <p>{{ activeSection.tip }}</p>
            </div>

            <div class="prelab-grid">
              <section class="prelab-card lab-module">
                <h3>课前检查清单</h3>
                <ul>
                  <li v-for="check in preflightChecks" :key="check">✓ {{ check }}</li>
                </ul>
              </section>
              <section class="prelab-card lab-module">
                <h3>STEM 四要素与步骤映射</h3>
                <div v-for="item in stemMap" :key="item.key" class="stem-map-row">
                  <strong>{{ item.key }} · {{ item.title }}</strong>
                  <span>{{ item.step }}</span>
                </div>
              </section>
              <section class="prelab-card lab-module wide">
                <h3>进入实验前需要知道的 5 件事</h3>
                <ol>
                  <li v-for="item in beforeLabNotes" :key="item">{{ item }}</li>
                </ol>
              </section>
            </div>
          </div>
        </main>
      </div>

      <div class="bottom-actions guide-bottom">
        <router-link to="/experiments" class="guide-action">
          <el-button type="primary" size="large">我已理解，进入实验任务</el-button>
        </router-link>
      </div>
    </section>
  </section>
</template>

<style scoped>
.guide-kicker {
  color: var(--primary);
  font-size: 14px;
  font-weight: 800;
}

.guide-workspace .workspace-split {
  min-height: 460px;
}

.guide-nav {
  position: static;
  align-self: stretch;
  align-content: start;
  padding: 14px;
  display: grid;
  gap: 8px;
}

.guide-nav__title {
  min-height: 40px;
  padding: 8px 4px 10px;
  color: var(--muted);
  font-size: 13px;
  font-weight: 800;
  display: flex;
  align-items: center;
}

.guide-nav__item {
  width: 100%;
  padding: 14px;
  color: var(--text);
  text-align: left;
  display: grid;
  gap: 4px;
  cursor: pointer;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  transition: border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.guide-nav__item:hover,
.guide-nav__item:focus-visible {
  border-color: var(--border-hover);
  background: var(--surface-hover);
  transform: translateY(-1px);
}

.guide-nav__item:active {
  transform: translateY(0);
  background: var(--surface-active);
}

.guide-nav__item.is-active {
  border-color: var(--border-active);
  background: var(--surface-active);
  color: var(--heading);
}

.guide-nav__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.guide-nav__head > span:first-child {
  font-weight: 800;
}

.guide-nav__item small {
  color: var(--muted);
  line-height: 1.45;
}

.reading-panel {
  display: grid;
  grid-template-rows: auto 1fr;
}

.reading-body {
  display: grid;
  align-content: start;
  gap: 18px;
}

.reading-lead {
  margin: 0;
  color: var(--heading);
  font-size: 18px;
  font-weight: 750;
}

.reading-list {
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
  list-style: none;
}

.reading-list li {
  padding: 13px 14px;
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-card);
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  color: var(--text);
  line-height: 1.65;
  transition: background 0.16s ease, border-color 0.16s ease, transform 0.16s ease;
}

.reading-list li:hover {
  border-color: var(--border-hover);
  background: var(--surface-hover);
}

.attention-line {
  padding: 15px 16px;
  display: grid;
  gap: 6px;
}

.prelab-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.prelab-card {
  padding: 16px;
  display: grid;
  gap: 10px;
}

.prelab-card.wide {
  grid-column: 1 / -1;
}

.prelab-card h3 {
  margin: 0;
  color: var(--heading);
  font-size: 16px;
}

.prelab-card ul,
.prelab-card ol {
  margin: 0;
  padding-left: 20px;
  color: var(--text);
  line-height: 1.8;
}

.stem-map-row {
  display: grid;
  gap: 4px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
}

.stem-map-row:last-child {
  border-bottom: 0;
}

.stem-map-row strong {
  color: var(--primary);
}

.stem-map-row span {
  color: var(--muted);
  line-height: 1.6;
}

.attention-line strong {
  color: var(--primary);
}

.attention-line p {
  margin: 0;
  color: var(--text);
  line-height: 1.65;
}

.guide-bottom {
  justify-content: center;
}

.preflight-chip {
  display: inline-flex;
  align-items: center;
  margin-left: 8px;
  padding: 2px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-control);
  background: var(--surface-alt);
  color: var(--muted);
  font-size: 12px;
  font-weight: 700;
}

.guide-action {
  text-decoration: none;
}

@media (max-width: 900px) {
  .guide-nav {
    position: static;
  }
}
</style>
