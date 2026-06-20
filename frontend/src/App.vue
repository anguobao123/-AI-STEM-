<script setup>
import AppHeader from "./components/AppHeader.vue";
</script>

<template>
  <div class="app-shell">
    <AppHeader />
    <main class="page-shell">
      <router-view />
    </main>
  </div>
</template>

<style>
:root {
  color-scheme: light;
  --bg: #eef3f8;
  --bg-panel: #f6f9fc;
  --grid-line: rgba(111, 130, 153, 0.16);
  --grid-line-soft: rgba(111, 130, 153, 0.08);
  --surface: #ffffff;
  --surface-alt: #f7fafd;
  --surface-strong: #edf3f9;
  --surface-hover: #f1f6fd;
  --surface-active: #e8f1ff;
  --panel-header: #f2f7fc;
  --instrument: #0f172a;
  --readout: #f8fbff;
  --text: #132033;
  --heading: #0f172a;
  --muted: #5d6d82;
  --primary: #2563eb;
  --primary-hover: #1d4ed8;
  --primary-soft: #e4efff;
  --border: #cfdbe8;
  --border-soft: #e4ebf3;
  --border-strong: #aebdcd;
  --border-hover: #9fb8d8;
  --border-active: #78a4e8;
  --success: #0f766e;
  --success-soft: #e4f4ef;
  --warning: #b56b0b;
  --warning-soft: #fff3d8;
  --danger: #c24141;
  --danger-soft: #fdecec;
  --radius-card: 8px;
  --radius-control: 6px;
  --page-gap: 24px;
  --shadow-soft: 0 1px 0 rgba(255, 255, 255, 0.82), 0 1px 3px rgba(15, 23, 42, 0.05);
  --shadow-lift: 0 12px 24px rgba(15, 23, 42, 0.09);
  --el-color-primary: var(--primary);
  --el-color-success: var(--success);
  --el-color-warning: var(--warning);
  --el-color-danger: var(--danger);
  --el-border-color: var(--border);
  --el-border-color-light: #e3e9f1;
  --el-border-radius-base: var(--radius-control);
  --el-font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
}

* {
  box-sizing: border-box;
}

html {
  min-width: 320px;
  background: var(--bg);
}

body {
  margin: 0;
  font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  background:
    linear-gradient(var(--grid-line) 1px, transparent 1px),
    linear-gradient(90deg, var(--grid-line) 1px, transparent 1px),
    linear-gradient(var(--grid-line-soft) 1px, transparent 1px),
    linear-gradient(90deg, var(--grid-line-soft) 1px, transparent 1px),
    linear-gradient(180deg, #fbfdff 0%, var(--bg) 72%, #e9f0f7 100%);
  background-position: -1px -1px, -1px -1px, -1px -1px, -1px -1px, 0 0;
  background-size: 96px 96px, 96px 96px, 24px 24px, 24px 24px, auto;
  color: var(--text);
  text-rendering: optimizeLegibility;
}

::selection {
  background: rgba(37, 99, 235, 0.16);
}

a {
  color: inherit;
  text-decoration: none;
}

button,
input,
textarea,
select {
  font: inherit;
}

:where(a, button, input, textarea, select, [tabindex]):focus-visible {
  outline: 2px solid rgba(37, 99, 235, 0.28);
  outline-offset: 2px;
}

#app {
  min-height: 100vh;
}

.app-shell {
  min-height: 100vh;
  position: relative;
}

.app-shell::before {
  content: "";
  position: fixed;
  inset: 64px 0 auto;
  z-index: -1;
  height: 220px;
  background:
    linear-gradient(180deg, rgba(37, 99, 235, 0.06), transparent 72%),
    linear-gradient(90deg, rgba(15, 118, 110, 0.06), transparent 34%, transparent 66%, rgba(37, 99, 235, 0.04));
  pointer-events: none;
}

.page-shell {
  max-width: 1320px;
  margin: 0 auto;
  padding: 26px 24px 46px;
}

.page-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  padding: 18px;
  box-shadow: var(--shadow-soft);
  position: relative;
}

.el-card {
  border-radius: var(--radius-card);
  border-color: var(--border);
  box-shadow: var(--shadow-soft);
}

body .experiment-card.experiment-card,
body .record-card.record-card,
body .panel-card.panel-card,
body .class-card.class-card,
body .summary-card.summary-card,
body .knowledge-card.knowledge-card,
body .bridge-item.bridge-item,
body .recommend-card.recommend-card,
body .achievement-card.achievement-card,
body .achievement-metric.achievement-metric,
body .metric-card.metric-card,
body .info-card.info-card,
body .error-card.error-card,
body .empty-state.empty-state,
body .report-paper.report-paper,
body .report-meta-item.report-meta-item,
body .report-row.report-row,
body .error-item.error-item {
  border-radius: var(--radius-card);
}

body .report-paper.report-paper {
  position: relative;
  overflow: hidden;
}

body .experiment-card.experiment-card,
body .record-card.record-card,
body .panel-card.panel-card,
body .summary-card.summary-card,
body .knowledge-card.knowledge-card,
body .bridge-item.bridge-item,
body .recommend-card.recommend-card,
body .achievement-card.achievement-card,
body .metric-card.metric-card,
body .info-card.info-card {
  position: relative;
  overflow: hidden;
  border-color: var(--border);
  background-color: var(--surface);
  box-shadow: var(--shadow-soft);
}

.el-button {
  border-radius: var(--radius-control);
  font-weight: 650;
  letter-spacing: 0;
  box-shadow: none;
  min-width: 0;
  transition:
    background-color 0.16s ease,
    border-color 0.16s ease,
    color 0.16s ease,
    transform 0.16s ease,
    box-shadow 0.16s ease;
}

.el-button:hover,
.el-button:focus-visible {
  transform: translateY(-1px);
  box-shadow: 0 6px 14px rgba(37, 99, 235, 0.12);
}

.el-button:active {
  transform: translateY(0);
  box-shadow: none;
}

.el-button--large {
  --el-button-size: 44px;
  padding: 0 20px;
}

.el-button--primary {
  --el-button-bg-color: var(--primary);
  --el-button-border-color: var(--primary);
  --el-button-hover-bg-color: var(--primary-hover);
  --el-button-hover-border-color: var(--primary-hover);
  --el-button-active-bg-color: #1e40af;
  --el-button-active-border-color: #1e40af;
}

.el-button.is-plain {
  background: var(--surface);
  border-color: var(--border-strong);
  color: var(--text);
}

.el-button.is-plain:hover,
.el-button.is-plain:focus {
  background: var(--surface-strong);
  border-color: var(--primary);
  color: var(--primary);
}

.el-button--primary.is-plain {
  background: var(--primary-soft);
  border-color: rgba(37, 99, 235, 0.32);
  color: var(--primary);
}

.el-tag {
  border-radius: var(--radius-control);
  font-weight: 750;
  border-style: solid;
}

.el-tag.el-tag--success {
  --el-tag-bg-color: var(--success-soft);
  --el-tag-border-color: rgba(15, 118, 110, 0.28);
  --el-tag-text-color: var(--success);
}

.el-tag.el-tag--warning {
  --el-tag-bg-color: var(--warning-soft);
  --el-tag-border-color: rgba(181, 107, 11, 0.3);
  --el-tag-text-color: var(--warning);
}

.el-tag.el-tag--danger {
  --el-tag-bg-color: var(--danger-soft);
  --el-tag-border-color: rgba(194, 65, 65, 0.3);
  --el-tag-text-color: var(--danger);
}

.el-table {
  --el-table-border-color: var(--border);
  --el-table-header-bg-color: var(--panel-header);
  --el-table-header-text-color: var(--muted);
  --el-table-row-hover-bg-color: var(--primary-soft);
  border-radius: var(--radius-card);
  overflow: hidden;
  border: 1px solid var(--border);
  box-shadow: var(--shadow-soft);
}

.el-table th.el-table__cell {
  font-weight: 800;
}

body .empty-state.empty-state {
  border-radius: var(--radius-card);
  background: var(--surface);
  border-color: var(--border);
}

.page-title {
  margin: 0;
  color: var(--heading);
  font-size: 27px;
  line-height: 1.25;
  font-weight: 800;
  letter-spacing: 0;
}

.page-subtitle {
  margin: 0;
  color: var(--muted);
  line-height: 1.7;
  font-size: 15px;
  max-width: 760px;
}

.grid {
  display: grid;
  gap: var(--page-gap);
}

.page-layout {
  display: grid;
  gap: 18px;
}

.page-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 18px;
  padding: 16px 18px;
  border-bottom: 1px solid var(--border);
  border-radius: var(--radius-card);
  background:
    linear-gradient(90deg, rgba(228, 239, 255, 0.82), transparent 58%),
    var(--surface);
  box-shadow: var(--shadow-soft);
}

.page-heading__copy {
  display: grid;
  gap: 8px;
}

.page-heading__actions,
.workspace-toolbar,
.bottom-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.workspace-shell {
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  background: var(--surface);
  box-shadow: var(--shadow-soft);
  overflow: hidden;
  position: relative;
}

.workspace-toolbar {
  min-height: 54px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.86), transparent),
    var(--panel-header);
  justify-content: space-between;
  color: var(--heading);
}

.workspace-toolbar strong {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--heading);
}

.workspace-toolbar strong::before {
  content: none;
}

.workspace-body {
  padding: 16px;
}

.workspace-split {
  display: grid;
  grid-template-columns: minmax(220px, 0.32fr) minmax(0, 1fr);
  min-height: 420px;
}

.workspace-sidebar {
  border-right: 1px solid var(--border);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.56), transparent),
    var(--surface-alt);
}

.workspace-main {
  min-width: 0;
  background: var(--surface);
}

.bottom-actions {
  justify-content: flex-end;
  padding: 14px 16px;
  border-top: 1px solid var(--border);
  background: var(--panel-header);
}

.decision-table {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  background: var(--surface);
  overflow: hidden;
  box-shadow: var(--shadow-soft);
}

.decision-table__row {
  display: grid;
  gap: 12px;
  padding: 14px 16px;
  border-top: 1px solid var(--border);
  align-items: center;
}

.decision-table__row:not(.decision-table__row--head) {
  transition:
    background 0.16s ease,
    box-shadow 0.16s ease,
    transform 0.16s ease;
}

.decision-table__row:not(.decision-table__row--head):hover,
.decision-table__row:not(.decision-table__row--head):focus-within {
  background: var(--surface-hover);
}

.decision-table__row:not(.decision-table__row--head):active {
  background: var(--surface-active);
}

.decision-table__row:first-child {
  border-top: 0;
}

.decision-table__row--head {
  background: var(--panel-header);
  color: var(--muted);
  font-size: 13px;
  font-weight: 800;
}

.compact-list {
  display: grid;
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  background: var(--surface);
  overflow: hidden;
  box-shadow: var(--shadow-soft);
}

.compact-list__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 12px 14px;
  border-top: 1px solid var(--border);
  transition:
    background 0.16s ease,
    box-shadow 0.16s ease;
}

.compact-list__item:first-child {
  border-top: 0;
}

.compact-list__item:hover,
.compact-list__item:focus-within {
  background: var(--surface-hover);
  box-shadow: inset 0 0 0 1px rgba(159, 184, 216, 0.42);
}

.status-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  background:
    linear-gradient(90deg, rgba(228, 239, 255, 0.7), transparent 64%),
    var(--readout);
  box-shadow: var(--shadow-soft);
  transition:
    background 0.16s ease,
    border-color 0.16s ease,
    box-shadow 0.16s ease;
}

.status-line:hover,
.status-line:focus-within {
  border-color: var(--border-hover);
  background: var(--surface-hover);
  box-shadow: inset 0 0 0 1px rgba(159, 184, 216, 0.32), var(--shadow-soft);
}

.lab-module {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(247, 250, 253, 0.98) 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.9),
    0 1px 2px rgba(15, 23, 42, 0.04);
  outline: none;
  transition:
    background 0.16s ease,
    border-color 0.16s ease,
    box-shadow 0.16s ease,
    transform 0.16s ease;
}

.lab-module::before {
  content: none;
}

.lab-module::after {
  content: none;
}

.lab-module.is-active,
.lab-module.active {
  border-color: var(--border-active);
  background:
    linear-gradient(180deg, #ffffff 0%, #f3f7fd 100%);
}

.lab-module:hover,
.lab-module:focus-visible,
.lab-module:focus-within {
  border-color: var(--border-hover);
  background:
    linear-gradient(180deg, #ffffff 0%, var(--surface-hover) 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.9),
    0 8px 16px rgba(15, 23, 42, 0.06);
}

.lab-module:active {
  transform: translateY(1px);
  background: var(--surface-active);
}

.grid-2 {
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}

.grid-3 {
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}

.pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 10px;
  border: 1px solid rgba(37, 99, 235, 0.2);
  border-radius: var(--radius-control);
  background: var(--primary-soft);
  color: var(--primary);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.2;
}

.pill::before {
  content: none;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 26px;
  padding: 0 9px;
  border: 1px solid var(--border);
  border-radius: var(--radius-control);
  background: var(--readout);
  color: var(--muted);
  font-size: 12px;
  font-weight: 800;
  line-height: 1.2;
  white-space: nowrap;
}

.status-badge.is-active {
  border-color: rgba(37, 99, 235, 0.24);
  background: var(--primary-soft);
  color: var(--primary);
}

.status-badge.is-success {
  border-color: rgba(15, 118, 110, 0.24);
  background: var(--success-soft);
  color: var(--success);
}

.status-badge.is-warning {
  border-color: rgba(181, 107, 11, 0.26);
  background: var(--warning-soft);
  color: var(--warning);
}

.status-badge.is-danger {
  border-color: rgba(194, 65, 65, 0.24);
  background: var(--danger-soft);
  color: var(--danger);
}

.status-badge.is-muted {
  border-color: var(--border);
  background: var(--surface-strong);
  color: var(--muted);
}

.section-title {
  margin: 0 0 10px;
  color: var(--heading);
  font-size: 19px;
  line-height: 1.35;
  font-weight: 750;
  letter-spacing: 0;
}

.section-note {
  margin: 0;
  color: var(--muted);
  line-height: 1.7;
}

.placeholder-box {
  min-height: 200px;
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius-card);
  background:
    linear-gradient(var(--grid-line-soft) 1px, transparent 1px),
    linear-gradient(90deg, var(--grid-line-soft) 1px, transparent 1px),
    var(--surface-alt);
  background-size: 20px 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--muted);
  text-align: center;
  padding: 20px;
}

@media (max-width: 768px) {
  .page-shell {
    padding: 18px 16px 36px;
  }

  .page-card {
    padding: 16px;
  }

  .page-title {
    font-size: 24px;
  }

  .page-heading,
  .status-line,
  .compact-list__item {
    align-items: stretch;
    flex-direction: column;
  }

  .workspace-split {
    grid-template-columns: 1fr;
  }

  .workspace-sidebar {
    border-right: 0;
    border-bottom: 1px solid var(--border);
  }

  .section-title {
    font-size: 18px;
  }

  .el-button--large {
    --el-button-size: 42px;
  }
}
</style>
