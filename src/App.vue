<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import { useHead } from '@unhead/vue'
import CornerBadge from './components/CornerBadge.vue'
import IntroOverlay from './components/IntroOverlay.vue'
import ParticleCursor from './components/ParticleCursor.vue'
import { fetchWeather } from './services/apis'
import { useLenis } from './composables/useLenis'
import { setDayNight, setWeatherScene, mapWeatherCodeToScene, type WeatherScene } from './composables/useWeatherState'
import { vMagnetic } from './directives'

type ThemeMode = 'light' | 'dark'
// 背景选择：auto 跟随真实天气；具体场景手动覆盖；css 渐变；off 关闭
type BgChoice = 'auto' | WeatherScene | 'css' | 'off'
type MusicTrack = {
  id: string
  name: string
  artist: string
  url: string
}

interface NavItem {
  to: string
  label: string
  emoji: string
}

// 动态背景懒加载：canvas 流场，零外部依赖、天然循环、色调随天气联动。
const VideoBackground = defineAsyncComponent(() => import('./components/VideoBackground.vue'))

const navItems: NavItem[] = [
  { to: '/', label: '主页', emoji: '🏠' },
  { to: '/navigator', label: '导航', emoji: '🧭' },
  { to: '/profile', label: '简介', emoji: '👤' },
  { to: '/xai', label: 'XAI', emoji: '🧬' },
  { to: '/about', label: '关于', emoji: '✨' },
]

useLenis()

useHead({
  titleTemplate: (title) => (title ? `${title} · zrymax` : 'zrymax · 个人主页'),
  htmlAttrs: { lang: 'zh-CN' },
  meta: [
    { name: 'description', content: 'zry 的个人主页 -- Vue3 + GSAP + WebGL 驱动的导航与作品集' },
    { name: 'theme-color', content: '#5a67ff' },
    { property: 'og:title', content: 'zrymax · 个人主页' },
    { property: 'og:description', content: 'Vue3 + GSAP + WebGL 驱动的个人导航与作品集站点' },
    { property: 'og:type', content: 'website' },
  ],
})

const theme = ref<ThemeMode>('light')
const bgChoice = ref<BgChoice>('auto')
const showMusicPopup = ref(false)
const showBgPopup = ref(false)
const activeTrackId = ref('fur-elise')
const audioRef = ref<HTMLAudioElement | null>(null)
const isPlaying = ref(false)
const bgReady = ref(false)
const introVisible = ref(true)
const zenMode = ref(false)

// 禅模式：中键点空白 → 隐藏所有组件只留背景；中键点交互元素放行原生「新标签打开」；Esc 退出。
const ZEN_ALLOW_SELECTOR =
  'a, button, .btn, input, [role="button"], .nav-link, .site-card, .timeline-node, .bg-picker-item, .music-item, .card-refresh-btn, .xai-preset, .xai-upload, .xai-mode, .xai-brush, .engine-tab, .category-tab'

const onMiddleMouseDown = (e: MouseEvent) => {
  if (e.button !== 1) return
  const t = e.target as Element | null
  // 命中交互元素：放行，让浏览器执行「新标签打开」原生行为
  if (t && t.closest(ZEN_ALLOW_SELECTOR)) return
  e.preventDefault() // 阻止中键自动滚动光标
  zenMode.value = !zenMode.value
}

const onKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && zenMode.value) zenMode.value = false
}

// 可选视频场景（与 VideoBackground 的 SCENE_VIDEO 对应）
const SCENES: { id: WeatherScene; label: string; emoji: string }[] = [
  { id: 'clear', label: '晴空', emoji: '☀️' },
  { id: 'cloudy', label: '多云', emoji: '☁️' },
  { id: 'rain', label: '雨景', emoji: '🌧️' },
  { id: 'snow', label: '雪林', emoji: '❄️' },
  { id: 'fog', label: '雾林', emoji: '🌫️' },
  { id: 'storm', label: '雷暴', emoji: '⛈️' },
]
const bgSceneOptions: { id: BgChoice; label: string; emoji: string }[] = [
  { id: 'auto', label: '自动跟随天气', emoji: '🌤️' },
  ...SCENES.map((s) => ({ id: s.id as BgChoice, label: s.label, emoji: s.emoji })),
]
const bgOtherOptions: { id: BgChoice; label: string; emoji: string }[] = [
  { id: 'css', label: '渐变背景', emoji: '🌈' },
  { id: 'off', label: '纯净关闭', emoji: '⬛' },
]

const musicTracks: MusicTrack[] = [
  {
    id: 'fur-elise',
    name: 'Fur Elise',
    artist: 'Ludwig van Beethoven',
    url: 'https://upload.wikimedia.org/wikipedia/commons/1/15/For_Elise_%28F%C3%BCr_Elise%29_Beethoven_JMC_Han.ogg',
  },
  {
    id: 'moonlight',
    name: 'Moonlight Sonata',
    artist: 'Ludwig van Beethoven',
    url: 'https://upload.wikimedia.org/wikipedia/commons/3/34/Moonlight_Sonata_2.ogg',
  },
  {
    id: 'swan-lake',
    name: 'Swan Lake (Act III)',
    artist: 'Pyotr Ilyich Tchaikovsky',
    url: 'https://upload.wikimedia.org/wikipedia/commons/b/b4/Tchaikovsky_-_Swan_Lake_Op.20_-_Act_III_Pt.1.ogg',
  },
]

const applyTheme = (mode: ThemeMode) => {
  document.documentElement.setAttribute('data-theme', mode)
  localStorage.setItem('zrymax-theme', mode)
}

const applyBgChoice = (choice: BgChoice) => {
  // data-bg-mode 仅区分 video/css/off，供 CSS 消费（手动场景统一归为 video）
  const mode: 'video' | 'css' | 'off' =
    choice === 'css' ? 'css' : choice === 'off' ? 'off' : 'video'
  document.documentElement.setAttribute('data-bg-mode', mode)
  // data-bg-scene 标记手动场景（auto/css/off 时清空），供 VideoBackground 读取
  const scene = SCENES.some((s) => s.id === choice) ? (choice as WeatherScene) : ''
  if (scene) document.documentElement.setAttribute('data-bg-scene', scene)
  else document.documentElement.removeAttribute('data-bg-scene')
  localStorage.setItem('zrymax-bg-choice', choice)
}

// 派生：是否需要挂载视频背景；以及手动场景覆盖（auto 时 undefined → 跟随真实天气）
const videoMounted = computed(() => bgChoice.value !== 'css' && bgChoice.value !== 'off')
const videoSceneOverride = computed<WeatherScene | undefined>(() => {
  const c = bgChoice.value
  return SCENES.some((s) => s.id === c) ? (c as WeatherScene) : undefined
})

const isNight = computed(() => {
  const hour = new Date().getHours()
  return theme.value === 'dark' || hour < 6 || hour >= 18
})

// 同步日夜状态到共享 store，供着色器背景读取。
watch(
  isNight,
  (night) => {
    setDayNight(night ? 1 : 0)
  },
  { immediate: true },
)

onMounted(() => {
  const cache = localStorage.getItem('zrymax-theme')
  if (cache === 'light' || cache === 'dark') {
    theme.value = cache
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    theme.value = prefersDark ? 'dark' : 'light'
  }
  applyTheme(theme.value)

  // 背景选择：优先读新键 zrymax-bg-choice；
  // 兼容迁移上一轮的 zrymax-bg-mode（video→auto / css / off）与更早的 zrymax-bg-motion（on→auto / off→off）。
  const choiceCache = localStorage.getItem('zrymax-bg-choice')
  const allChoices: BgChoice[] = ['auto', 'css', 'off', ...SCENES.map((s) => s.id)]
  if (choiceCache && allChoices.includes(choiceCache as BgChoice)) {
    bgChoice.value = choiceCache as BgChoice
  } else {
    const legacyMode = localStorage.getItem('zrymax-bg-mode')
    if (legacyMode === 'css' || legacyMode === 'off') {
      bgChoice.value = legacyMode
    } else if (legacyMode === 'video') {
      bgChoice.value = 'auto'
    } else {
      const legacyMotion = localStorage.getItem('zrymax-bg-motion')
      bgChoice.value = legacyMotion === 'off' ? 'off' : 'auto'
    }
    localStorage.removeItem('zrymax-bg-mode')
    localStorage.removeItem('zrymax-bg-motion')
  }
  applyBgChoice(bgChoice.value)

  const trackCache = localStorage.getItem('zrymax-track-id')
  if (trackCache && musicTracks.some((track) => track.id === trackCache)) {
    activeTrackId.value = trackCache
  }

  fetchWeather(30.2741, 120.1551)
    .then((weather) => {
      setWeatherScene(mapWeatherCodeToScene(weather.current.weather_code))
    })
    .catch((error) => {
      console.warn('获取动态天气场景失败，使用默认场景。', error)
    })

  // 禅模式：中键（空白处切换）+ Esc（退出）
  window.addEventListener('mousedown', onMiddleMouseDown)
  window.addEventListener('keydown', onKeyDown)
})

onBeforeUnmount(() => {
  window.removeEventListener('mousedown', onMiddleMouseDown)
  window.removeEventListener('keydown', onKeyDown)
})

watch(theme, (mode) => {
  applyTheme(mode)
})

watch(bgChoice, (choice) => {
  applyBgChoice(choice)
})

watch(activeTrackId, (trackId) => {
  localStorage.setItem('zrymax-track-id', trackId)
})

const toggleTheme = () => {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
}

const toggleMusicPopup = () => {
  showMusicPopup.value = !showMusicPopup.value
}

const toggleBgPopup = () => {
  showBgPopup.value = !showBgPopup.value
}

const selectBgChoice = (choice: BgChoice) => {
  bgChoice.value = choice
  showBgPopup.value = false
}

const activeTrack = computed(() => musicTracks.find((track) => track.id === activeTrackId.value) ?? musicTracks[0])

const playCurrentTrack = async () => {
  const player = audioRef.value
  if (!player) return

  try {
    await player.play()
  } catch (error) {
    console.warn('浏览器阻止了自动播放，请手动点击播放按钮。', error)
  }
}

const togglePlayPause = () => {
  const player = audioRef.value
  if (!player) return

  if (!player.paused) {
    player.pause()
    return
  }
  void playCurrentTrack()
}

const selectTrack = async (trackId: string) => {
  activeTrackId.value = trackId
  await nextTick()
  audioRef.value?.load()
  void playCurrentTrack()
}
</script>

<template>
  <div :class="['app-shell', { 'dynamic-bg': bgChoice !== 'off', zen: zenMode }]">
    <IntroOverlay v-if="introVisible" @done="introVisible = false" />
    <!-- CSS 兜底背景：着色器加载前/失败/低端机始终可见 -->
    <div class="css-bg" aria-hidden="true"></div>
    <!-- 视频背景（自动跟随天气或手动场景），懒加载；css/off 模式不挂载 -->
    <VideoBackground v-if="videoMounted" :scene-override="videoSceneOverride" @vue:loaded="bgReady = true" />

    <div class="app-content">
      <header class="top-nav glass-card">
        <RouterLink class="brand" to="/">
          <span class="brand-badge">
            <span class="brand-monogram">ZRY</span>
          </span>
          <span class="brand-name">zrymax</span>
        </RouterLink>

        <nav class="nav-links">
          <RouterLink v-for="item in navItems" :key="item.to" :to="item.to" class="nav-link">
            <span>{{ item.emoji }}</span>
            <span>{{ item.label }}</span>
          </RouterLink>
        </nav>

        <div class="toolbar-actions">
          <button class="theme-btn" type="button" v-magnetic="0.25" @click="toggleTheme">
            {{ theme === 'light' ? '🌙 深色' : '☀️ 浅色' }}
          </button>
          <button class="theme-btn" type="button" v-magnetic="0.25" @click="toggleBgPopup">
            🎨 背景
          </button>
          <button class="theme-btn" type="button" v-magnetic="0.25" @click="toggleMusicPopup">
            🎵 音乐
          </button>
        </div>
      </header>

      <main class="page-wrap">
        <RouterView v-slot="{ Component }">
          <Transition name="route-rise" mode="out-in">
            <component :is="Component" />
          </Transition>
        </RouterView>
      </main>

      <footer class="site-footer">
        <p>© {{ new Date().getFullYear() }} zrymax · Vue3 Personal Navigator</p>
      </footer>

      <CornerBadge />

      <!-- 背景样式选择气泡：透明遮罩（不加 backdrop-filter，避免多一层模糊开销） -->
      <div v-if="showBgPopup" class="bg-picker-mask" @click.self="showBgPopup = false">
        <section class="bg-picker glass-card glass-card--blur" data-lenis-prevent>
          <div class="bg-picker-head">
            <h3>🎨 背景样式</h3>
            <button type="button" class="music-close-btn" @click="showBgPopup = false">关闭</button>
          </div>
          <p class="bg-picker-sub">选择一种背景，立即生效并记忆。</p>

          <div class="bg-picker-group">
            <p class="bg-picker-group-title">动态视频</p>
            <div class="bg-picker-grid">
              <button
                v-for="opt in bgSceneOptions"
                :key="opt.id"
                type="button"
                :class="['bg-picker-item', { active: bgChoice === opt.id }]"
                @click="selectBgChoice(opt.id)"
              >
                <span class="bg-picker-emoji">{{ opt.emoji }}</span>
                <span class="bg-picker-name">{{ opt.label }}</span>
              </button>
            </div>
          </div>

          <div class="bg-picker-group">
            <p class="bg-picker-group-title">其他</p>
            <div class="bg-picker-list">
              <button
                v-for="opt in bgOtherOptions"
                :key="opt.id"
                type="button"
                :class="['bg-picker-item', { active: bgChoice === opt.id }]"
                @click="selectBgChoice(opt.id)"
              >
                <span class="bg-picker-emoji">{{ opt.emoji }}</span>
                <span class="bg-picker-name">{{ opt.label }}</span>
              </button>
            </div>
          </div>
        </section>
      </div>

      <div v-if="showMusicPopup" class="music-mask" @click.self="showMusicPopup = false">
        <section class="music-popup glass-card glass-card--blur" data-lenis-prevent>
          <div class="music-head">
            <h3>🎶 音乐播放</h3>
            <button type="button" class="music-close-btn" @click="showMusicPopup = false">关闭</button>
          </div>
          <p class="music-subtitle">选择一首背景音乐，边逛边听。</p>
          <div class="music-list">
            <button
              v-for="track in musicTracks"
              :key="track.id"
              type="button"
              :class="['music-item', { active: activeTrackId === track.id }]"
              @click="selectTrack(track.id)"
            >
              <span class="music-item-name">{{ track.name }}</span>
              <span class="music-item-artist">{{ track.artist }}</span>
            </button>
          </div>
          <div class="music-actions">
            <button type="button" class="music-control-btn" @click="togglePlayPause">
              {{ isPlaying ? '⏸️ 暂停播放' : '▶️ 开始播放' }}
            </button>
          </div>
          <p class="music-now-playing">
            当前：{{ activeTrack.name }} · {{ activeTrack.artist }}（{{ isPlaying ? '播放中' : '已暂停' }}）
          </p>
        </section>
      </div>
    </div>
    <!-- 粒子光标置于 app-shell 直接子级：避免 app-content 的 transform 破坏 fixed 定位 -->
    <ParticleCursor v-if="introVisible === false" />
    <audio
      ref="audioRef"
      class="bg-audio-player"
      :src="activeTrack.url"
      preload="metadata"
      @play="isPlaying = true"
      @pause="isPlaying = false"
      @ended="isPlaying = false"
    />
  </div>
</template>
