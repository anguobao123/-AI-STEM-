<template>
  <header class="header">
    <div class="header__inner">
      <router-link class="brand" to="/" aria-label="返回首页">
        <span class="brand__badge">LAB</span>
        <div class="brand__copy">
          <div class="brand__title">图像分类实验工作台</div>
          <div class="brand__subtitle">教学实验 · 训练测试 · 结果报告</div>
        </div>
      </router-link>
      <div class="header__status" aria-label="系统状态">
        <span class="status-dot"></span>
        <span>实验环境就绪</span>
      </div>
      <nav class="nav" aria-label="主导航">
        <router-link to="/">首页</router-link>
        <router-link to="/guide">导学</router-link>
        <router-link to="/experiments">实验</router-link>
        <router-link to="/records">实验记录</router-link>
        <router-link to="/gallery">成果</router-link>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.header {
  position: sticky;
  top: 0;
  z-index: 10;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(247, 250, 253, 0.94)),
    var(--surface);
  border-bottom: 1px solid var(--border);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.9), 0 8px 22px rgba(15, 23, 42, 0.05);
  backdrop-filter: blur(16px);
}

.header__inner {
  max-width: 1320px;
  margin: 0 auto;
  min-height: 66px;
  padding: 9px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 18px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  max-width: 100%;
  color: var(--heading);
}

.brand__badge {
  width: 48px;
  height: 36px;
  flex: 0 0 auto;
  border: 1px solid rgba(37, 99, 235, 0.38);
  border-radius: var(--radius-control);
  display: grid;
  place-items: center;
  background:
    linear-gradient(135deg, rgba(37, 99, 235, 0.96), rgba(15, 118, 110, 0.92)),
    var(--instrument);
  color: #fff;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.22), 0 4px 12px rgba(37, 99, 235, 0.16);
  font-weight: 800;
  font-size: 12px;
  letter-spacing: 0.04em;
}

.brand__copy {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.brand__title {
  overflow: hidden;
  font-size: 15px;
  font-weight: 800;
  line-height: 1.25;
  letter-spacing: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.brand__subtitle {
  color: var(--muted);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.3;
}

.header__status {
  margin-left: auto;
  min-height: 32px;
  padding: 7px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-control);
  background: var(--readout);
  color: var(--muted);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 750;
  white-space: nowrap;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--success);
  box-shadow: 0 0 0 4px rgba(15, 118, 110, 0.13);
}

.nav {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  border: 1px solid var(--border);
  border-radius: var(--radius-control);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.72), transparent),
    var(--panel-header);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72);
}

.nav a {
  min-height: 32px;
  padding: 8px 12px;
  border: 1px solid transparent;
  border-radius: var(--radius-control);
  color: var(--muted);
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
  transition:
    background-color 0.18s ease,
    border-color 0.18s ease,
    color 0.18s ease;
}

.nav a:hover {
  border-color: var(--border);
  background: var(--surface);
  color: var(--text);
}

.nav .router-link-active {
  border-color: rgba(37, 99, 235, 0.28);
  background: var(--surface);
  color: var(--primary);
  box-shadow: inset 0 -2px 0 var(--primary), 0 1px 2px rgba(15, 23, 42, 0.04);
}

@media (max-width: 1040px) {
  .header__status {
    display: none;
  }
}

@media (max-width: 900px) {
  .header__inner {
    padding: 12px 16px;
    align-items: flex-start;
    flex-direction: column;
    gap: 10px;
  }

  .nav {
    width: 100%;
    overflow-x: auto;
  }

  .nav a {
    flex: 0 0 auto;
  }
}

@media (max-width: 480px) {
  .brand__badge {
    width: 42px;
    height: 32px;
  }

  .brand__title {
    font-size: 15px;
  }

  .brand__subtitle {
    font-size: 11px;
  }
}
</style>
