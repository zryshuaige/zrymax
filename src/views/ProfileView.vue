<script setup lang="ts">
import { computed, ref } from 'vue'
import { personalAchievements, personalProfile, type AchievementItem } from '../data/siteData'
import { getCardColorStyle } from '../utils/cardPalette'

const activeAchievement = ref<AchievementItem | null>(null)
const detailMarkdown = ref('')
const detailLoading = ref(false)
const detailError = ref('')

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const formatInline = (line: string) => {
  const escaped = escapeHtml(line)
  return escaped
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
}

const markdownToHtml = (markdown: string) => {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const htmlParts: string[] = []
  let inList = false

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) {
      if (inList) {
        htmlParts.push('</ul>')
        inList = false
      }
      continue
    }

    const listMatch = line.match(/^-\s+(.+)/)
    if (listMatch) {
      if (!inList) {
        htmlParts.push('<ul>')
        inList = true
      }
      htmlParts.push(`<li>${formatInline(listMatch[1])}</li>`)
      continue
    }

    if (inList) {
      htmlParts.push('</ul>')
      inList = false
    }

    if (line.startsWith('### ')) {
      htmlParts.push(`<h3>${formatInline(line.slice(4))}</h3>`)
      continue
    }
    if (line.startsWith('## ')) {
      htmlParts.push(`<h2>${formatInline(line.slice(3))}</h2>`)
      continue
    }
    if (line.startsWith('# ')) {
      htmlParts.push(`<h1>${formatInline(line.slice(2))}</h1>`)
      continue
    }
    if (line.startsWith('> ')) {
      htmlParts.push(`<blockquote>${formatInline(line.slice(2))}</blockquote>`)
      continue
    }

    htmlParts.push(`<p>${formatInline(line)}</p>`)
  }

  if (inList) {
    htmlParts.push('</ul>')
  }

  return htmlParts.join('')
}

const detailHtml = computed(() => markdownToHtml(detailMarkdown.value))

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
}
</script>

<template>
  <section class="page profile-view">
    <article class="glass-card profile-intro-card">
      <h1>个人简介</h1>
      <p>
        我是 {{ personalProfile.name }}，长期关注前端工程化与产品体验，注重把技术能力转化成稳定、易用、可持续迭代的实际成果。
      </p>
    </article>

    <article class="glass-card profile-achievement-card">
      <h2>荣誉与经历</h2>
      <div class="achievement-grid">
        <button
          v-for="(item, index) in personalAchievements"
          :key="item.title"
          type="button"
          class="achievement-item achievement-trigger color-card"
          :style="getCardColorStyle(index)"
          @click="openAchievement(item)"
        >
          <span class="achievement-icon">{{ item.icon }}</span>
          <div class="achievement-body">
            <p class="achievement-title">{{ item.title }}</p>
            <p class="achievement-subtitle">{{ item.subtitle }}</p>
          </div>
        </button>
      </div>
    </article>

    <div v-if="activeAchievement" class="achievement-modal-mask" @click.self="closeAchievement">
      <section :class="['achievement-modal glass-card', `theme-${activeAchievement.theme}`]">
        <header class="achievement-modal-head">
          <div class="achievement-modal-title-wrap">
            <span class="achievement-modal-icon">{{ activeAchievement.icon }}</span>
            <div>
              <h3>{{ activeAchievement.title }}</h3>
              <p>{{ activeAchievement.subtitle }}</p>
            </div>
          </div>
          <button type="button" class="achievement-close-btn" @click="closeAchievement">关闭</button>
        </header>
        <div class="achievement-modal-content">
          <p v-if="detailLoading" class="achievement-status">加载中...</p>
          <p v-else-if="detailError" class="achievement-status error">{{ detailError }}</p>
          <article v-else class="achievement-markdown" v-html="detailHtml"></article>
        </div>
      </section>
    </div>
  </section>
</template>
