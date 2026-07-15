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

export const personalProfile = {
  name: 'zry',
  role: 'Technical Documentation Engineer Intern , Hikrobot',
  tagline: '个人主页',
  location: 'Hangzhou, China',
  email: 'zry@zufe.edu.cn',
  blog: 'https://zryshuaige.space',
  github: 'https://github.com/zryshuaige',
  research : '粒计算与知识发现, 智能决策与优化算法',
}

export const heroStats: HeroStat[] = [
  { label: '上线页面', value: '20+' },
  { label: '实习经历', value: '1ing' },
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
  '🎯 研究方向：粒计算与知识发现、智能决策与优化算法',
  '🧠 关注重点：体验驱动开发与稳定交付',
  '📚 日常节奏：输入新知 + 输出总结',
  '🤝 欢迎交流：科研、前端体验与产品思考',
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
    id: 'dev',
    title: '开发工具',
    icon: '🛠️',
    description: '前端开发常用文档、平台与调试工具',
    links: [
      { name: 'MDN', url: 'https://developer.mozilla.org/zh-CN/', desc: 'Web API 与标准文档', tag: 'Docs' },
      { name: 'Vite', url: 'https://vite.dev/', desc: '下一代前端构建工具', tag: 'Build' },
      { name: 'Can I use', url: 'https://caniuse.com/', desc: '浏览器兼容性查询', tag: 'Compat' },
      { name: 'Stack Overflow', url: 'https://stackoverflow.com/', desc: '开发问题检索', tag: 'Q&A' },
      { name: 'CodePen', url: 'https://codepen.io/', desc: '在线前端实验场', tag: 'Demo' },
      { name: 'Naive UI', url: 'https://www.naiveui.com/zh-CN/', desc: 'Vue3 组件库文档', tag: 'UI' },
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
    description: '课程、教程与技术趋势追踪',
    links: [
      { name: 'Vue 文档', url: 'https://cn.vuejs.org/', desc: 'Vue3 官方中文文档', tag: 'Vue' },
      { name: 'TypeScript', url: 'https://www.typescriptlang.org/', desc: 'TS 官方手册', tag: 'TS' },
      { name: '阮一峰周刊', url: 'https://www.ruanyifeng.com/blog/', desc: '技术新闻与新工具', tag: 'Weekly' },
      { name: 'freeCodeCamp', url: 'https://www.freecodecamp.org/', desc: '系统化编程学习平台', tag: 'Course' },
    ],
  },
  {
    id: 'ai',
    title: 'AI 效率',
    icon: '🤖',
    description: '日常提效的 AI 与自动化平台',
    links: [
      { name: 'ChatGPT', url: 'https://chat.openai.com/', desc: '通用助手与创作支持', tag: 'LLM' },
      { name: 'GitHub Copilot', url: 'https://github.com/features/copilot', desc: '代码补全与辅助开发', tag: 'Code AI' },
      { name: 'Claude', url: 'https://claude.ai/', desc: '文档分析与对话助手', tag: 'Assistant' },
      { name: 'Perplexity', url: 'https://www.perplexity.ai/', desc: '搜索增强型问答', tag: 'Search AI' },
    ],
  },
]

export const techStack: TechStackItem[] = [
  {
    name: 'TresJS + Three',
    desc: '本站粒子流场背景与多层 WebGL 场景',
  },
  {
    name: '@tresjs/post-processing',
    desc: 'Bloom + Vignette 后处理，质感的关键',
  },
  {
    name: 'GSAP ScrollTrigger',
    desc: 'Home 视差、时间轴生长、阅读进度条驱动',
  },
  {
    name: 'Lenis',
    desc: '全程平滑惯性滚动，并与 ticker 同步',
  },
  {
    name: 'Atropos',
    desc: 'Hero 3D 倾斜卡片',
  },
  {
    name: 'Splitting',
    desc: '标题拆字入场与开屏字母逐一浮现',
  },
  {
    name: 'Shiki(core/engine)',
    desc: 'md 代码块按需高亮，懒加载避免进首屏',
  },
  { name: 'ECharts', desc: '科研页 Pareto 前沿与 ARIMA+LSTM 时序预测' },
  { name: 'd3-force', desc: '科研因果反馈图的力导布局' },
  { name: 'Vue 3 + Vue Router', desc: '组件化多页面与路由切换转场' },
  { name: 'TypeScript', desc: '全站类型约束，构建期 vue-tsc 校验' },
  { name: 'Vite', desc: '极速开发与按需 tree-shaking 构建' },
  { name: 'CSS 变量 + 设计 token', desc: '统一北卡蓝色板、字体、动效曲线' },
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
