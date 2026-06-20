<script setup>
import { computed } from "vue";
import { experimentCatalog } from "../utils/experimentContent";

const experimentProfiles = {
  "sample-count": {
    label: "数据规模",
    scene: "适合先做，用来理解样本数量不足时为什么模型容易不稳定。",
  },
  "epoch-count": {
    label: "训练过程",
    scene: "适合观察训练日志，判断训练轮次增加后是否仍然带来提升。",
  },
  "class-similarity": {
    label: "类别边界",
    scene: "适合比较视觉特征接近的类别，分析模型为什么会混淆。",
  },
  augmentation: {
    label: "泛化能力",
    scene: "适合测试新背景、新角度和新光照下，模型是否还能稳定识别。",
  }
};

const experimentCards = computed(() =>
  experimentCatalog.map((experiment) => ({
    ...experiment,
    ...experimentProfiles[experiment.id],
    metrics: experiment.metricList || []
  }))
);
</script>

<template>
  <section class="experiment-page page-layout">
    <header class="page-heading">
      <div class="page-heading__copy">
        <span class="experiment-kicker">任务选择</span>
        <h1 class="page-title">用决策表选择图像分类实验</h1>
      </div>
      <p class="page-subtitle">横向比较实验问题、控制变量、观察指标和适合场景，再进入对应实验。</p>
    </header>

    <section class="workspace-shell">
      <div class="workspace-toolbar">
        <strong>实验任务决策表</strong>
        <router-link to="/guide" class="guide-link">先看导学</router-link>
      </div>

      <div class="workspace-body">
        <div class="decision-table experiment-table" aria-label="实验任务决策表">
          <div class="decision-table__row decision-table__row--head experiment-row">
            <span>实验问题</span>
            <span>控制变量</span>
            <span>观察指标</span>
            <span>适合场景</span>
            <span>进入实验</span>
          </div>

          <div
            class="decision-table__row experiment-row"
            v-for="(experiment, index) in experimentCards"
            :key="experiment.id"
            tabindex="0"
          >
            <div class="decision-cell question-cell" data-label="实验问题">
              <div class="question-cell__meta">
                <span class="status-badge is-muted">TASK {{ index + 1 }}</span>
                <span class="status-badge is-active">{{ experiment.label }}</span>
              </div>
              <strong>{{ experiment.question }}</strong>
              <small>{{ experiment.shortName || experiment.title }}</small>
            </div>

            <div class="decision-cell variable-cell" data-label="控制变量">
              {{ experiment.controlVariable || experiment.variable }}
            </div>

            <div class="decision-cell" data-label="观察指标">
              <div class="metric-chips">
                <span v-for="metric in experiment.metrics" :key="metric">{{ metric }}</span>
              </div>
            </div>

            <div class="decision-cell scene-cell" data-label="适合场景">
              {{ experiment.scene }}
            </div>

            <div class="decision-cell action-cell" data-label="进入实验">
              <router-link :to="experiment.route">
                <el-button type="primary">进入实验</el-button>
              </router-link>
            </div>
          </div>
        </div>
      </div>
    </section>
  </section>
</template>

<style scoped>
.experiment-kicker {
  color: var(--primary);
  font-size: 14px;
  font-weight: 700;
}

.guide-link {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-control);
  background: var(--surface);
  color: var(--primary);
  font-size: 14px;
  font-weight: 800;
  transition:
    background 0.16s ease,
    border-color 0.16s ease,
    transform 0.16s ease;
}

.guide-link:hover {
  border-color: var(--border-hover);
  background: var(--surface-hover);
}

.guide-link:active {
  transform: translateY(1px);
}

.experiment-row {
  grid-template-columns: minmax(230px, 1.35fr) minmax(138px, 0.8fr) minmax(190px, 1fr) minmax(220px, 1.2fr) minmax(108px, 0.52fr);
}

.decision-table__row:not(.decision-table__row--head).experiment-row {
  outline: none;
  background: linear-gradient(180deg, #ffffff 0%, #f9fbfd 100%);
  transition:
    background 0.16s ease,
    box-shadow 0.16s ease,
    transform 0.16s ease;
}

.decision-table__row:not(.decision-table__row--head).experiment-row:hover,
.decision-table__row:not(.decision-table__row--head).experiment-row:focus-visible,
.decision-table__row:not(.decision-table__row--head).experiment-row:focus-within {
  background: var(--surface-hover);
  box-shadow: inset 0 0 0 1px var(--border-hover);
}

.decision-table__row:not(.decision-table__row--head).experiment-row:hover {
  transform: translateY(-1px);
}

.decision-table__row:not(.decision-table__row--head).experiment-row:active {
  background: var(--surface-active);
  transform: translateY(0);
}

.decision-cell {
  min-width: 0;
  color: var(--text);
  line-height: 1.6;
}

.decision-cell::before {
  display: none;
  content: attr(data-label);
  margin-bottom: 4px;
  color: var(--muted);
  font-size: 12px;
  font-weight: 800;
}

.question-cell {
  display: grid;
  gap: 7px;
  padding-left: 0;
}

.question-cell strong {
  color: var(--heading);
  font-weight: 820;
}

.question-cell small,
.scene-cell {
  color: var(--muted);
}

.question-cell__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.variable-cell {
  color: var(--heading);
  font-weight: 800;
}

.metric-chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.metric-chips span {
  padding: 7px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-control);
  background: var(--readout);
  color: var(--text);
  font-size: 13px;
  font-weight: 750;
}

.action-cell :deep(.el-button) {
  width: 100%;
}

@media (max-width: 900px) {
  .decision-table__row--head {
    display: none;
  }

  .experiment-row {
    grid-template-columns: 1fr;
  }

  .decision-cell::before {
    display: block;
  }
}
</style>
