<script setup lang="ts">
import { apiCatalog, personalProfile, techStack } from '../data/siteData'
</script>

<template>
  <section class="page about-view">
    <article class="glass-card about-intro">
      <h1>关于 zrymax</h1>
      <p>
        这是一个以 Vue3 为核心构建的静态多页面个人网站，融合了 home-dev 的个人主页表达方式与 websites
        的导航聚合能力，目标是打造“可用 + 好看 + 易扩展”的前端模板。
      </p>
      <ul class="about-meta">
        <li>👤 作者：{{ personalProfile.name }}</li>
        <li>💼 方向：{{ personalProfile.role }}</li>
        <li>📍 地点：{{ personalProfile.location }}</li>
        <li>📮 联系：{{ personalProfile.email }}</li>
      </ul>
    </article>

    <article class="glass-card stack-card">
      <h2>技术栈说明</h2>
      <div class="stack-grid">
        <div v-for="item in techStack" :key="item.name" class="stack-item">
          <h3>{{ item.name }}</h3>
          <p>{{ item.desc }}</p>
        </div>
      </div>
    </article>

    <article class="glass-card api-card">
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
