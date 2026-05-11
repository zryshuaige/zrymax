<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import CornerBadge from './components/CornerBadge.vue'
import backVideo from './assets/back.mp4'
import { fetchWeather } from './services/apis'

type ThemeMode = 'light' | 'dark'
type WeatherScene = 'clear' | 'cloudy' | 'rain' | 'snow' | 'fog' | 'storm'
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

const navItems: NavItem[] = [
  { to: '/', label: '主页', emoji: '🏠' },
  { to: '/navigator', label: '导航', emoji: '🧭' },
  { to: '/profile', label: '简介', emoji: '👤' },
  { to: '/about', label: '关于', emoji: '✨' },
]

const theme = ref<ThemeMode>('light')
const dynamicBackground = ref(true)
const showMusicPopup = ref(false)
const activeTrackId = ref('fur-elise')
const audioRef = ref<HTMLAudioElement | null>(null)
const bgVideoRef = ref<HTMLVideoElement | null>(null)
const isPlaying = ref(false)
const weatherScene = ref<WeatherScene>('clear')

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

const applyDynamicBackground = (enabled: boolean) => {
  document.documentElement.setAttribute('data-bg-motion', enabled ? 'on' : 'off')
  localStorage.setItem('zrymax-bg-motion', enabled ? 'on' : 'off')
}

const syncBackgroundVideo = async (enabled: boolean) => {
  const video = bgVideoRef.value
  if (!video) return

  if (!enabled) {
    video.pause()
    return
  }

  try {
    await video.play()
  } catch (error) {
    console.warn('背景视频自动播放失败，请检查浏览器自动播放设置。', error)
  }
}

const mapWeatherCodeToScene = (code: number): WeatherScene => {
  if (code === 45 || code === 48) return 'fog'
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain'
  if (code >= 71 && code <= 77) return 'snow'
  if (code >= 95) return 'storm'
  if (code >= 1 && code <= 3) return 'cloudy'
  return 'clear'
}

const isNight = computed(() => {
  const hour = new Date().getHours()
  return theme.value === 'dark' || hour < 6 || hour >= 18
})

onMounted(() => {
  const cache = localStorage.getItem('zrymax-theme')
  if (cache === 'light' || cache === 'dark') {
    theme.value = cache
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    theme.value = prefersDark ? 'dark' : 'light'
  }
  applyTheme(theme.value)

  const bgMotionCache = localStorage.getItem('zrymax-bg-motion')
  dynamicBackground.value = bgMotionCache !== 'off'
  applyDynamicBackground(dynamicBackground.value)
  void syncBackgroundVideo(dynamicBackground.value)

  const trackCache = localStorage.getItem('zrymax-track-id')
  if (trackCache && musicTracks.some((track) => track.id === trackCache)) {
    activeTrackId.value = trackCache
  }

  fetchWeather(30.2741, 120.1551)
    .then((weather) => {
      weatherScene.value = mapWeatherCodeToScene(weather.current.weather_code)
    })
    .catch((error) => {
      console.warn('获取动态天气场景失败，使用默认场景。', error)
    })
})

watch(theme, (mode) => {
  applyTheme(mode)
})

watch(dynamicBackground, (enabled) => {
  applyDynamicBackground(enabled)
  void syncBackgroundVideo(enabled)
})

watch(activeTrackId, (trackId) => {
  localStorage.setItem('zrymax-track-id', trackId)
})

const toggleTheme = () => {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
}

const toggleBackgroundMotion = () => {
  dynamicBackground.value = !dynamicBackground.value
}

const toggleMusicPopup = () => {
  showMusicPopup.value = !showMusicPopup.value
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
  <div :class="['app-shell', { 'dynamic-bg': dynamicBackground }]">
    <video
      ref="bgVideoRef"
      class="bg-video"
      :src="backVideo"
      autoplay
      muted
      loop
      playsinline
      preload="auto"
      aria-hidden="true"
    ></video>
    <div class="video-scrim" aria-hidden="true"></div>
    <div
      :class="[
        'aurora-bg',
        {
          dynamic: dynamicBackground,
          'scene-day': !isNight,
          'scene-night': isNight,
          'scene-clear': weatherScene === 'clear',
          'scene-cloudy': weatherScene === 'cloudy',
          'scene-rain': weatherScene === 'rain',
          'scene-snow': weatherScene === 'snow',
          'scene-fog': weatherScene === 'fog',
          'scene-storm': weatherScene === 'storm',
        },
      ]"
      aria-hidden="true"
    >
      <span class="weather-halo"></span>
      <span class="weather-vignette"></span>
      <span class="weather-sun"></span>
      <span class="weather-rain"></span>
      <span class="weather-snow"></span>
      <span class="weather-fog"></span>
      <span class="weather-lightning"></span>
      <span class="weather-grain"></span>
    </div>

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
        <button class="theme-btn" type="button" @click="toggleTheme">
          {{ theme === 'light' ? '🌙 深色' : '☀️ 浅色' }}
        </button>
        <button class="theme-btn" type="button" @click="toggleBackgroundMotion">
          {{ dynamicBackground ? '🫧 关闭动效' : '✨ 开启动效' }}
        </button>
        <button class="theme-btn" type="button" @click="toggleMusicPopup">
          🎵 音乐
        </button>
      </div>
    </header>

    <main class="page-wrap">
      <RouterView v-slot="{ Component }">
        <Transition name="route-fade" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>

    <footer class="site-footer">
      <p>© {{ new Date().getFullYear() }} zrymax · Vue3 Personal Navigator</p>
    </footer>

    <CornerBadge />

    <div v-if="showMusicPopup" class="music-mask" @click.self="showMusicPopup = false">
      <section class="music-popup glass-card">
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
