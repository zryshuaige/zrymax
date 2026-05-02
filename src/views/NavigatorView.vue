<script setup lang="ts">
import { computed, ref } from 'vue'
import { navSections, searchEngines } from '../data/siteData'
import { getCardColorStyle } from '../utils/cardPalette'

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
    <article class="glass-card search-panel">
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
          {{ engine.name }}
        </button>
      </div>

      <div class="search-row">
        <input
          v-model="keyword"
          type="text"
          :placeholder="activeEngine.placeholder"
          @keyup.enter="performSearch"
        />
        <button type="button" @click="performSearch">立即搜索</button>
      </div>
    </article>

    <div class="navigator-layout">
      <aside class="glass-card navigator-aside">
        <h3>目录</h3>
        <button
          v-for="section in navSections"
          :key="section.id"
          type="button"
          :class="['aside-item', { active: activeSection === section.id }]"
          @click="scrollToSection(section.id)"
        >
          {{ section.icon }} {{ section.title }}
        </button>
      </aside>

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

          <div class="link-grid">
            <article
              v-for="(site, index) in section.links"
              :key="site.name"
              class="site-card color-card"
              :style="getCardColorStyle(index)"
              @click="openSite(site.url)"
            >
              <div class="site-top">
                <span class="site-name">{{ site.name }}</span>
                <span class="site-tag">{{ site.tag }}</span>
              </div>
              <p class="site-desc">{{ site.desc }}</p>
            </article>
          </div>
        </section>
      </div>
    </div>
  </section>
</template>
