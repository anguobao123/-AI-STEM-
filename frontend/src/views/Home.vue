<script setup>
import { useExperimentStore } from "../store/experimentStore";

const store = useExperimentStore();
</script>

<template>
  <section class="home-page page-layout">
    <header class="hero">
      <span class="hero-kicker">{{ store.courseSubtitle }}</span>
      <h1 class="hero-title">{{ store.courseTitle }}</h1>
      <p class="hero-subtitle">
        数据数量、数据质量和训练方式，会怎样影响 AI 图像分类模型的识别效果？
        在这门课程中，你将亲手准备数据、训练模型、分析结果，像真正的 AI 工程师一样思考。
      </p>
      <div class="hero-actions">
        <router-link to="/guide" class="hero-link">
          <el-button type="primary" size="large">开始课程</el-button>
        </router-link>
        <router-link to="/experiments" class="hero-link">
          <el-button plain size="large">直接进入实验</el-button>
        </router-link>
      </div>
    </header>

    <section class="stem-strip">
      <div class="stem-card" v-for="(desc, key) in store.stemFramework" :key="key">
        <span class="stem-label">{{ key === 'science' ? 'S' : key === 'tech' ? 'T' : key === 'engineering' ? 'E' : 'M' }}</span>
        <p>{{ desc }}</p>
      </div>
    </section>

    <section class="experiment-preview">
      <h2 class="section-title">课程实验</h2>
      <div class="experiment-grid">
        <div v-for="exp in store.experiments" :key="exp.id" class="experiment-card lab-module">
          <strong>{{ exp.title }}</strong>
          <p>{{ exp.summary }}</p>
        </div>
      </div>
    </section>

    <section class="course-flow">
      <h2 class="section-title">学习闭环</h2>
      <div class="flow-steps">
        <div class="flow-step"><span>1</span> 准备数据</div>
        <div class="flow-arrow">&rarr;</div>
        <div class="flow-step"><span>2</span> 训练模型 1.0</div>
        <div class="flow-arrow">&rarr;</div>
        <div class="flow-step"><span>3</span> 批量测试</div>
        <div class="flow-arrow">&rarr;</div>
        <div class="flow-step"><span>4</span> 分析错误</div>
        <div class="flow-arrow">&rarr;</div>
        <div class="flow-step"><span>5</span> 优化模型 2.0</div>
        <div class="flow-arrow">&rarr;</div>
        <div class="flow-step"><span>6</span> 成果展示</div>
      </div>
    </section>
  </section>
</template>

<style scoped>
.home-page {
  display: grid;
  gap: 32px;
}

.hero {
  padding: 64px 0 48px;
  text-align: center;
  display: grid;
  gap: 16px;
  justify-items: center;
}

.hero-kicker {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 18px;
  border: 1px solid var(--border-active);
  border-radius: var(--radius-control);
  background: var(--primary-soft);
  color: var(--primary);
  font-size: 14px;
  font-weight: 800;
}

.hero-title {
  max-width: 720px;
  margin: 0;
  color: var(--heading);
  font-size: 40px;
  font-weight: 800;
  line-height: 1.25;
  letter-spacing: -0.02em;
}

.hero-subtitle {
  max-width: 600px;
  margin: 0;
  color: var(--muted);
  font-size: 17px;
  line-height: 1.7;
}

.hero-actions {
  display: flex;
  gap: 12px;
}

.hero-link {
  text-decoration: none;
}

.stem-strip {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}

.stem-card {
  padding: 18px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  background: var(--surface);
  display: grid;
  gap: 8px;
  transition: border-color 0.16s ease, transform 0.16s ease;
}

.stem-card:hover {
  border-color: var(--border-active);
  transform: translateY(-2px);
}

.stem-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-control);
  background: var(--primary);
  color: #fff;
  font-size: 16px;
  font-weight: 800;
}

.stem-card p {
  margin: 0;
  color: var(--text);
  font-size: 13px;
  line-height: 1.7;
}

.section-title {
  margin: 0 0 16px;
  color: var(--heading);
  font-size: 22px;
  font-weight: 750;
}

.experiment-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.experiment-card {
  padding: 16px;
  display: grid;
  gap: 6px;
  transition: border-color 0.16s ease, transform 0.16s ease;
}

.experiment-card:hover {
  border-color: var(--border-hover);
  transform: translateY(-1px);
}

.experiment-card strong {
  color: var(--heading);
}

.experiment-card p {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.6;
}

.course-flow {
  padding-bottom: 32px;
}

.flow-steps {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  flex-wrap: wrap;
}

.flow-step {
  padding: 12px 18px;
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  background: var(--surface-alt);
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
}

.flow-step span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--primary);
  color: #fff;
  font-size: 12px;
}

.flow-arrow {
  padding: 0 8px;
  color: var(--muted);
  font-size: 20px;
}

@media (max-width: 900px) {
  .hero-title {
    font-size: 28px;
  }

  .stem-strip {
    grid-template-columns: repeat(2, 1fr);
  }

  .flow-steps {
    gap: 8px;
  }

  .flow-arrow {
    display: none;
  }
}

@media (max-width: 560px) {
  .stem-strip {
    grid-template-columns: 1fr;
  }

  .hero-actions {
    flex-direction: column;
  }
}
</style>