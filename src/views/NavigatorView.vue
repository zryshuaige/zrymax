<script setup lang="ts">
import { computed, ref } from 'vue'
import { useHead } from '@unhead/vue'
import { navSections, searchEngines } from '../data/siteData'
import { getCardColorStyle } from '../utils/cardPalette'
import { vReveal, vMagnetic } from '../directives'

useHead({ title: '导航' })

const keyword = ref('')
const activeEngineId = ref(searchEngines[0].id)
const activeSection = ref(navSections[0].id)

const activeEngine = computed(
  () => searchEngines.find((engine) => engine.id === activeEngineId.value) ?? searchEngines[0],
)

const performSearch = () => {
  const query = keyword.value.trim()
  if (!query) {
    window.alert('请输入要搜索的关键词')
    return
  }
  window.open(`${activeEngine.value.baseUrl}${encodeURIComponent(query)}`, '_blank', 'noopener')
}

const openSite = (url: string) => {
  window.open(url, '_blank', 'noopener')
}

const getHostname = (url: string) => {
  try {
    return new URL(url).hostname
  } catch {
    return ''
  }
}

const getSiteLogo = (url: string) => {
  const hostname = getHostname(url)
  return hostname ? `https://icon.horse/icon/${hostname}` : '/favicon.svg'
}

const getEngineLogo = (baseUrl: string) => {
  const hostname = getHostname(baseUrl)
  return hostname ? `https://icon.horse/icon/${hostname}` : '/favicon.svg'
}

const handleEngineLogoError = (event: Event) => {
  const img = event.currentTarget as HTMLImageElement
  const hostname = img.dataset.hostname
  const step = Number(img.dataset.fallbackStep ?? '0')

  if (!hostname) {
    img.src = '/favicon.svg'
    return
  }

  if (step === 0) {
    img.dataset.fallbackStep = '1'
    img.src = `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`
    return
  }

  if (step === 1) {
    img.dataset.fallbackStep = '2'
    img.src = `https://${hostname}/favicon.ico`
    return
  }

  img.src = '/favicon.svg'
}

const handleLogoError = (event: Event) => {
  const img = event.currentTarget as HTMLImageElement
  const hostname = img.dataset.hostname
  const step = Number(img.dataset.fallbackStep ?? '0')

  if (!hostname) {
    img.src = '/favicon.svg'
    return
  }

  if (step === 0) {
    img.dataset.fallbackStep = '1'
    img.src = `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`
    return
  }

  if (step === 1) {
    img.dataset.fallbackStep = '2'
    img.src = `https://${hostname}/favicon.ico`
    return
  }

  img.src = '/favicon.svg'
}

const scrollToSection = (sectionId: string) => {
  activeSection.value = sectionId
  document.getElementById(`section-${sectionId}`)?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  })
}
</script>

<template>
  <section class="page navigator-view">
    <article v-reveal class="glass-card search-panel">
      <h2>聚合搜索中心</h2>
      <p>继承 websites 的搜索聚合思路，支持多搜索引擎一键切换。</p>

      <div class="engine-tabs">
        <button
          v-for="engine in searchEngines"
          :key="engine.id"
          type="button"
          :class="['engine-tab', { active: activeEngineId === engine.id }]"
          @click="activeEngineId = engine.id"
        >
          <img
            class="engine-logo"
            :src="getEngineLogo(engine.baseUrl)"
            :alt="`${engine.name} logo`"
            :data-hostname="getHostname(engine.baseUrl)"
            data-fallback-step="0"
            loading="lazy"
            @error="handleEngineLogoError"
          />
          <span>{{ engine.name }}</span>
        </button>
      </div>

      <div class="search-row">
        <input
          v-model="keyword"
          type="text"
          :placeholder="activeEngine.placeholder"
          @keyup.enter="performSearch"
        />
        <button type="button" v-magnetic @click="performSearch">立即搜索</button>
      </div>

      <div class="category-tabs">
        <button
          v-for="section in navSections"
          :key="section.id"
          type="button"
          :class="['category-tab', { active: activeSection === section.id }]"
          @click="scrollToSection(section.id)"
        >
          {{ section.icon }} {{ section.title }}
        </button>
      </div>
    </article>

    <div class="navigator-main">
      <section
        v-for="section in navSections"
        :id="`section-${section.id}`"
        :key="section.id"
        class="glass-card section-card"
      >
        <header class="section-head">
          <h2 class="section-title">{{ section.icon }} {{ section.title }}</h2>
          <p class="section-desc">{{ section.description }}</p>
        </header>

        <div v-reveal="{ stagger: 0.04 }" class="link-grid">
          <article
            v-for="(site, index) in section.links"
            :key="site.name"
            class="site-card color-card"
            :style="getCardColorStyle(index)"
            @click="openSite(site.url)"
          >
            <div class="site-top">
              <div class="site-info">
                <img
                  class="site-logo"
                  :src="getSiteLogo(site.url)"
                  :alt="`${site.name} logo`"
                  :data-hostname="getHostname(site.url)"
                  data-fallback-step="0"
                  loading="lazy"
                  @error="handleLogoError"
                />
                <span class="site-name">{{ site.name }}</span>
              </div>
              <span class="site-tag">{{ site.tag }}</span>
            </div>
            <p class="site-desc">{{ site.desc }}</p>
          </article>
        </div>
      </section>
    </div>
  </section>
</template>
