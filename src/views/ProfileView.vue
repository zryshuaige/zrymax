<script setup lang="ts">
import { personalAchievements, personalProfile } from '../data/siteData'
import { getCardColorStyle } from '../utils/cardPalette'
</script>

<template>
  <section class="page profile-view">
    <article class="glass-card profile-intro-card">
      <h1>个人简介</h1>
      <p>
        我是 {{ personalProfile.name }}，长期关注前端工程化与产品体验，注重把技术能力转化成稳定、易用、可持续迭代的实际成果。
      </p>
    </article>

    <article class="glass-card profile-achievement-card">
      <h2>荣誉与经历</h2>
      <div class="achievement-grid">
        <div
          v-for="(item, index) in personalAchievements"
          :key="item.title"
          class="achievement-item color-card"
          :style="getCardColorStyle(index)"
        >
          <span class="achievement-icon">{{ item.icon }}</span>
          <p class="achievement-title">{{ item.title }}</p>
        </div>
      </div>
    </article>
  </section>
</template>
