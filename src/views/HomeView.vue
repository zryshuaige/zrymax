<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useHead } from '@unhead/vue'
import { featuredProjects, heroStats, personalHighlights, personalProfile } from '../data/siteData'
import { fetchHitokoto, fetchWeather, weatherCodeToText } from '../services/apis'
import { getCardColorStyle } from '../utils/cardPalette'
import { gsap } from '../plugins/motion'
import { prefersReducedMotion } from '../composables/usePrefersReducedMotion'
import { vReveal, vMagnetic } from '../directives'
import AtroposCard from '../components/AtroposCard.vue'
import Splitting from 'splitting'
import siteLogo from '../assets/logo.png'

useHead({ title: '主页' })

const quoteLoading = ref(true)
const quoteText = ref('')
const quoteSource = ref('')
const weatherLoading = ref(true)
const weatherText = ref('')
const windText = ref('')

const heroGrid = ref<HTMLElement | null>(null)

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

const loadLiveContent = async () => {
  try {
    const quote = await fetchHitokoto()
    quoteText.value = quote.hitokoto
    quoteSource.value = quote.from_who ? `${quote.from} · ${quote.from_who}` : quote.from
  } catch {
    quoteText.value = '保持热爱，奔赴下一场山海。'
    quoteSource.value = 'zrymax'
  } finally {
    quoteLoading.value = false
  }

  try {
    const weather = await fetchWeather(30.2741, 120.1551)
    weatherText.value = `${weatherCodeToText(weather.current.weather_code)} · ${Math.round(weather.current.temperature_2m)}°C`
    windText.value = `风速 ${Math.round(weather.current.wind_speed_10m)} km/h`
  } catch {
    weatherText.value = '天气服务暂不可用'
    windText.value = '请稍后刷新重试'
  } finally {
    weatherLoading.value = false
  }
}

const runHeroEntrance = () => {
  if (prefersReducedMotion() || !heroGrid.value) return
  const root = heroGrid.value

  const h1 = root.querySelector<HTMLElement>('.profile-card h1')
  if (h1) Splitting({ target: h1, by: 'chars' })
  const chars = h1 ? Array.from(h1.querySelectorAll<HTMLElement>('.char')) : []

  const lines = ['.greeting', '.tagline', '.action-row', '.meta-list']
    .map((selector) => root.querySelector<HTMLElement>(selector))
    .filter((el): el is HTMLElement => el !== null)

  const avatar = root.querySelector<HTMLElement>('.avatar-ring')
  const live = root.querySelector<HTMLElement>('.live-card')

  gsap.set(chars, { opacity: 0, y: 24, rotate: 6 })
  gsap.set(lines, { opacity: 0, y: 20 })
  if (avatar) gsap.set(avatar, { opacity: 0, scale: 0.82, rotate: -6 })
  if (live) gsap.set(live, { opacity: 0, x: 40 })

  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
  if (avatar) tl.to(avatar, { opacity: 1, scale: 1, rotate: 0, duration: 0.7 })
  if (chars.length) tl.to(chars, { opacity: 1, y: 0, rotate: 0, duration: 0.6, stagger: 0.07 }, '-=0.35')
  if (lines.length) tl.to(lines, { opacity: 1, y: 0, duration: 0.55, stagger: 0.1 }, '-=0.3')
  if (live) tl.to(live, { opacity: 1, x: 0, duration: 0.7 }, '-=0.5')
}

// hero 随滚动视差上移 + 淡出，制造纵深
const runHeroParallax = () => {
  if (prefersReducedMotion() || !heroGrid.value) return
  const profile = heroGrid.value.querySelector<HTMLElement>('.profile-card')
  const live = heroGrid.value.querySelector<HTMLElement>('.live-card')
  if (profile) {
    gsap.to(profile, {
      yPercent: -14,
      opacity: 0.4,
      ease: 'none',
      scrollTrigger: { trigger: heroGrid.value, start: 'top top', end: 'bottom top', scrub: true },
    })
  }
  if (live) {
    gsap.to(live, {
      yPercent: -8,
      ease: 'none',
      scrollTrigger: { trigger: heroGrid.value, start: 'top top', end: 'bottom top', scrub: true },
    })
  }
}

onMounted(() => {
  void loadLiveContent()
  runHeroEntrance()
  runHeroParallax()
})
</script>

<template>
  <section class="page home-view">
    <div class="hero-grid" ref="heroGrid">
      <AtroposCard inner-class="glass-card profile-card" :rotate-x-max="6" :rotate-y-max="6" :active-offset="24">
        <div class="avatar-ring" aria-label="ZRY logo">
          <img class="hero-logo" :src="siteLogo" alt="zry logo" />
        </div>
        <p class="greeting">{{ greeting }}</p>
        <h1>{{ personalProfile.name }}</h1>
        <p class="tagline">{{ personalProfile.tagline }}</p>

        <div class="action-row">
          <RouterLink to="/navigator" class="btn primary" v-magnetic>进入导航页</RouterLink>
          <a class="btn blog-btn" v-magnetic :href="personalProfile.blog" target="_blank" rel="noreferrer">访问主站</a>
          <a class="btn github-btn" v-magnetic :href="personalProfile.github" target="_blank" rel="noreferrer">GitHub</a>
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
      </AtroposCard>

      <article class="glass-card live-card">
        <div class="quote-card">
          <h2 class="card-title">📝 今日一句</h2>
          <template v-if="quoteLoading">
            <span class="skeleton skeleton-line" style="width: 92%"></span>
            <span class="skeleton skeleton-line" style="width: 64%"></span>
          </template>
          <template v-else>
            <p class="quote-text">{{ quoteText }}</p>
            <p class="quote-source">来源：{{ quoteSource }}</p>
          </template>
        </div>

        <div class="weather-card">
          <h2 class="card-title">🌤️ 杭州天气</h2>
          <template v-if="weatherLoading">
            <span class="skeleton skeleton-line" style="width: 50%; height: 1.1rem"></span>
            <span class="skeleton skeleton-line" style="width: 40%"></span>
          </template>
          <template v-else>
            <p class="weather-value">{{ weatherText }}</p>
            <p class="weather-detail">{{ windText }}</p>
          </template>
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
      <article v-reveal class="glass-card skills-card">
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

      <article v-reveal class="glass-card projects-card">
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
