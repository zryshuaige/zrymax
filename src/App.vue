<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { RouterLink, RouterView } from 'vue-router'

type ThemeMode = 'light' | 'dark'

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

const applyTheme = (mode: ThemeMode) => {
  document.documentElement.setAttribute('data-theme', mode)
  localStorage.setItem('zrymax-theme', mode)
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
})

watch(theme, (mode) => {
  applyTheme(mode)
})

const toggleTheme = () => {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
}
</script>

<template>
  <div class="app-shell">
    <div class="aurora-bg" aria-hidden="true">
      <span class="blob blob-a"></span>
      <span class="blob blob-b"></span>
      <span class="blob blob-c"></span>
    </div>

    <header class="top-nav glass-card">
      <RouterLink class="brand" to="/">
        <span class="brand-badge">ZR</span>
        <span class="brand-name">zrymax</span>
      </RouterLink>

      <nav class="nav-links">
        <RouterLink v-for="item in navItems" :key="item.to" :to="item.to" class="nav-link">
          <span>{{ item.emoji }}</span>
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>

      <button class="theme-btn" type="button" @click="toggleTheme">
        {{ theme === 'light' ? '🌙 深色' : '☀️ 浅色' }}
      </button>
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
  </div>
</template>
