<script setup lang="ts">
import { useHead } from '@unhead/vue'
import { apiCatalog, personalProfile, techStack } from '../data/siteData'
import { vReveal } from '../directives'

useHead({ title: '关于本站' })
</script>

<template>
  <section class="page colophon-page">
    <header class="colophon-hero">
      <span class="kicker">ABOUT · 站点档案</span>
      <h1>关于本站</h1>
      <p>
        一座以 Vue 3 搭建、以 1px 网格线为版律的数字温室。
        以下为站点信息、技术栈与外部数据源清单。
      </p>
    </header>

    <div class="about-grid">
      <div v-reveal class="about-col">
        <div class="col-head">
          <h2>站点信息</h2>
          <span class="col-no">INFO</span>
        </div>
        <dl class="meta-dl">
          <div class="meta-row">
            <dt>作者</dt>
            <dd>{{ personalProfile.name }}</dd>
          </div>
          <div class="meta-row">
            <dt>职业</dt>
            <dd>{{ personalProfile.role }}</dd>
          </div>
          <div class="meta-row">
            <dt>研究</dt>
            <dd>{{ personalProfile.research }}</dd>
          </div>
          <div class="meta-row">
            <dt>坐标</dt>
            <dd>{{ personalProfile.location }}</dd>
          </div>
          <div class="meta-row">
            <dt>通讯</dt>
            <dd>
              <a class="u-link" :href="`mailto:${personalProfile.email}`">{{ personalProfile.email }}</a>
            </dd>
          </div>
        </dl>
      </div>

      <div v-reveal class="about-col">
        <div class="col-head">
          <h2>技术栈</h2>
          <span class="col-no">TECH</span>
        </div>
        <div>
          <div v-for="item in techStack" :key="item.name" class="stack-row">
            <h3>{{ item.name }}</h3>
            <p>{{ item.desc }}</p>
          </div>
        </div>
      </div>
    </div>

    <div v-reveal>
      <div class="col-head" style="margin-top: 1.6rem">
        <h2>API 清单</h2>
        <span class="col-no">DATA SOURCES</span>
      </div>
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
              <td class="mono-cell">{{ api.method }}</td>
              <td class="mono-cell">{{ api.endpoint }}</td>
              <td>{{ api.usage }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>
