// 词向量空间演示数据：手工设计的 6 维坐标（示意数据，非真实 embedding 推理结果）。
// 六个语义簇各有一个 6D 中心点，词向量 = 簇中心 + 确定性抖动（seed 哈希，不用 Math.random，
// 保证每次构建/刷新一致）；少数"桥接词"单独手写坐标，落在簇与簇之间，演示语义的连续性。
// 视图层任选 3 个维度投影成 3D，因此"换轴"等于换一个观察语义切片。

export interface WordVec {
  word: string
  cluster: string
  v: number[] // 长度 = VEC_DIMS
}

export const VEC_DIMS = 6

// 维度的语义化别名（仅用于 UI 标注，示意性质）
export const DIM_NAMES = ['生命度', '城市度', '抽象度', '情感度', '自然度', '温度感']

export const CLUSTERS = ['动物', '食物', '科技', '自然', '情绪', '城市'] as const

// 日夜两主题都可读的簇配色
export const CLUSTER_COLORS: Record<string, string> = {
  动物: '#e67e22',
  食物: '#d64545',
  科技: '#2e7fd9',
  自然: '#1e8a4c',
  情绪: '#b04fd8',
  城市: '#0fa3a3',
}

// 簇中心（6D）：生命度 / 城市度 / 抽象度 / 情感度 / 自然度 / 温度感
const CLUSTER_CENTERS: Record<string, number[]> = {
  动物: [8, -2, -6, 2, 6, 3],
  食物: [0, 4, -7, 3, -2, 5],
  科技: [-8, 7, 7, -6, -7, -3],
  自然: [3, -8, -4, 1, 9, 0],
  情绪: [2, 0, 8, 9, -3, 1],
  城市: [-3, 9, -2, -1, -7, 2],
}

// 确定性伪随机：同一 (wordIndex, dim) 永远得到同一抖动值
const hash01 = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

const jitter = (i: number, d: number) => (hash01(i * VEC_DIMS + d) - 0.5) * 3.6

interface WordSeed {
  word: string
  cluster: string
  v?: number[] // 桥接词：手写坐标，跳过"簇中心+抖动"
}

const WORDS: WordSeed[] = [
  // 动物
  { word: '猫', cluster: '动物' },
  { word: '狗', cluster: '动物' },
  { word: '鸟', cluster: '动物' },
  { word: '鱼', cluster: '动物' },
  { word: '马', cluster: '动物' },
  { word: '兔子', cluster: '动物' },
  { word: '老虎', cluster: '动物' },
  { word: '蝴蝶', cluster: '动物' },
  { word: '鲸鱼', cluster: '动物' },
  // 食物
  { word: '米饭', cluster: '食物' },
  { word: '面条', cluster: '食物' },
  { word: '苹果', cluster: '食物' },
  { word: '面包', cluster: '食物' },
  { word: '咖啡', cluster: '食物' },
  { word: '茶', cluster: '食物' },
  { word: '蛋糕', cluster: '食物' },
  { word: '火锅', cluster: '食物' },
  { word: '牛奶', cluster: '食物' },
  // 科技
  { word: '电脑', cluster: '科技' },
  { word: '手机', cluster: '科技' },
  { word: '算法', cluster: '科技' },
  { word: '网络', cluster: '科技' },
  { word: '机器人', cluster: '科技' },
  { word: '数据', cluster: '科技' },
  { word: '芯片', cluster: '科技' },
  { word: '程序', cluster: '科技' },
  { word: '模型', cluster: '科技' },
  // 自然
  { word: '山', cluster: '自然' },
  { word: '河流', cluster: '自然' },
  { word: '森林', cluster: '自然' },
  { word: '雨', cluster: '自然' },
  { word: '雪', cluster: '自然' },
  { word: '海洋', cluster: '自然' },
  { word: '风', cluster: '自然' },
  { word: '星星', cluster: '自然' },
  { word: '花', cluster: '自然' },
  // 情绪
  { word: '快乐', cluster: '情绪' },
  { word: '悲伤', cluster: '情绪' },
  { word: '愤怒', cluster: '情绪' },
  { word: '平静', cluster: '情绪' },
  { word: '焦虑', cluster: '情绪' },
  { word: '惊喜', cluster: '情绪' },
  { word: '思念', cluster: '情绪' },
  { word: '孤独', cluster: '情绪' },
  { word: '满足', cluster: '情绪' },
  // 城市
  { word: '地铁', cluster: '城市' },
  { word: '高楼', cluster: '城市' },
  { word: '街道', cluster: '城市' },
  { word: '公园', cluster: '城市' },
  { word: '商场', cluster: '城市' },
  { word: '车站', cluster: '城市' },
  { word: '广场', cluster: '城市' },
  { word: '出租车', cluster: '城市' },
  { word: '霓虹灯', cluster: '城市' },
  // 桥接词：刻意落在两簇之间
  { word: '流浪猫', cluster: '动物', v: [7, 4, -5, 3, 3, 3] },
  { word: '茶馆', cluster: '食物', v: [0, 6, -6, 3, -1, 4] },
  // 咖啡馆的坐标在构建后精确改写为 咖啡 − 茶 + 茶馆（见下方 ANALOGIES 注释）
  { word: '咖啡馆', cluster: '城市' },
  { word: '智能音箱', cluster: '科技', v: [-6, 5, 6, -3, -5, -2] },
  { word: '乡愁', cluster: '情绪', v: [2, -3, 7, 8, 2, 1] },
]

export const WORD_VECTORS: WordVec[] = WORDS.map((w, i) => ({
  word: w.word,
  cluster: w.cluster,
  v: w.v ?? CLUSTER_CENTERS[w.cluster].map((c, d) => +(c + jitter(i, d)).toFixed(2)),
}))

// 「咖啡馆」精确落在 茶→茶馆 的位移施加到咖啡上的位置（仍紧贴茶馆邻域，桥接性质不变），
// 使 ANALOGIES 前两组算术 d=0.00 严格成立（离线脚本验算，次近邻距离 ≥ 2.0）。
const wv = (word: string) => WORD_VECTORS.find((w) => w.word === word)!
wv('咖啡馆').v = wv('茶馆').v.map((x, d) => +(x + wv('咖啡').v[d] - wv('茶').v[d]).toFixed(2))

// 语义算术演示：c + (b − a) 的最近邻应落在 expect 上。
// 位移 b − a 的语义 = "从 a 到 b 的关系"（如 茶→茶馆 = 饮品 → 饮品店）。
export interface Analogy {
  a: string
  b: string
  c: string
  expect: string
  note: string
}

export const ANALOGIES: Analogy[] = [
  {
    a: '茶', b: '茶馆', c: '咖啡', expect: '咖啡馆',
    note: '「茶 → 茶馆」是饮品加上一家店；同一段位移加到咖啡上，正好落在咖啡馆（d = 0.00）。',
  },
  {
    a: '咖啡馆', b: '咖啡', c: '茶馆', expect: '茶',
    note: '反向走一遍：茶馆 − 咖啡馆 + 咖啡 落回茶——关系向量是可逆的（d = 0.00）。',
  },
  {
    a: '茶', b: '茶馆', c: '苹果', expect: '咖啡馆',
    note: '同一段位移加到苹果上，最近的还是咖啡馆（d ≈ 2.0）：语义算术是近似最近邻，不是精确等式。',
  },
]

// 全数据的最大模长，供视图层归一化缩放
export const WORD_VEC_RADIUS = Math.max(...WORD_VECTORS.map((w) => Math.hypot(...w.v)))
