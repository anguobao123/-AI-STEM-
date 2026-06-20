<script setup>
import { computed, ref } from "vue";

const mustReadSections = [
  {
    key: "concept",
    title: "概念",
    subtitle: "先知道模型在判断什么。",
    points: [
      "图像分类的输入是图片，输出是类别和置信度。",
      "样本必须有正确标签，标签错了会直接影响训练。",
      "训练集负责让模型学习，测试集负责检验新图片。"
    ],
    tip: "先准备清晰、类别正确、训练和测试不混用的图片。"
  },
  {
    key: "variable",
    title: "变量控制",
    subtitle: "一次实验只改一个因素。",
    points: [
      "只改变本次实验的关键变量。",
      "样本数量、训练轮次、类别相似度、数据增强分别对应四个实验。",
      "其他条件尽量保持一致，结果才容易解释。"
    ],
    tip: "选定实验后，只围绕该实验的控制变量做调整。"
  },
  {
    key: "train-test",
    title: "训练测试",
    subtitle: "先训练，再用新图片检验。",
    points: [
      "训练时观察准确率和损失值是否稳定变化。",
      "单图预测看某一张图的类别和概率。",
      "批量测试看整体正确率和错误分布。"
    ],
    tip: "完成训练和测试后，保存记录，再进入分析与报告。"
  },
  {
    key: "analysis",
    title: "结果分析",
    subtitle: "用数据说明实验结论。",
    points: [
      "准确率回答“整体分类效果好不好”。",
      "混淆矩阵回答“哪些类别容易混淆”。",
      "错误样本帮助判断数据是否需要补充或调整。"
    ],
    tip: "写结论时引用指标和错误现象，不只写主观感觉。"
  }
];

const preflightChecks = ["类别名称清楚", "训练图和测试图分开", "只改变一个变量", "保存记录后再分析"];
const activeKey = ref("concept");
const activeSection = computed(() => mustReadSections.find((section) => section.key === activeKey.value) || mustReadSections[0]);
</script>

<template>
  <section class="guide-page page-layout">
    <header class="page-heading">
      <div class="page-heading__copy">
        <span class="guide-kicker">实验前清单 + 分段阅读</span>
        <h1 class="page-title">先读懂四件事，再开始图像分类实验</h1>
      </div>
      <p class="page-subtitle">
        左侧选择导学段落，右侧只看当前必读内容；每部分保留 3 条要点和 1 条进入实验提醒。
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
              <span class="guide-kicker">当前阅读</span>
              <h2 class="section-title">{{ activeSection.title }}</h2>
            </div>
            <span class="reading-count status-badge is-muted">3 条要点</span>
          </div>

          <div class="workspace-body reading-body">
            <p class="reading-lead">{{ activeSection.subtitle }}</p>
            <ol class="reading-list">
              <li v-for="point in activeSection.points" :key="point">{{ point }}</li>
            </ol>
            <div class="attention-line lab-module is-active">
              <strong>进入实验时要注意</strong>
              <p>{{ activeSection.tip }}</p>
            </div>
          </div>
        </main>
      </div>

      <div class="bottom-actions guide-bottom">
        <div class="preflight">
          <strong>开始前确认</strong>
          <span v-for="check in preflightChecks" :key="check" class="preflight-chip status-badge is-muted">{{ check }}</span>
        </div>
        <router-link to="/experiments" class="guide-action">
          <el-button type="primary" size="large">我已读完，去选择实验</el-button>
        </router-link>
      </div>
    </section>
  </section>
</template>

<style scoped>
.guide-kicker {
  color: var(--primary);
  font-size: 14px;
  font-weight: 700;
}

.guide-workspace .workspace-split {
  min-height: 480px;
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
  padding: 14px 14px;
  color: var(--text);
  text-align: left;
  display: grid;
  gap: 4px;
  cursor: pointer;
  background:
    linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  transition:
    border-color 0.18s ease,
    background 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.18s ease;
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

.reading-count {
  min-height: 32px;
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
  transition:
    background 0.16s ease,
    border-color 0.16s ease,
    transform 0.16s ease;
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

.attention-line strong {
  color: var(--primary);
}

.attention-line p {
  margin: 0;
  color: var(--text);
  line-height: 1.65;
}

.guide-bottom {
  justify-content: space-between;
}

.preflight {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.preflight strong {
  color: var(--heading);
}

.preflight-chip {
  min-height: 32px;
}

@media (max-width: 900px) {
  .guide-nav {
    position: static;
  }

  .guide-bottom,
  .preflight {
    align-items: stretch;
    flex-direction: column;
  }

  .guide-action {
    width: 100%;
  }

  .guide-action :deep(.el-button) {
    width: 100%;
  }
}
</style>
