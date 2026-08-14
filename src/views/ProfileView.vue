<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { useHead } from '@unhead/vue'
import { personalAchievements, internships, personalProfile, type AchievementItem } from '../data/siteData'
import { vReveal } from '../directives'
import MarkdownDoc from '../components/MarkdownDoc.vue'

useHead({ title: '个人简介' })

const activeAchievement = ref<AchievementItem | null>(null)
const detailMarkdown = ref('')
const detailLoading = ref(false)
const detailError = ref('')
const readProgress = ref(0)
const readerRef = ref<HTMLElement | null>(null)

const themeLabels: Record<AchievementItem['theme'], string> = {
  academic: 'Paper',
  modeling: 'Modeling',
  competition: 'Contest',
  innovation: 'Venture',
}

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

let scrollCleanup: (() => void) | null = null

// 阅读进度：原生滚动监听，零依赖
watch(activeAchievement, async (item) => {
  scrollCleanup?.()
  scrollCleanup = null
  if (!item) return
  await nextTick()
  const body = readerRef.value?.querySelector<HTMLElement>('.reader-body')
  if (!body) return
  const onScroll = () => {
    const max = body.scrollHeight - body.clientHeight
    readProgress.value = max > 0 ? Math.min(1, body.scrollTop / max) : 1
  }
  body.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
  scrollCleanup = () => body.removeEventListener('scroll', onScroll)
})
</script>

<template>
  <section class="page">
    <header class="profile-lede">
      <span class="kicker">PROFILE · 个人档案</span>
      <h1>个人简介</h1>
      <p class="lede-text">
        我是 {{ personalProfile.name }}，目前在吉利担任数智化实习生，
        此前在海康机器人负责技术文档开发。专注 AI 应用工程 ——
        把大模型与智能算法落到真实可用的产品里，从 LLM 应用编排、
        RAG 检索增强到 Agent 工作流与前端体验。
        研究背景为{{ personalProfile.research }}，现居{{ personalProfile.location }}。
      </p>
    </header>

    <div v-reveal class="honor-list">
      <div class="col-head" style="margin: 1.4rem 0 0.2rem">
        <h2>实习经历</h2>
        <span class="col-no">{{ internships.length }} 段</span>
      </div>
      <div v-for="(job, index) in internships" :key="job.org" class="honor-row static-row">
        <span class="honor-no">{{ String(index + 1).padStart(2, '0') }}</span>
        <span class="honor-title">{{ job.org }} · {{ job.role }}</span>
        <span class="honor-sub">{{ job.current ? '在职' : '过往' }}</span>
        <span :class="['honor-cat', { 'cat-current': job.current }]">{{ job.period }}</span>
      </div>
    </div>

    <div v-reveal class="honor-list">
      <div class="col-head" style="margin: 1.4rem 0 0.2rem">
        <h2>荣誉与经历</h2>
        <span class="col-no">{{ personalAchievements.length }} 条存档</span>
      </div>
      <button
        v-for="(item, index) in personalAchievements"
        :key="item.id"
        type="button"
        class="honor-row"
        @click="openAchievement(item)"
      >
        <span class="honor-no">{{ String(index + 1).padStart(2, '0') }}</span>
        <span class="honor-title">{{ item.title }}</span>
        <span class="honor-sub">{{ item.subtitle }}</span>
        <span class="honor-cat">{{ themeLabels[item.theme] }}</span>
      </button>
    </div>

    <Transition name="route-rise">
      <div v-if="activeAchievement" class="reader-mask" @click.self="closeAchievement">
        <section ref="readerRef" class="reader" data-lenis-prevent>
          <header class="reader-head">
            <div>
              <h2>{{ activeAchievement.title }}</h2>
              <p class="reader-sub">{{ activeAchievement.subtitle }} · 详情存档</p>
            </div>
            <button type="button" class="reader-close" aria-label="关闭" @click="closeAchievement">×</button>
          </header>
          <div class="reader-progress" :style="{ '--p': readProgress * 100 + '%' }"></div>
          <div class="reader-body">
            <template v-if="detailLoading">
              <span class="skeleton-line" style="width: 42%; height: 1.4rem"></span>
              <span class="skeleton-line" style="width: 100%"></span>
              <span class="skeleton-line" style="width: 90%"></span>
              <span class="skeleton-line" style="width: 96%"></span>
              <span class="skeleton-line" style="width: 64%"></span>
            </template>
            <p v-else-if="detailError" class="reader-status error">{{ detailError }}</p>
            <MarkdownDoc v-else :source="detailMarkdown" />
          </div>
        </section>
      </div>
    </Transition>
  </section>
</template>
