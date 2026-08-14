<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useHead } from '@unhead/vue'
import { navSections, searchEngines } from '../data/siteData'
import { vReveal } from '../directives'

useHead({
  title: '导航索引',
  link: [{ rel: 'dns-prefetch', href: 'https://icon.horse' }],
})

const keyword = ref('')
const activeEngineId = ref(searchEngines[0].id)
const activeSection = ref(navSections[0].id)

const activeEngine = computed(
  () => searchEngines.find((engine) => engine.id === activeEngineId.value) ?? searchEngines[0],
)

const sectionNo = (index: number) => String(index + 1).padStart(2, '0')

const performSearch = () => {
  const query = keyword.value.trim()
  if (!query) {
    keyword.value = ''
    return
  }
  window.open(`${activeEngine.value.baseUrl}${encodeURIComponent(query)}`, '_blank', 'noopener')
}

const getHostname = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

/* 站点 favicon：icon.horse → Google s2 → 站点自身 favicon.ico → 本地兜底 */
const getSiteLogo = (url: string) => {
  const hostname = getHostname(url)
  return hostname ? `https://icon.horse/icon/${hostname}` : '/favicon.svg'
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

  img.onerror = null
  img.src = '/favicon.svg'
}

const scrollToSection = (sectionId: string) => {
  activeSection.value = sectionId
  document.getElementById(`section-${sectionId}`)?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  })
}

/* 滚动监听：滚动时同步高亮左侧类目 */
let spyObserver: IntersectionObserver | null = null

onMounted(() => {
  spyObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          activeSection.value = entry.target.id.replace('section-', '')
        }
      }
    },
    { rootMargin: '-20% 0px -65% 0px' },
  )
  navSections.forEach((section) => {
    const el = document.getElementById(`section-${section.id}`)
    if (el) spyObserver?.observe(el)
  })
})

onBeforeUnmount(() => {
  spyObserver?.disconnect()
  spyObserver = null
})
</script>

<template>
  <section class="page">
    <header class="directory-head">
      <span class="kicker">INDEX · 站点索引</span>
      <h1>导航索引</h1>
      <p class="lede">
        一处输入，多引擎分发；下方为按类目归档的常驻站点，
        逐行索引，即点即达。
      </p>

      <form class="search-desk" @submit.prevent="performSearch">
        <div class="engine-tabs" role="tablist" aria-label="搜索引擎">
          <button
            v-for="engine in searchEngines"
            :key="engine.id"
            type="button"
            role="tab"
            :aria-selected="activeEngineId === engine.id"
            :class="['engine-tab', { active: activeEngineId === engine.id }]"
            @click="activeEngineId = engine.id"
          >
            <img
              class="engine-logo"
              :src="getSiteLogo(engine.baseUrl)"
              :data-hostname="getHostname(engine.baseUrl)"
              data-fallback-step="0"
              loading="lazy"
              decoding="async"
              alt=""
              @error="handleLogoError"
            />
            {{ engine.name }}
          </button>
        </div>
        <input
          v-model="keyword"
          class="search-input"
          type="text"
          :placeholder="activeEngine.placeholder"
          aria-label="搜索关键词"
        />
        <button class="search-go" type="submit">搜索 →</button>
      </form>
    </header>

    <div class="directory-body">
      <aside class="directory-toc" aria-label="类目索引">
        <button
          v-for="(section, index) in navSections"
          :key="section.id"
          type="button"
          :class="['toc-item', { active: activeSection === section.id }]"
          @click="scrollToSection(section.id)"
        >
          <span class="toc-no">{{ sectionNo(index) }}</span>
          <span class="toc-title">{{ section.title }}</span>
          <span class="toc-count">{{ section.links.length }} 条</span>
        </button>
      </aside>

      <div>
        <section
          v-for="(section, index) in navSections"
          :id="`section-${section.id}`"
          :key="section.id"
          v-reveal
          class="link-section"
        >
          <header class="link-section-head">
            <span class="sec-no">{{ sectionNo(index) }}</span>
            <h2>{{ section.title }}</h2>
            <p class="sec-desc">{{ section.description }}</p>
          </header>
          <a
            v-for="site in section.links"
            :key="site.name"
            class="link-row"
            :href="site.url"
            target="_blank"
            rel="noreferrer"
          >
            <img
              class="link-favicon"
              :src="getSiteLogo(site.url)"
              :data-hostname="getHostname(site.url)"
              data-fallback-step="0"
              loading="lazy"
              decoding="async"
              alt=""
              @error="handleLogoError"
            />
            <span class="link-name">{{ site.name }}</span>
            <span class="link-desc">{{ site.desc }}</span>
            <span class="link-tag">{{ site.tag }}</span>
            <span class="link-host">{{ getHostname(site.url) }} <span class="ext-arrow">↗</span></span>
          </a>
        </section>
      </div>
    </div>
  </section>
</template>
