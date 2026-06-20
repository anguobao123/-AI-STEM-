<script setup>
import { onMounted, ref } from "vue";
import { getHealth } from "../utils/api";
import { experimentCatalog } from "../utils/experimentContent";

const backendStatus = ref({
  type: "info",
  title: "正在检查后端服务",
  description: "页面加载后将自动请求 /api/health。"
});

const mainActions = [
  {
    title: "开始实验",
    note: "选择任务并进入训练工作台",
    route: "/experiments",
    primary: true
  },
  {
    title: "学习导学",
    note: "先完成实验前必读清单",
    route: "/guide",
    primary: false
  },
  {
    title: "查看记录",
    note: "回看分析和实验报告",
    route: "/records",
    primary: false
  }
];

const recentEntry = experimentCatalog[0];

onMounted(async () => {
  try {
    const result = await getHealth();
    if (result?.status === "ok") {
      backendStatus.value = {
        type: "success",
        title: "后端服务连接正常",
        description: "Flask /api/health 接口已成功响应。"
      };
      return;
    }
    backendStatus.value = {
      type: "warning",
      title: "后端接口已响应，但返回内容异常",
      description: "请检查后端健康检查接口返回结构。"
    };
  } catch {
    backendStatus.value = {
      type: "error",
      title: "后端服务未连接，请检查 Flask 服务",
      description: "当前无法访问 /api/health，请确认后端正在 http://localhost:5000 运行。"
    };
  }
});
</script>

<template>
  <section class="home-console page-layout">
    <header class="page-heading home-heading">
      <h1 class="page-title">今天要做什么？</h1>
    </header>

    <section class="workspace-shell command-center" aria-label="入口工作台">
      <div class="workspace-body">
        <div class="main-actions">
          <router-link
            v-for="action in mainActions"
            :key="action.title"
            class="console-button"
            :class="{ 'is-primary': action.primary }"
            :to="action.route"
          >
            <strong>{{ action.title }}</strong>
            <span>{{ action.note }}</span>
          </router-link>
        </div>
      </div>

      <div class="bottom-actions console-bottom">
        <div class="status-line console-status lab-module is-active">
          <span>系统状态</span>
          <el-tag :type="backendStatus.type === 'success' ? 'success' : backendStatus.type === 'error' ? 'danger' : 'info'">
            {{ backendStatus.title }}
          </el-tag>
          <small>{{ backendStatus.description }}</small>
        </div>

        <router-link :to="recentEntry.route" class="recent-entry lab-module">
          <span>最近入口</span>
          <strong>{{ recentEntry.shortName || recentEntry.title }}</strong>
        </router-link>
      </div>
    </section>
  </section>
</template>

<style scoped>
.home-heading {
  min-height: 72px;
  align-items: center;
}

.command-center {
  min-height: 520px;
  display: grid;
  grid-template-rows: 1fr auto;
}

.command-center .workspace-body {
  display: grid;
  place-items: center;
  padding: clamp(36px, 7vw, 86px) 24px;
}

.main-actions {
  width: min(860px, 100%);
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.console-button {
  min-height: 132px;
  padding: 18px;
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  background: var(--surface);
  color: var(--text);
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 9px;
  text-align: center;
  transition:
    border-color 0.18s ease,
    background-color 0.18s ease,
    transform 0.18s ease;
}

.console-button:hover {
  border-color: var(--primary);
  background: var(--primary-soft);
  transform: translateY(-2px);
}

.console-button.is-primary {
  border-color: var(--primary);
  background: var(--primary);
  color: #fff;
}

.console-button strong {
  font-size: 24px;
  line-height: 1.2;
}

.console-button span {
  color: var(--muted);
  font-size: 14px;
  line-height: 1.5;
}

.console-button.is-primary span {
  color: rgba(255, 255, 255, 0.82);
}

.console-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.console-status {
  flex: 1 1 auto;
  padding: 12px 14px;
  justify-content: flex-start;
}

.console-status > span,
.recent-entry span {
  color: var(--muted);
  font-size: 13px;
  font-weight: 800;
}

.console-status small {
  color: var(--muted);
  line-height: 1.5;
}

.recent-entry {
  min-width: 220px;
  padding: 11px 12px;
  display: grid;
  gap: 3px;
}

.recent-entry strong {
  color: var(--heading);
  font-size: 14px;
}

@media (max-width: 900px) {
  .main-actions {
    grid-template-columns: 1fr;
  }

  .console-button {
    min-height: 96px;
  }

  .console-bottom,
  .console-status {
    align-items: stretch;
    flex-direction: column;
  }

  .recent-entry {
    width: 100%;
  }
}
</style>
