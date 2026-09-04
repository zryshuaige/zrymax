<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { useHead } from '@unhead/vue'
import InkCursor from './components/InkCursor.vue'
import SkyField from './components/SkyField.vue'
import FooterWordmark from './components/FooterWordmark.vue'
import { useLenis } from './composables/useLenis'

type ThemeMode = 'light' | 'dark'

interface NavItem {
  to: string
  cn: string
  en: string
}

const navItems: NavItem[] = [
  { to: '/', cn: '首页', en: 'Home' },
  { to: '/navigator', cn: '导航', en: 'Index' },
  { to: '/profile', cn: '简介', en: 'Profile' },
  { to: '/xai', cn: '实验室', en: 'ZAI Lab' },
  { to: '/about', cn: '关于', en: 'About' },
]

useLenis()

useHead({
  titleTemplate: (title) => (title ? `${title} · Aster` : 'Aster · zry 的数字温室'),
  htmlAttrs: { lang: 'zh-CN' },
  meta: [
    { name: 'description', content: 'zry 的个人站点 —— 一座数字温室：AI 应用工程师的个人档案、站点索引与 ZAI 实验室。' },
    { name: 'theme-color', content: '#edf5e9' },
    { property: 'og:title', content: 'Aster · zry 的数字温室' },
    { property: 'og:description', content: '科技与自然并存的个人站点：导航索引、荣誉履历与 ZAI 实验室。' },
    { property: 'og:type', content: 'website' },
  ],
})

/* ---------- 版式（主题）---------- */
const theme = ref<ThemeMode>('light')

const applyTheme = (mode: ThemeMode) => {
  document.documentElement.setAttribute('data-theme', mode)
  localStorage.setItem('zrymax-theme', mode)
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', mode === 'dark' ? '#0a0e1f' : '#edf5e9')
}

const toggleTheme = () => {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
}

watch(theme, applyTheme)

/* ---------- 页脚版权年 ---------- */
const today = new Date()

/* ---------- 主导航：滑动墨块指示器 ---------- */
const route = useRoute()
const navRef = ref<HTMLElement | null>(null)
const indicatorStyle = ref({ left: '0px', width: '0px', opacity: '0' })
let navObserver: ResizeObserver | null = null

const measureIndicator = () => {
  const nav = navRef.value
  if (!nav) return
  const active = nav.querySelector<HTMLElement>('.nav-link.router-link-active')
  if (!active) {
    indicatorStyle.value = { ...indicatorStyle.value, opacity: '0' }
    return
  }
  indicatorStyle.value = {
    left: `${active.offsetLeft}px`,
    width: `${active.offsetWidth}px`,
    opacity: '1',
  }
}

watch(() => route.path, () => nextTick(measureIndicator))

/* ---------- 底部环境音播放器 ---------- */
interface MusicTrack {
  id: string
  name: string
  artist: string
  url: string
}

const musicTracks: MusicTrack[] = [
  {
    id: 'fur-elise',
    name: 'Für Elise',
    artist: 'Beethoven',
    url: 'https://upload.wikimedia.org/wikipedia/commons/1/15/For_Elise_%28F%C3%BCr_Elise%29_Beethoven_JMC_Han.ogg',
  },
  {
    id: 'moonlight',
    name: 'Moonlight Sonata',
    artist: 'Beethoven',
    url: 'https://upload.wikimedia.org/wikipedia/commons/3/34/Moonlight_Sonata_2.ogg',
  },
  {
    id: 'swan-lake',
    name: 'Swan Lake (Act III)',
    artist: 'Tchaikovsky',
    url: 'https://upload.wikimedia.org/wikipedia/commons/b/b4/Tchaikovsky_-_Swan_Lake_Op.20_-_Act_III_Pt.1.ogg',
  },
]

const isPlaying = ref(false)
const activeTrackId = ref(musicTracks[0].id)
const trackProgress = ref(0)
const audioRef = ref<HTMLAudioElement | null>(null)

const activeTrack = computed(
  () => musicTracks.find((track) => track.id === activeTrackId.value) ?? musicTracks[0],
)

const playCurrent = async () => {
  try {
    await audioRef.value?.play()
  } catch {
    /* 浏览器拦截自动播放时保持暂停态 */
  }
}

const togglePlay = () => {
  const player = audioRef.value
  if (!player) return
  if (player.paused) void playCurrent()
  else player.pause()
}

const cycleTrack = async () => {
  const index = musicTracks.findIndex((track) => track.id === activeTrackId.value)
  activeTrackId.value = musicTracks[(index + 1) % musicTracks.length].id
  trackProgress.value = 0
  await nextTick()
  audioRef.value?.load()
  if (isPlaying.value) void playCurrent()
}

const onTimeUpdate = () => {
  const player = audioRef.value
  if (!player || !player.duration || Number.isNaN(player.duration)) {
    trackProgress.value = 0
    return
  }
  trackProgress.value = (player.currentTime / player.duration) * 100
}

/* 点击信息带底部进度线定位播放位置 */
const seekTrack = (event: MouseEvent) => {
  const player = audioRef.value
  if (!player || !player.duration || Number.isNaN(player.duration)) return
  const band = event.currentTarget as HTMLElement
  const rect = band.getBoundingClientRect()
  player.currentTime = ((event.clientX - rect.left) / rect.width) * player.duration
}

onMounted(() => {
  const cache = localStorage.getItem('zrymax-theme')
  if (cache === 'light' || cache === 'dark') {
    theme.value = cache
  } else {
    theme.value = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  applyTheme(theme.value)

  const trackCache = localStorage.getItem('zrymax-track-id')
  if (trackCache && musicTracks.some((track) => track.id === trackCache)) {
    activeTrackId.value = trackCache
  }

  nextTick(measureIndicator)
  document.fonts?.ready.then(measureIndicator).catch(() => {})
  if (navRef.value) {
    navObserver = new ResizeObserver(measureIndicator)
    navObserver.observe(navRef.value)
  }
})

onBeforeUnmount(() => {
  navObserver?.disconnect()
  navObserver = null
})

watch(activeTrackId, (id) => localStorage.setItem('zrymax-track-id', id))
</script>

<template>
  <div class="app-shell">
    <SkyField />
    <!-- 站点头部 -->
    <header class="masthead">
      <div class="masthead-top">
        <span class="masthead-issue">30.27°N 120.15°E · 数字温室 · FIELD STATION</span>
        <RouterLink class="masthead-wordmark" to="/">Ast<em>er</em></RouterLink>
        <div class="masthead-edition">
          <button class="edition-toggle" type="button" @click="toggleTheme">
            {{ theme === 'light' ? '星夜 ☾' : '白昼 ☀' }}
          </button>
        </div>
      </div>
      <nav ref="navRef" class="main-nav">
        <span class="nav-ink" :style="indicatorStyle" aria-hidden="true"></span>
        <RouterLink v-for="(item, index) in navItems" :key="item.to" :to="item.to" class="nav-link">
          <span class="nav-meta">
            <span class="nav-no">{{ String(index + 1).padStart(2, '0') }}</span>
            <span class="nav-en">{{ item.en }}</span>
          </span>
          <span class="nav-cn">{{ item.cn }}</span>
        </RouterLink>
      </nav>
    </header>

    <!-- 环境音带：内联播放器 + 信号状态（观测数据见首页观测台，不再重复） -->
    <div class="dateline">
      <div class="dateline-inner">
        <div class="dateline-cell strip-player">
          <span :class="['player-eq', { playing: isPlaying }]" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
          <span class="strip-label">AMBIENT</span>
          <span class="strip-track">{{ activeTrack.name }} <em>· {{ activeTrack.artist }}</em></span>
          <button type="button" class="strip-btn" @click="togglePlay">{{ isPlaying ? '暂停' : '播放' }}</button>
          <button type="button" class="strip-btn strip-next" @click="cycleTrack">换一首</button>
        </div>
        <span class="dateline-cell strip-status"><span class="status-dot" aria-hidden="true"></span>信号 <b>ONLINE</b></span>
      </div>
      <div
        class="strip-progress"
        role="slider"
        aria-label="播放进度"
        :aria-valuenow="Math.round(trackProgress)"
        aria-valuemin="0"
        aria-valuemax="100"
        @click="seekTrack"
      >
        <span class="strip-progress-fill" :style="{ width: `${trackProgress}%` }"></span>
      </div>
    </div>

    <main class="page-wrap">
      <RouterView v-slot="{ Component }">
        <Transition name="route-rise" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>

    <!-- 页脚：通栏巨字 + 信息栏 -->
    <footer class="site-footer">
      <FooterWordmark />
      <div class="footer-cols">
        <div class="footer-col">
          <h4>关于本站</h4>
          <p>
            zry 的数字温室：首页是个人档案，导航是常用站点索引，
            简介是履历，实验室里漂着一片词向量星空。孢子在场中缓慢漂移。
          </p>
        </div>
        <div class="footer-col">
          <h4>站点地图</h4>
          <ul>
            <li v-for="item in navItems" :key="item.to">
              <RouterLink class="u-link" :to="item.to">{{ item.cn }} · {{ item.en }}</RouterLink>
            </li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>联系</h4>
          <ul>
            <li><a class="u-link" href="https://zryshuaige.space" target="_blank" rel="noreferrer">主站博客 <span class="ext-arrow">↗</span></a></li>
            <li><a class="u-link" href="https://github.com/zryshuaige" target="_blank" rel="noreferrer">GitHub <span class="ext-arrow">↗</span></a></li>
            <li><a class="u-link" href="mailto:zry@zufe.edu.cn">zry@zufe.edu.cn</a></li>
          </ul>
        </div>
      </div>
      <div class="colophon">
        <div class="colophon-inner">
          <span>© {{ today.getFullYear() }} Aster · 培育于杭州</span>
          <span>Vue 3 + Vite · 孢子场实时渲染</span>
        </div>
      </div>
    </footer>

    <audio
      ref="audioRef"
      :src="activeTrack.url"
      preload="metadata"
      @play="isPlaying = true"
      @pause="isPlaying = false"
      @ended="isPlaying = false"
      @timeupdate="onTimeUpdate"
    />

    <InkCursor />
  </div>
</template>
