<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import siteLogo from './assets/logo.png'

type ThemeMode = 'light' | 'dark'
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
const activeTrackId = ref('forest')
const audioRef = ref<HTMLAudioElement | null>(null)
const isPlaying = ref(false)

const musicTracks: MusicTrack[] = [
  {
    id: 'forest',
    name: 'Focus Flow',
    artist: 'SoundHelix',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  },
  {
    id: 'calm',
    name: 'Night Coding',
    artist: 'SoundHelix',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  },
  {
    id: 'dream',
    name: 'Soft Ambient',
    artist: 'SoundHelix',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
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

  const trackCache = localStorage.getItem('zrymax-track-id')
  if (trackCache && musicTracks.some((track) => track.id === trackCache)) {
    activeTrackId.value = trackCache
  }
})

watch(theme, (mode) => {
  applyTheme(mode)
})

watch(dynamicBackground, (enabled) => {
  applyDynamicBackground(enabled)
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

const pauseCurrentTrack = () => {
  audioRef.value?.pause()
}

const selectTrack = async (trackId: string) => {
  activeTrackId.value = trackId
  await nextTick()
  void playCurrentTrack()
}
</script>

<template>
  <div :class="['app-shell', { 'dynamic-bg': dynamicBackground }]">
    <div :class="['aurora-bg', { dynamic: dynamicBackground }]" aria-hidden="true">
      <span class="blob blob-a"></span>
      <span class="blob blob-b"></span>
      <span class="blob blob-c"></span>
      <span class="flow-light flow-a"></span>
      <span class="flow-light flow-b"></span>
      <span class="flow-light flow-c"></span>
      <span class="motion-grid"></span>
    </div>

    <header class="top-nav glass-card">
      <RouterLink class="brand" to="/">
        <span class="brand-badge">
          <img class="brand-logo" :src="siteLogo" alt="zrymax logo" />
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
          <button type="button" class="music-control-btn" @click="playCurrentTrack">
            ▶️ 播放
          </button>
          <button type="button" class="music-control-btn" @click="pauseCurrentTrack">
            ⏸️ 暂停
          </button>
        </div>
        <p class="music-now-playing">
          当前：{{ activeTrack.name }} · {{ activeTrack.artist }}（{{ isPlaying ? '播放中' : '已暂停' }}）
        </p>
      </section>
    </div>
    <audio
      ref="audioRef"
      :key="activeTrackId"
      class="bg-audio-player"
      :src="activeTrack.url"
      preload="metadata"
      @play="isPlaying = true"
      @pause="isPlaying = false"
    />
  </div>
</template>
