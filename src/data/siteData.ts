export interface HeroStat {
  label: string
  value: string
}

export interface FeaturedProject {
  name: string
  desc: string
  stack: string
}

export interface SearchEngine {
  id: string
  name: string
  baseUrl: string
  placeholder: string
}

export interface NavLink {
  name: string
  url: string
  desc: string
  tag: string
  /** favicon 取图用的域名（链接是子域名且图标服务解析不到时，填主域） */
  icon?: string
}

export interface NavSection {
  id: string
  title: string
  icon: string
  description: string
  links: NavLink[]
}

export interface TechStackItem {
  name: string
  desc: string
}

export interface ApiEntry {
  name: string
  endpoint: string
  method: string
  usage: string
}

export interface AchievementItem {
  id: string
  title: string
  subtitle: string
  icon: string
  theme: 'academic' | 'modeling' | 'competition' | 'innovation'
  detailFile: string
}

export interface InternshipItem {
  org: string
  role: string
  period: string
  current: boolean
}

export const personalProfile = {
  name: 'zry',
  role: '数智化实习生 · 吉利（进行中）',
  tagline: '个人主页',
  location: 'Hangzhou, China',
  email: 'zry@zufe.edu.cn',
  blog: 'https://zryshuaige.space',
  github: 'https://github.com/zryshuaige',
  research : '粒计算与知识发现, 智能决策与优化算法',
}

export const internships: InternshipItem[] = [
  { org: '吉利', role: '数智化实习生', period: '进行中', current: true },
  { org: 'Hikrobot 海康机器人', role: '技术文档开发工程师实习生', period: '已结束', current: false },
]

export const heroStats: HeroStat[] = [
  { label: '上线页面', value: '20+' },
  { label: '实习经历', value: '2 段' },
  { label: '科研论文', value: '1+1ing' },
]

export const skillTags: string[] = [
  'Vue 3',
  'TypeScript',
  'Vite',
  'Router',
  'Web Animation',
  'UI Design',
  'Performance',
  'Accessibility',
]

export const personalHighlights: string[] = [
  '专注方向：AI 应用工程 —— 把大模型能力落成稳定、可用的产品功能。',
  '技术日常：LLM 应用编排、RAG 检索增强、Agent 工作流与前端体验。',
  '研究背景：粒计算与知识发现、智能决策与优化算法。',
  '欢迎交流：AI 应用落地、前端体验与产品思考，来信必复。',
]

export const featuredProjects: FeaturedProject[] = [
  {
    name: 'One Dashboard',
    desc: '统一整合个人任务、开发链接和学习资料，支持主题切换与快捷搜索。',
    stack: 'Vue 3 · TS · Motion',
  },
  {
    name: 'Design Snippets',
    desc: '高频 UI 组件收藏库，覆盖卡片、导航、加载动画等多类视觉模块。',
    stack: 'Vue 3 · CSS',
  },
  {
    name: 'Workflow Notes',
    desc: '沉淀开发规范与工程实践，聚焦前端工程化与体验优化。',
    stack: 'Markdown · Static',
  },
]

export const searchEngines: SearchEngine[] = [
  {
    id: 'baidu',
    name: '百度',
    baseUrl: 'https://www.baidu.com/s?wd=',
    placeholder: '百度一下，快速定位中文内容',
  },
  {
    id: 'bing',
    name: 'Bing',
    baseUrl: 'https://cn.bing.com/search?q=',
    placeholder: 'Bing 全网搜索',
  },
  {
    id: 'google',
    name: 'Google',
    baseUrl: 'https://www.google.com/search?q=',
    placeholder: 'Google 全球搜索',
  },
  {
    id: 'github',
    name: 'GitHub',
    baseUrl: 'https://github.com/search?q=',
    placeholder: '搜索仓库、代码与 Issues',
  },
  {
    id: 'zhihu',
    name: '知乎',
    baseUrl: 'https://www.zhihu.com/search?type=content&q=',
    placeholder: '搜索问答与观点',
  },
  {
    id: 'bilibili',
    name: 'Bilibili',
    baseUrl: 'https://search.bilibili.com/all?keyword=',
    placeholder: '搜索视频、课程与教程',
  },
]

export const navSections: NavSection[] = [
  {
    id: 'daily',
    title: '常用站点',
    icon: '⭐',
    description: '高频打开的个人与工作入口',
    links: [
      { name: 'GitHub', url: 'https://github.com', desc: '代码托管与协作平台', tag: 'Code' },
      { name: 'Bilibili', url: 'https://www.bilibili.com', desc: '技术视频与社区内容', tag: 'Video' },
      { name: 'Notion', url: 'https://www.notion.so', desc: '个人知识管理与任务整理', tag: 'Notes' },
      { name: '掘金', url: 'https://juejin.cn', desc: '开发文章与实战经验', tag: 'Community' },
    ],
  },
  {
    id: 'ai',
    title: 'AI 效率',
    icon: '🤖',
    description: '日常提效的 AI 与自动化平台',
    links: [
      { name: 'ChatGPT', url: 'https://chatgpt.com/', desc: '通用助手与创作支持', tag: 'LLM' },
      { name: 'Claude', url: 'https://claude.ai/', desc: '文档分析与对话助手', tag: 'Assistant' },
      { name: 'DeepSeek', url: 'https://chat.deepseek.com/', desc: '国产深度推理大模型', tag: 'LLM', icon: 'deepseek.com' },
      { name: 'Kimi', url: 'https://www.kimi.com/', desc: '长文本阅读与资料整理', tag: 'LLM' },
      { name: 'MiniMax', url: 'https://www.minimaxi.com/', desc: 'MiniMax 大模型与海螺 AI', tag: 'LLM' },
      { name: 'GitHub Copilot', url: 'https://github.com/features/copilot', desc: '代码补全与辅助开发', tag: 'Code AI' },
    ],
  },
  {
    id: 'design',
    title: '设计灵感',
    icon: '🎨',
    description: '页面视觉、配色和素材灵感来源',
    links: [
      { name: 'Dribbble', url: 'https://dribbble.com/', desc: '高质量 UI 设计灵感', tag: 'Inspire' },
      { name: 'Behance', url: 'https://www.behance.net/', desc: '完整设计项目展示', tag: 'Portfolio' },
      { name: 'Color Hunt', url: 'https://colorhunt.co/', desc: '快速获取配色方案', tag: 'Color' },
      { name: 'Unsplash', url: 'https://unsplash.com/', desc: '免费高清图资源', tag: 'Photo' },
      { name: 'Iconfont', url: 'https://www.iconfont.cn/', desc: '图标库与在线管理', tag: 'Icon' },
      { name: 'Figma', url: 'https://www.figma.com/', desc: '协作式界面设计工具', tag: 'Design' },
    ],
  },
  {
    id: 'learn',
    title: '学习社区',
    icon: '📚',
    description: '技术文档、博客与问答社区',
    links: [
      { name: 'Vue 文档', url: 'https://cn.vuejs.org/', desc: 'Vue3 官方中文文档', tag: 'Vue' },
      { name: 'TypeScript', url: 'https://www.typescriptlang.org/', desc: 'TS 官方手册', tag: 'TS' },
      { name: 'CSDN', url: 'https://www.csdn.net/', desc: '中文开发者社区与博客', tag: 'Community' },
      { name: '博客园', url: 'https://www.cnblogs.com/', desc: '老牌技术博客社区', tag: 'Blog' },
      { name: 'SegmentFault', url: 'https://segmentfault.com/', desc: '中文技术问答社区', tag: 'Q&A' },
      { name: 'Stack Overflow', url: 'https://stackoverflow.com/', desc: '全球开发问题检索', tag: 'Q&A' },
    ],
  },
]

export const techStack: TechStackItem[] = [
  {
    name: 'Vue 3 + Vue Router',
    desc: '组件化多页面与路由切换转场，全部视图路由级懒加载',
  },
  {
    name: 'TypeScript',
    desc: '全站类型约束，构建期 vue-tsc 校验',
  },
  {
    name: 'Vite',
    desc: '极速开发与按需 tree-shaking 构建，重依赖全部移出首屏',
  },
  {
    name: 'Lenis',
    desc: '平滑惯性滚动，自带 rAF 循环，零额外依赖',
  },
  {
    name: 'Fraunces + Noto Serif SC',
    desc: '拉丁刊头衬线与中文宋体的双排版系统',
  },
  {
    name: 'JetBrains Mono + 等宽数字',
    desc: '全部数据、标签与元信息使用 tabular-nums 对齐',
  },
  {
    name: '1px 网格版律',
    desc: '无卡片、无阴影、无圆角；层级靠字号、字重与留白',
  },
  {
    name: 'IntersectionObserver',
    desc: '滚动显现由原生 IO + CSS 过渡承担，无 JS 动画库',
  },
  {
    name: 'Shiki (core/engine)',
    desc: '长文代码块按需高亮，懒加载避免进首屏',
  },
  { name: 'TensorFlow.js + MobileNet', desc: 'XAI 实验室的浏览器端推理，路由级分包按需加载' },
  { name: 'Canvas 2D', desc: '全站孢子粒子场背景与 XAI 热力图绘制' },
]

export const apiCatalog: ApiEntry[] = [
  {
    name: '一言 Hitokoto',
    endpoint: 'https://v1.hitokoto.cn',
    method: 'GET',
    usage: '获取首页文案卡片内容',
  },
  {
    name: 'Open-Meteo Weather',
    endpoint:
      'https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lng}&current=temperature_2m,weather_code,wind_speed_10m&timezone=auto',
    method: 'GET',
    usage: '获取实时天气、温度与风速',
  },
]

export const personalAchievements: AchievementItem[] = [
  {
    id: 'journal-paper',
    title: '《控制与决策》期刊一篇(北核/CSCD/EI)',
    subtitle: '学术科研成果',
    icon: '📘',
    theme: 'academic',
    detailFile: 'achievements/journal-paper.md',
  },
  {
    id: 'mcm-award',
    title: '美国数学建模大赛获奖',
    subtitle: '国际建模实践',
    icon: '🏆',
    theme: 'modeling',
    detailFile: 'achievements/mcm-award.md',
  },
  {
    id: 'lanqiao-prize',
    title: '蓝桥杯省赛三等奖',
    subtitle: '算法竞赛经历',
    icon: '🥉',
    theme: 'competition',
    detailFile: 'achievements/lanqiao-prize.md',
  },
  {
    id: 'innovation-project',
    title: '国家级创新创业大赛项目队员',
    subtitle: '创新创业项目',
    icon: '🚀',
    theme: 'innovation',
    detailFile: 'achievements/innovation-project.md',
  },
]
