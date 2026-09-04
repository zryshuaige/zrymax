# Aster

zry 的个人站点「Aster · 数字温室」。基于 **Vue 3** 构建的静态多页面个人网站模板，设计上融合了：

- `home-dev` 的个人主页信息展示风格
- `websites` 的网址导航与搜索聚合体验

最终产物为一个「个人主页 + 搜索聚合 + 分类导航 + ZAI 实验室 + 关于说明」的一体化站点，支持漂亮的渐变背景、玻璃拟态卡片、暗色模式与响应式布局。

---

## 1. 页面功能

### 首页 `/`

- 个人信息展示（身份、地点、联系方式、主站入口）
- 今日一句（实时 API）
- 天气信息（实时 API）
- 技术关键词与项目卡片

### 导航页 `/navigator`

- 多搜索引擎切换（百度 / Bing / Google / GitHub / 知乎 / B 站）
- 统一关键词搜索
- 分类导航（常用、AI 效率、设计、学习社区）
- 左侧目录定位 + 右侧卡片式网址展示

### 个人简介页 `/profile`

- 个人简介文案
- 荣誉与经历卡片（含图标）
- 每个小卡片采用差异化配色，增强视觉层次

### 实验室 `/xai`

- **词向量空间**：55 个中文词的 6 维语义坐标，任选 3 维投影为持续旋转的 3D 星图（Canvas 2D 手写旋转矩阵 + 弱透视，支持拖拽旋转、搜索定位、最近邻连线）；附「词 − 词 + 词」语义算术分步动画（箭头随星球一起旋转）
- **注意力演进**：MHA → MQA → GQA → MLA 的头结构对比图、相对 KV cache 体积条、注意力模式热力图，以及逐 token 播放的注意力流弧线（与热力图行联动）
- 两个 demo 共用播放 / 单步 / 重置 / 变速控件（PlaybackBar，空格 = 播放暂停，→ = 单步，R = 重置）
- 全部为预计算静态示意数据：零模型、零下载、零外部请求

### 关于页 `/about`

- 项目定位与作者信息
- 技术栈说明
- API 清单说明

---

## 2. 技术栈

| 类别 | 技术 |
| --- | --- |
| 核心框架 | Vue 3 (Composition API) |
| 构建工具 | Vite |
| 语言 | TypeScript |
| 路由 | Vue Router（Hash History，静态部署友好） |
| 文档渲染 | markdown-it + Shiki（代码块按需懒加载高亮） |
| Head 管理 | @unhead/vue |
| 滚动与动效 | Lenis 平滑滚动 + IntersectionObserver 滚动显现（无动画库） |
| 可视化 | Canvas 2D / SVG 手写实现（零图表库、零模型运行时） |
| 样式 | 原生 CSS（设计系统变量、暗色模式、关键帧动画、响应式） |
| 数据请求 | Fetch API |

---

## 3. API 清单

| API 名称 | Method | Endpoint | 用途 |
| --- | --- | --- | --- |
| Hitokoto 一言 | GET | `https://v1.hitokoto.cn` | 首页“今日一句”文案 |
| Open-Meteo Weather | GET | `https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lng}&current=temperature_2m,weather_code,wind_speed_10m&timezone=auto` | 首页天气、温度、风速 |

> 默认天气坐标是杭州，可在 `src/views/HomeView.vue` 中修改经纬度参数。

---

## 4. 本地运行与构建

### 环境要求

- Node.js 18+（建议使用 LTS）
- npm 9+

### 安装依赖

```bash
npm install
```

### 启动开发环境

```bash
npm run dev
```

默认会输出本地开发地址（通常是 `http://localhost:5173/`）。

### 生产构建

```bash
npm run build
```

构建产物输出到 `dist/`。

### 本地预览生产包

```bash
npm run preview
```

---

## 5. 可配置项

### 内容配置（推荐改这里）

`src/data/siteData.ts`

- `personalProfile`：个人信息
- `searchEngines`：搜索引擎列表与 URL
- `navSections`：导航分类与站点卡片
- `techStack`：技术栈展示
- `apiCatalog`：API 文档展示

### API 与请求逻辑

`src/services/apis.ts`

- `fetchHitokoto()`：获取一言
- `fetchWeather(lat, lng)`：获取天气
- `weatherCodeToText()`：天气码转中文

### 主题模式

- 点击顶部按钮可切换浅色/深色
- 当前主题会缓存到 `localStorage`（键名：`zrymax-theme`）

---

## 6. 目录结构

```text
zrymax
├─ public                   # 静态资源（成就文档、favicon）
├─ src
│  ├─ components
│  │  ├─ FooterWordmark.vue # 页脚巨字：陶土赭/冰蓝 + 墨色双色套印（落版/重印动效）
│  │  ├─ InkCursor.vue      # 自定义墨迹光标
│  │  ├─ MarkdownDoc.vue    # Markdown 渲染（Shiki 高亮）
│  │  ├─ SkyField.vue       # 孢子场背景
│  │  └─ lab
│  │     ├─ EmbeddingSpace.vue   # 实验室：3D 词向量星图 + 语义算术动画
│  │     ├─ AttentionLab.vue     # 实验室：注意力机制演进对比 + 注意力流弧线
│  │     └─ PlaybackBar.vue      # 实验室：共享播放/单步/重置/变速控件
│  ├─ composables           # useLenis / useObservatory / usePrefersReducedMotion
│  ├─ data
│  │  ├─ siteData.ts        # 站点内容配置
│  │  ├─ wordVectors.ts     # 6 维词向量示意数据
│  │  └─ attentionData.ts   # 注意力机制结构与模式数据
│  ├─ directives            # v-reveal 滚动显现
│  ├─ router
│  │  └─ index.ts
│  ├─ services
│  │  └─ apis.ts            # 一言 / 天气 API
│  ├─ utils
│  │  └─ markdown.ts
│  ├─ views                 # Home / Navigator / Profile / Xai(实验室) / About
│  ├─ App.vue
│  ├─ main.ts
│  ├─ design-system.css
│  └─ style.css
├─ package.json
└─ README.md
```

---

## 7. 静态部署说明

本项目为纯前端静态站点，可直接部署到：

- Vercel
- Netlify
- GitHub Pages
- Nginx 静态目录

部署时只需要发布 `dist/` 目录。
