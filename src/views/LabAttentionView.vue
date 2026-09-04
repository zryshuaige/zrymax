<script setup lang="ts">
import { useHead } from '@unhead/vue'
import { RouterLink } from 'vue-router'
import { vReveal } from '../directives'
import AttentionLab from '../components/lab/AttentionLab.vue'

useHead({ title: '注意力演进 · ZAI LAB' })
</script>

<template>
  <section class="page lab-page">
    <nav v-reveal class="lab-breadcrumb">
      <RouterLink to="/xai" class="u-link mono">← 返回 ZAI LAB</RouterLink>
    </nav>

    <header v-reveal class="lab-page-head">
      <p class="kicker">LAB.02 · ATTENTION EVOLUTION</p>
      <h1>注意力演进：从各看各的，到压缩共享</h1>
      <p class="lab-lead">
        同一句话「它终于在花园里找到了猫」，四种机制给出四种目光分配。
        切换时间线上的机制，看头结构怎么变、KV cache 怎么省、注意力流怎么改道。
      </p>
    </header>

    <article v-reveal class="glass-card lab-stage">
      <AttentionLab />
    </article>

    <footer v-reveal class="lab-note">
      <span class="kicker">DATA NOTE</span>
      <p>
        本页注意力矩阵为手工设计的示意模式；KV cache 数字按同等头数与头维估算（MHA = 100%），
        用于建立结构直觉而非精确测量。
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
