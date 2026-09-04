<script setup lang="ts">
import { useHead } from '@unhead/vue'
import { RouterLink } from 'vue-router'
import { vReveal } from '../directives'

useHead({ title: 'ZAI LAB' })

// 每个实验是一个隔离的独立页面；badge 色沿用词向量簇色/信号色，呼应各实验的视觉主题
const labs = [
  {
    to: '/xai/embedding',
    no: 'LAB.01',
    color: 'var(--accent)',
    title: '词向量空间',
    desc: '把 55 个词撒进 6 维语义空间：相似的词聚成星座；「词 − 词 + 词」的语义算术，能走出一条可以搬运的关系路径。',
    points: '可拖拽旋转的 3D 星图 · 55 词 6 维 · 3 组语义算术分步演示',
  },
  {
    to: '/xai/attention',
    no: 'LAB.02',
    color: 'var(--signal)',
    title: '注意力演进',
    desc: 'MHA → MQA → GQA → MLA：同一句话在四种机制下如何分配目光，KV cache 又是怎么一路瘦身到 9.4% 的。',
    points: '头结构连线图 · 8×8 注意力热力图 · 逐 token 注意力流播放',
  },
]
</script>

<template>
  <section class="page lab-hub">
    <!-- ===== Hero ===== -->
    <header v-reveal class="lab-hero">
      <p class="kicker">ZAI LAB · INTERACTIVE NOTES</p>
      <h1 class="lab-title">ZAI LAB</h1>
      <p class="lab-sub">
        把 NLP 概念拆成可以上手摆弄的小实验。每个实验是一个独立页面：
        可播放、可单步、可重置，随开随看。
      </p>
      <p class="lab-meta mono">纯前端 · 静态数据 · 零模型 · 零外部请求</p>
    </header>

    <!-- ===== 实验卡片 ===== -->
    <div class="lab-cards">
      <RouterLink v-for="(lab, i) in labs" :key="lab.to" v-reveal class="lab-card" :to="lab.to">
        <span class="lab-card-no mono" :style="{ background: lab.color }">{{ lab.no }}</span>
        <span class="lab-card-index mono" aria-hidden="true">{{ String(i + 1).padStart(2, '0') }}</span>
        <h2 class="lab-card-title">{{ lab.title }}</h2>
        <p class="lab-card-desc">{{ lab.desc }}</p>
        <p class="lab-card-points">{{ lab.points }}</p>
        <span class="lab-card-go mono">进入实验 <span class="ext-arrow">→</span></span>
      </RouterLink>
    </div>

    <!-- ===== 页脚说明 ===== -->
    <footer v-reveal class="lab-hub-foot">
      <span class="kicker">DATA NOTE</span>
      <p>
        所有实验均为预计算的静态示意数据：零模型、零下载、零外部请求，数值用于建立结构直觉而非精确测量。
        实验内快捷键：<span class="mono">空格</span> 播放/暂停 · <span class="mono">→</span> 单步 ·
        <span class="mono">R</span> 重置。
      </p>
    </footer>
  </section>
</template>

<style scoped>
.lab-hub {
  display: grid;
  gap: 2.2rem;
  padding-bottom: 2rem;
}

/* ===== Hero ===== */
.lab-hero {
  padding-top: 1.2rem;
}

.lab-title {
  margin: 0.35rem 0 0.6rem;
  font-family: var(--font-display);
  font-size: clamp(2.6rem, 7vw, 5rem);
  line-height: 1.05;
  letter-spacing: 0.01em;
}

.lab-sub {
  margin: 0;
  color: var(--text-secondary);
  max-width: 62ch;
  font-size: 1.02rem;
}

.lab-meta {
  margin: 0.9rem 0 0;
  font-size: 0.74rem;
  letter-spacing: 0.14em;
  color: var(--accent);
}

/* ===== 实验卡片 ===== */
.lab-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.1rem;
}

.lab-card {
  position: relative;
  display: grid;
  gap: 0.55rem;
  align-content: start;
  padding: 1.3rem 1.3rem 1.1rem;
  border: 1px solid var(--rule);
  background: var(--paper-raised);
  color: var(--text-primary);
  text-decoration: none;
  transition:
    border-color var(--dur-1) var(--ease-out-cubic),
    transform var(--dur-1) var(--ease-out-cubic),
    background var(--dur-1) var(--ease-out-cubic);
}

.lab-card:hover {
  border-color: var(--accent);
  transform: translateY(-4px);
  background: var(--accent-soft);
}

.lab-card-no {
  justify-self: start;
  padding: 0.28em 0.7em;
  font-size: 0.7rem;
  letter-spacing: 0.12em;
  font-weight: 700;
  color: var(--signal-ink);
}

.lab-card:first-child .lab-card-no {
  color: var(--paper);
}

.lab-card-index {
  position: absolute;
  top: 0.9rem;
  right: 1.1rem;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--rule-soft);
  line-height: 1;
}

.lab-card-title {
  margin: 0.2rem 0 0;
  font-family: var(--font-display);
  font-size: 1.35rem;
  line-height: 1.3;
}

.lab-card-desc {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
  line-height: 1.65;
}

.lab-card-points {
  margin: 0;
  font-size: 0.78rem;
  color: var(--ink-soft);
}

.lab-card-go {
  margin-top: 0.35rem;
  font-size: 0.74rem;
  letter-spacing: 0.12em;
  color: var(--accent);
  font-weight: 700;
}

.lab-card .ext-arrow {
  display: inline-block;
  transition: transform var(--dur-1) var(--ease-out-cubic);
}

.lab-card:hover .ext-arrow {
  transform: translateX(3px);
}

/* ===== 页脚说明 ===== */
.lab-hub-foot {
  border-top: 1px solid var(--rule);
  padding-top: 1rem;
}

.lab-hub-foot p {
  margin: 0.5rem 0 0;
  color: var(--text-secondary);
  font-size: 0.86rem;
  max-width: 76ch;
}

.lab-hub-foot .mono {
  color: var(--accent);
  font-size: 0.8rem;
}

@media (max-width: 760px) {
  .lab-cards {
    grid-template-columns: 1fr;
  }
}
</style>
