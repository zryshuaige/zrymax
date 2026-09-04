<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useHead } from '@unhead/vue'
import {
  featuredProjects,
  heroStats,
  internships,
  personalHighlights,
  personalProfile,
} from '../data/siteData'
import { fetchHitokoto, weatherCodeToText } from '../services/apis'
import { useObservatory } from '../composables/useObservatory'
import { vReveal } from '../directives'

useHead({ title: '首页' })

const { clockText, dateLine, greeting, temperature, weatherCode, windText } = useObservatory()

const conditionText = computed(() =>
  weatherCode.value === null ? '读取中' : weatherCodeToText(weatherCode.value),
)

// 手绘风天气符号（stroke 线稿，随字色）
const glyph = computed(() => {
  const c = weatherCode.value
  if (c === null) return 'loading'
  if (c === 0) return 'sun'
  if (c === 1 || c === 2) return 'cloud-sun'
  if (c === 3) return 'cloud'
  if (c === 45 || c === 48) return 'fog'
  if (c >= 51 && c <= 67) return 'rain'
  if (c >= 71 && c <= 77) return 'snow'
  if (c >= 80 && c <= 82) return 'rain'
  if (c >= 95) return 'storm'
  return 'cloud'
})

const quoteLoading = ref(true)
const quoteText = ref('')
const quoteSource = ref('')
let quoteBusy = false

const loadQuote = async () => {
  if (quoteBusy) return
  quoteBusy = true
  quoteLoading.value = true
  try {
    const quote = await fetchHitokoto()
    quoteText.value = quote.hitokoto
    quoteSource.value = quote.from_who ? `${quote.from} · ${quote.from_who}` : quote.from
  } catch {
    quoteText.value = '保持热爱，奔赴下一场山海。'
    quoteSource.value = '编辑部寄语'
  } finally {
    quoteLoading.value = false
    quoteBusy = false
  }
}

onMounted(() => {
  void loadQuote()
})
</script>

<template>
  <section class="page">
    <div class="hero">
      <div class="hero-kicker">
        <span>{{ greeting }}</span>
        <span>数字温室 · DIGITAL GREENHOUSE</span>
      </div>

      <!-- 主体：身份 + 观测台 -->
      <div class="hero-main">
        <div class="hero-identity">
          <span class="kicker">IDENTITY · 身份</span>
          <h1 class="hero-name-compact">ASTER<sup>®</sup></h1>
          <p class="hero-role">AI 应用工程师</p>
          <ul class="hero-interns">
            <li v-for="job in internships" :key="job.org">
              <span class="intern-org">{{ job.org }}</span>
              <span class="intern-role">{{ job.role }}</span>
              <span :class="['intern-badge', { current: job.current }]">{{ job.period }}</span>
            </li>
          </ul>
        </div>

        <div class="obs-panel">
          <div class="obs-cell">
            <span class="kicker">LOCAL TIME · 本地时</span>
            <div class="obs-big mono">{{ clockText }}</div>
            <div class="obs-sub">{{ dateLine }}</div>
          </div>
          <div class="obs-cell">
            <span class="kicker">HANGZHOU · 气象</span>
            <div class="obs-weather-row">
              <span class="obs-big">{{ temperature === null ? '—' : temperature }}<span class="obs-deg">°C</span></span>
              <svg class="obs-glyph" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true">
                <template v-if="glyph === 'sun'">
                  <circle cx="16" cy="16" r="6" />
                  <path d="M16 3v4M16 25v4M3 16h4M25 16h4M6.8 6.8l2.8 2.8M22.4 22.4l2.8 2.8M25.2 6.8l-2.8 2.8M9.6 22.4l-2.8 2.8" />
                </template>
                <template v-else-if="glyph === 'cloud-sun'">
                  <circle cx="11" cy="10" r="4" />
                  <path d="M11 2v2.5M3 10h2.5M5.2 4.2l1.8 1.8" />
                  <path d="M12 24h12a5 5 0 0 0 .8-9.9A7 7 0 0 0 11 16.5 4.5 4.5 0 0 0 12 24Z" />
                </template>
                <template v-else-if="glyph === 'cloud'">
                  <path d="M8 24h15a6 6 0 0 0 1-11.9A8.5 8.5 0 0 0 7.5 14 5.5 5.5 0 0 0 8 24Z" />
                </template>
                <template v-else-if="glyph === 'fog'">
                  <path d="M8 20h15a6 6 0 0 0 1-11.9A8.5 8.5 0 0 0 7.5 10 5.5 5.5 0 0 0 8 20Z" />
                  <path d="M6 25h20M10 29h12" />
                </template>
                <template v-else-if="glyph === 'rain'">
                  <path d="M8 18h15a6 6 0 0 0 1-11.9A8.5 8.5 0 0 0 7.5 8 5.5 5.5 0 0 0 8 18Z" />
                  <path d="M11 22l-1.5 4M17 22l-1.5 4M23 22l-1.5 4" />
                </template>
                <template v-else-if="glyph === 'snow'">
                  <path d="M8 18h15a6 6 0 0 0 1-11.9A8.5 8.5 0 0 0 7.5 8 5.5 5.5 0 0 0 8 18Z" />
                  <path d="M11 23v.5M17 25v.5M23 23v.5M14 22v.5M20 22v.5" />
                </template>
                <template v-else-if="glyph === 'storm'">
                  <path d="M8 16h15a6 6 0 0 0 1-11.9A8.5 8.5 0 0 0 7.5 6 5.5 5.5 0 0 0 8 16Z" />
                  <path d="M17 16l-4 7h4l-2 6 6-8h-4l3-5" />
                </template>
                <template v-else>
                  <circle cx="16" cy="16" r="6" stroke-dasharray="2 3" />
                </template>
              </svg>
            </div>
            <div class="obs-sub">{{ conditionText }}<template v-if="windText"> · {{ windText }}</template></div>
          </div>
          <div class="obs-cell">
            <span class="kicker">LOCATION · 坐标</span>
            <div class="obs-mid">杭州 · 中国</div>
            <div class="obs-sub mono">30.2741°N 120.1551°E</div>
            <div class="obs-sub mono">UTC+8 · 中国标准时</div>
          </div>
        </div>
      </div>

      <!-- 信息带：研究 / 通讯 / 站内 -->
      <div class="hero-strap">
        <div class="hero-strap-cell">
          <span class="kicker">研究 / Research</span>
          <p>{{ personalProfile.research }}</p>
        </div>
        <div class="hero-strap-cell">
          <span class="kicker">通讯 / Contact</span>
          <p>{{ personalProfile.location }}<br />{{ personalProfile.email }}</p>
        </div>
        <div class="hero-strap-cell">
          <span class="kicker">数据 / Stats</span>
          <div class="strap-stats">
            <span v-for="item in heroStats" :key="item.label" class="strap-stat">
              <b class="mono">{{ item.value }}</b> {{ item.label }}
            </span>
          </div>
        </div>
      </div>

      <!-- 今日一句 + 出口 -->
      <div class="hero-cols">
        <div class="hero-quote">
          <span class="kicker">今日一句 · Quote of the Day</span>
          <template v-if="quoteLoading">
            <span class="skeleton-line" style="width: 88%; margin-top: 1rem"></span>
            <span class="skeleton-line" style="width: 56%"></span>
          </template>
          <template v-else>
            <blockquote>{{ quoteText }}</blockquote>
            <p class="quote-source">—— {{ quoteSource }}</p>
          </template>
          <button class="btn btn-outline quote-refresh" type="button" :disabled="quoteLoading" @click="loadQuote">
            换一句
          </button>
        </div>

        <div class="hero-side">
          <div class="hero-actions">
            <RouterLink to="/navigator" class="btn primary">
              <span>进入导航索引</span><span class="ext-arrow">→</span>
            </RouterLink>
            <a class="btn" :href="personalProfile.blog" target="_blank" rel="noreferrer">
              <span>访问主站博客</span><span class="ext-arrow">↗</span>
            </a>
            <a class="btn" :href="personalProfile.github" target="_blank" rel="noreferrer">
              <span>GitHub 档案</span><span class="ext-arrow">↗</span>
            </a>
            <RouterLink to="/xai" class="btn">
              <span>进入 ZAI 实验室</span><span class="ext-arrow">→</span>
            </RouterLink>
          </div>
        </div>
      </div>
    </div>

    <!-- 二栏：速览与项目 -->
    <div class="home-grid">
      <div v-reveal class="home-col">
        <div class="col-head">
          <h2>个人速览</h2>
          <span class="col-no">SECTION A</span>
        </div>
        <ol class="brief-list">
          <li v-for="(item, index) in personalHighlights" :key="item" class="brief-item">
            <span class="brief-no">{{ String(index + 1).padStart(2, '0') }}</span>
            <p class="brief-text">{{ item }}</p>
          </li>
        </ol>
      </div>

      <div v-reveal class="home-col">
        <div class="col-head">
          <h2>项目片段</h2>
          <span class="col-no">SECTION B</span>
        </div>
        <div>
          <div v-for="project in featuredProjects" :key="project.name" class="project-row">
            <div class="project-top">
              <span class="project-name">{{ project.name }}</span>
              <span class="project-stack">{{ project.stack }}</span>
            </div>
            <p class="project-desc">{{ project.desc }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
