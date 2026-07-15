<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useHead } from '@unhead/vue'
import { personalAchievements, personalProfile, type AchievementItem } from '../data/siteData'
import { gsap, ScrollTrigger } from '../plugins/motion'
import { prefersReducedMotion } from '../composables/usePrefersReducedMotion'
import { vReveal } from '../directives'
import MarkdownDoc from '../components/MarkdownDoc.vue'

useHead({ title: '简介' })

const activeAchievement = ref<AchievementItem | null>(null)
const detailMarkdown = ref('')
const detailLoading = ref(false)
const detailError = ref('')
const readProgress = ref(0)
const readerRef = ref<HTMLElement | null>(null)

const themeTone = computed(
  () => (activeAchievement.value ? `tone-${activeAchievement.value.theme}` : '') ,
)

const openAchievement = async (item: AchievementItem) => {
  activeAchievement.value = item
  detailLoading.value = true
  detailError.value = ''
  detailMarkdown.value = ''
  try {
    const appBaseUrl = new URL(import.meta.env.BASE_URL, window.location.href)
    const detailUrl = new URL(item.detailFile, appBaseUrl).toString()
    const response = await fetch(detailUrl, { cache: 'no-cache' })
    if (!response.ok) {
      throw new Error('读取经历详情失败')
    }
    detailMarkdown.value = await response.text()
  } catch {
    detailError.value = '暂时无法读取该经历的详细内容，请稍后重试。'
  } finally {
    detailLoading.value = false
  }
}

const closeAchievement = () => {
  activeAchievement.value = null
  detailMarkdown.value = ''
  readProgress.value = 0
}

// 沉浸长读层：基于 .reader-body 滚动驱动阅读进度条
watch(activeAchievement, async (item) => {
  await nextTick()
  if (!item || prefersReducedMotion()) return
  const body = readerRef.value?.querySelector<HTMLElement>('.reader-body')
  if (!body) return
  ScrollTrigger.create({
    trigger: body,
    scroller: readerRef.value!,
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (st) => {
      readProgress.value = st.progress
    },
  })
})

const runTimelineGrow = () => {
  if (prefersReducedMotion()) return
  nextTick(() => {
    const line = document.querySelector<HTMLElement>('.timeline-axis')
    if (!line) return
    gsap.fromTo(
      line,
      { scaleY: 0 },
      {
        scaleY: 1,
        ease: 'none',
        transformOrigin: 'top',
        scrollTrigger: { trigger: '.timeline', start: 'top 70%', end: 'bottom 70%', scrub: true },
      },
    )
  })
}

onMounted(runTimelineGrow)
</script>

<template>
  <section class="page profile-view">
    <article v-reveal class="glass-card profile-intro-card">
      <h1>个人简介</h1>
      <p>
        我是 {{ personalProfile.name }}，长期关注前端工程化与产品体验，注重把技术能力转化成稳定、易用、可持续迭代的实际成果。
      </p>
    </article>

    <article class="glass-card timeline-card">
      <h2 class="timeline-title">荣誉与经历</h2>
      <div v-reveal class="timeline">
        <span class="timeline-axis" aria-hidden="true"></span>
        <button
          v-for="(item, index) in personalAchievements"
          :key="item.title"
          type="button"
          :class="['timeline-node', `theme-${item.theme}`]"
          :style="{ '--node-i': index }"
          @click="openAchievement(item)"
        >
          <span class="timeline-dot"></span>
          <span class="timeline-card">
            <span class="timeline-icon">{{ item.icon }}</span>
            <span class="timeline-text">
              <span class="timeline-node-title">{{ item.title }}</span>
              <span class="timeline-node-sub">{{ item.subtitle }}</span>
            </span>
          </span>
        </button>
      </div>
    </article>

    <Transition name="reader">
      <div v-if="activeAchievement" class="reader-mask" @click.self="closeAchievement">
        <section ref="readerRef" :class="['reader glass-card', themeTone]" data-lenis-prevent>
          <header class="reader-head">
            <div class="reader-title-wrap">
              <span class="reader-icon">{{ activeAchievement.icon }}</span>
              <div>
                <h2>{{ activeAchievement.title }}</h2>
                <p>{{ activeAchievement.subtitle }}</p>
              </div>
            </div>
            <button type="button" class="reader-close btn-icon" aria-label="关闭" @click="closeAchievement">×</button>
          </header>
          <div class="reader-progress" :style="{ '--p': readProgress * 100 + '%' }"></div>
          <div class="reader-body">
            <template v-if="detailLoading">
              <span class="skeleton skeleton-line" style="width: 42%; height: 1.4rem"></span>
              <span class="skeleton skeleton-line" style="width: 100%"></span>
              <span class="skeleton skeleton-line" style="width: 90%"></span>
              <span class="skeleton skeleton-line" style="width: 96%"></span>
              <span class="skeleton skeleton-line" style="width: 64%"></span>
            </template>
            <p v-else-if="detailError" class="reader-status error">{{ detailError }}</p>
            <MarkdownDoc v-else :source="detailMarkdown" />
          </div>
        </section>
      </div>
    </Transition>
  </section>
</template>

<style scoped>
.profile-view {
  display: grid;
  gap: 1rem;
}

.profile-intro-card {
  padding: 1.2rem;
}

.profile-intro-card h1 {
  margin: 0 0 0.5rem;
  font-size: 1.4rem;
}

.profile-intro-card p {
  margin: 0;
  color: var(--text-secondary);
}

/* ===== 时间轴 ===== */
.timeline-card {
  padding: 1.2rem;
}

.timeline-title {
  margin: 0 0 1.2rem;
  font-size: 1.2rem;
}

.timeline {
  position: relative;
  display: grid;
  gap: 1rem;
  padding-left: 2.2rem;
}

.timeline-axis {
  position: absolute;
  left: 0.6rem;
  top: 0.5rem;
  bottom: 0.5rem;
  width: 2px;
  border-radius: 2px;
  background: linear-gradient(to bottom, var(--accent), var(--accent-strong));
  transform: scaleY(0);
  transform-origin: top;
  opacity: 0.45;
}

.timeline-node {
  position: relative;
  display: block;
  border: 0;
  background: transparent;
  padding: 0;
  cursor: pointer;
  text-align: left;
  color: inherit;
}

.timeline-dot {
  position: absolute;
  left: -1.6rem;
  top: 0.85rem;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--accent);
  border: 2px solid var(--bg-primary);
  box-shadow: 0 0 0 4px rgba(47, 109, 186, 0.18);
  transition: transform var(--dur-1) var(--ease-out-cubic);
}

.timeline-node:hover .timeline-dot {
  transform: scale(1.25);
}

.timeline-card {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.85rem 1rem;
  border-radius: 14px;
  border: 1px solid var(--card-border);
  background: var(--card-bg);
  box-shadow: var(--shadow);
  transition:
    transform var(--dur-1) var(--ease-out-cubic),
    box-shadow var(--dur-1) var(--ease-out-cubic),
    border-color var(--dur-1) var(--ease-out-cubic);
}

.timeline-node:hover .timeline-card {
  transform: translateX(4px);
  border-color: var(--accent);
  box-shadow: var(--shadow-hover);
}

.timeline-icon {
  font-size: 1.4rem;
  line-height: 1;
}

.timeline-text {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.timeline-node-title {
  font-weight: 700;
  color: var(--text-primary);
}

.timeline-node-sub {
  font-size: 0.86rem;
  color: var(--text-secondary);
}

/* 主题色调点 */
.timeline-node.theme-academic .timeline-dot {
  background: #2f6dba;
}

.timeline-node.theme-modeling .timeline-dot {
  background: #7c4dff;
}

.timeline-node.theme-competition .timeline-dot {
  background: #d97706;
}

.timeline-node.theme-innovation .timeline-dot {
  background: #1f8a5b;
}

/* ===== 沉浸长读层 ===== */
.reader-mask {
  position: fixed;
  inset: 0;
  z-index: 40;
  background: rgba(8, 16, 32, 0.5);
  backdrop-filter: blur(10px);
  display: grid;
  place-items: center;
  padding: 1.5rem;
}

.reader {
  position: relative;
  width: min(820px, 96vw);
  max-height: min(86vh, 86vh);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 22px;
}

.reader-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  padding: 1.1rem 1.3rem 0.9rem;
  border-bottom: 1px solid var(--card-border);
}

.reader-title-wrap {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}

.reader-icon {
  font-size: 1.6rem;
}

.reader-title-wrap h2 {
  margin: 0;
  font-size: 1.2rem;
  font-family: var(--font-display);
}

.reader-title-wrap p {
  margin: 0.1rem 0 0;
  font-size: 0.86rem;
  color: var(--text-secondary);
}

.reader-close {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 1px solid var(--card-border);
  background: var(--card-bg);
  color: var(--text-primary);
  font-size: 1.4rem;
  line-height: 1;
  cursor: pointer;
  transition: background var(--dur-1) var(--ease-out-cubic);
}

.reader-close:hover {
  background: rgba(47, 109, 186, 0.14);
}

.reader-progress {
  position: absolute;
  left: 0;
  bottom: 0;
  height: 2px;
  width: var(--p, 0%);
  background: linear-gradient(to right, var(--accent), var(--accent-strong));
  transition: width 0.06s linear;
}

.reader-body {
  overflow-y: auto;
  padding: 1.3rem 1.5rem 1.6rem;
  color: var(--text-primary);
  line-height: 1.85;
}

.reader-body :deep(.markdown-doc) {
  max-width: none;
}

.reader-body :deep(h1),
.reader-body :deep(h2),
.reader-body :deep(h3) {
  margin-top: 1.4em;
  font-family: var(--font-display);
}

.reader-body :deep(p) {
  margin: 0.8em 0;
}

.reader-status.error {
  color: #d64545;
}

/* 主题色调内容边框 */
.reader.tone-academic {
  border-color: rgba(47, 109, 186, 0.4);
}

.reader.tone-modeling {
  border-color: rgba(124, 77, 255, 0.4);
}

.reader.tone-competition {
  border-color: rgba(217, 119, 6, 0.4);
}

.reader.tone-innovation {
  border-color: rgba(31, 138, 91, 0.4);
}

.reader-enter-active,
.reader-leave-active {
  transition: opacity var(--dur-2) var(--ease-out-cubic);
}

.reader-enter-active .reader,
.reader-leave-active .reader {
  transition:
    transform var(--dur-3) var(--ease-spring),
    opacity var(--dur-2) var(--ease-out-cubic);
}

.reader-enter-from,
.reader-leave-to {
  opacity: 0;
}

.reader-enter-from .reader,
.reader-leave-to .reader {
  transform: translateY(24px) scale(0.97);
  opacity: 0;
}
</style>