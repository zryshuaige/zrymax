<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { featuredProjects, heroStats, personalHighlights, personalProfile } from '../data/siteData'
import { fetchHitokoto, fetchWeather, weatherCodeToText } from '../services/apis'
import { getCardColorStyle } from '../utils/cardPalette'

const quoteText = ref('正在加载今日一句...')
const quoteSource = ref('Hitokoto')
const weatherText = ref('天气加载中...')
const windText = ref('请稍候')

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 6) return '夜深了，灵感还在线'
  if (hour < 12) return '早上好，今天继续发光'
  if (hour < 18) return '下午好，保持专注节奏'
  return '晚上好，适合打磨细节'
})

const profileMetaItems = computed(() => [
  `👨‍💻 ${personalProfile.role}`,
  `📍 ${personalProfile.location}`,
  `📮 ${personalProfile.email}`,
  '🧭 多页面导航 + 个人主页',
])

onMounted(async () => {
  try {
    const quote = await fetchHitokoto()
    quoteText.value = quote.hitokoto
    quoteSource.value = quote.from_who ? `${quote.from} · ${quote.from_who}` : quote.from
  } catch {
    quoteText.value = '保持热爱，奔赴下一场山海。'
    quoteSource.value = 'zrymax'
  }

  try {
    const weather = await fetchWeather(30.2741, 120.1551)
    weatherText.value = `${weatherCodeToText(weather.current.weather_code)} · ${Math.round(weather.current.temperature_2m)}°C`
    windText.value = `风速 ${Math.round(weather.current.wind_speed_10m)} km/h`
  } catch {
    weatherText.value = '天气服务暂不可用'
    windText.value = '请稍后刷新重试'
  }
})
</script>

<template>
  <section class="page home-view">
    <div class="hero-grid">
      <article class="glass-card profile-card">
        <div class="avatar-ring">ZR</div>
        <p class="greeting">{{ greeting }}</p>
        <h1>{{ personalProfile.name }}</h1>
        <p class="tagline">{{ personalProfile.tagline }}</p>

        <div class="action-row">
          <RouterLink to="/navigator" class="btn primary">进入导航页</RouterLink>
          <a class="btn ghost" :href="personalProfile.blog" target="_blank" rel="noreferrer">访问主站</a>
          <a class="btn ghost" :href="personalProfile.github" target="_blank" rel="noreferrer">GitHub</a>
        </div>

        <ul class="meta-list">
          <li
            v-for="(item, index) in profileMetaItems"
            :key="item"
            class="color-card"
            :style="getCardColorStyle(index)"
          >
            {{ item }}
          </li>
        </ul>
      </article>

      <article class="glass-card live-card">
        <div class="quote-card">
          <h2 class="card-title">📝 今日一句</h2>
          <p class="quote-text">{{ quoteText }}</p>
          <p class="quote-source">来源：{{ quoteSource }}</p>
        </div>

        <div class="weather-card">
          <h2 class="card-title">🌤️ 杭州天气</h2>
          <p class="weather-value">{{ weatherText }}</p>
          <p class="weather-detail">{{ windText }}</p>
        </div>

        <div class="stat-grid">
          <div
            v-for="(item, index) in heroStats"
            :key="item.label"
            class="stat-card color-card"
            :style="getCardColorStyle(index)"
          >
            <div class="stat-value">{{ item.value }}</div>
            <div class="stat-label">{{ item.label }}</div>
          </div>
        </div>
      </article>
    </div>

    <div class="home-bottom-grid">
      <article class="glass-card skills-card">
        <h2 class="skills-title">🙋 个人速览</h2>
        <ul class="highlight-list">
          <li
            v-for="(item, index) in personalHighlights"
            :key="item"
            class="highlight-item color-card"
            :style="getCardColorStyle(index)"
          >
            {{ item }}
          </li>
        </ul>
      </article>

      <article class="glass-card projects-card">
        <h2 class="projects-title">🚀 项目片段</h2>
        <div class="project-list">
          <div
            v-for="(project, index) in featuredProjects"
            :key="project.name"
            class="project-item color-card"
            :style="getCardColorStyle(index)"
          >
            <div class="project-top">
              <span class="project-name">{{ project.name }}</span>
              <span class="project-meta">{{ project.stack }}</span>
            </div>
            <p class="project-desc">{{ project.desc }}</p>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>
