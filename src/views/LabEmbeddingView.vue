<script setup lang="ts">
import { useHead } from '@unhead/vue'
import { RouterLink } from 'vue-router'
import { vReveal } from '../directives'
import EmbeddingSpace from '../components/lab/EmbeddingSpace.vue'
import { DIM_NAMES } from '../data/wordVectors'

useHead({ title: '词向量空间 · ZAI LAB' })
</script>

<template>
  <section class="page lab-page">
    <nav v-reveal class="lab-breadcrumb">
      <RouterLink to="/xai" class="u-link mono">← 返回 ZAI LAB</RouterLink>
    </nav>

    <header v-reveal class="lab-page-head">
      <p class="kicker">LAB.01 · EMBEDDING SPACE</p>
      <h1>词向量空间：词与词的距离，就是语义的距离</h1>
      <p class="lab-lead">
        每个词被放进 6 个手工维度（{{ DIM_NAMES.join('、') }}）组成的坐标系。
        左侧是任选 3 维投影出的旋转星图：点可以点，球可以转；
        右侧的语义算术演示「c + (b − a)」——关系，在向量空间里是一段可以搬运的位移。
      </p>
    </header>

    <article v-reveal class="glass-card lab-stage">
      <EmbeddingSpace />
    </article>

    <footer v-reveal class="lab-note">
      <span class="kicker">DATA NOTE</span>
      <p>
        本页 55 个词的 6 维坐标为手工设计 + 确定性抖动生成的静态示意数据。
        真实的词向量（word2vec / GloVe / 大模型 embedding）有几百个维度，这里用 6 维换取可读性。
      </p>
    </footer>
  </section>
</template>

<style scoped>
.lab-page {
  display: grid;
  gap: 1.4rem;
  padding-bottom: 2rem;
}

.lab-breadcrumb {
  padding-top: 0.6rem;
}

.lab-breadcrumb .mono {
  font-size: 0.76rem;
  letter-spacing: 0.1em;
  color: var(--text-secondary);
}

.lab-page-head h1 {
  margin: 0.35rem 0 0.6rem;
  font-family: var(--font-display);
  font-size: clamp(1.5rem, 3.2vw, 2.3rem);
  line-height: 1.3;
}

.lab-lead {
  margin: 0;
  color: var(--text-secondary);
  max-width: 72ch;
  font-size: 0.96rem;
}

.lab-stage {
  padding: 1.4rem clamp(1rem, 2.5vw, 1.8rem) 1.6rem;
}

.lab-note {
  border-top: 1px solid var(--rule);
  padding-top: 1rem;
}

.lab-note p {
  margin: 0.5rem 0 0;
  color: var(--text-secondary);
  font-size: 0.86rem;
  max-width: 76ch;
}
</style>
