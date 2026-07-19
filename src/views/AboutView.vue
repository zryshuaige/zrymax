<script setup lang="ts">
import { useHead } from '@unhead/vue'
import { apiCatalog, personalProfile, techStack } from '../data/siteData'
import { vReveal } from '../directives'

useHead({ title: '关于' })
</script>

<template>
  <section class="page about-view">
    <article v-reveal class="glass-card about-intro">
      <h1>关于 zrymax</h1>
      <p>
        这是一个以 Vue3 为核心构建的静态多页面个人网站。
      </p>
      <ul class="about-meta">
        <li>👤 作者：{{ personalProfile.name }}</li>
        <li>💼 职业：{{ personalProfile.role }}</li>
        <li>🔬 研究：{{ personalProfile.research }}</li>
        <li>📍 地点：{{ personalProfile.location }}</li>
        <li>📮 联系：{{ personalProfile.email }}</li>
      </ul>
    </article>

    <article v-reveal class="glass-card stack-card">
      <h2>🧪 技术如何驱动本站</h2>
      <p class="stack-intro">不是堆栈清单，而是每项在本站你看得到、摸得着的体现。</p>
      <div class="stack-grid">
        <div v-for="item in techStack" :key="item.name" class="stack-item">
          <h3>{{ item.name }}</h3>
          <p>{{ item.desc }}</p>
        </div>
      </div>
    </article>

    <article v-reveal class="glass-card api-card">
      <h2>API 使用清单</h2>
      <div class="api-table-wrap">
        <table class="api-table">
          <thead>
            <tr>
              <th>名称</th>
              <th>Method</th>
              <th>Endpoint</th>
              <th>用途</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="api in apiCatalog" :key="api.name">
              <td>{{ api.name }}</td>
              <td>{{ api.method }}</td>
              <td>{{ api.endpoint }}</td>
              <td>{{ api.usage }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>
  </section>
</template>
