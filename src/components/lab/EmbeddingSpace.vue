<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  WORD_VECTORS,
  CLUSTERS,
  CLUSTER_COLORS,
  VEC_DIMS,
  DIM_NAMES,
  WORD_VEC_RADIUS,
  ANALOGIES,
  type WordVec,
} from '../../data/wordVectors'
import { prefersReducedMotion } from '../../composables/usePrefersReducedMotion'
import PlaybackBar from './PlaybackBar.vue'

const canvasEl = ref<HTMLCanvasElement | null>(null)
const wrapEl = ref<HTMLElement | null>(null)

const hovered = ref<WordVec | null>(null)
const selected = ref<WordVec | null>(null)
const query = ref('')
const tipPos = ref<{ x: number; y: number } | null>(null)

// 从 6 维中选 3 维作为投影轴（默认 D1/D2/D3）
const axes = ref<[number, number, number]>([0, 1, 2])
const dimOptions = Array.from({ length: VEC_DIMS }, (_, i) => i)

// 邻居：在完整 6 维空间里算欧氏距离（换投影轴不影响"谁近"）
type Neighbor = WordVec & { d: number; sim: number }
const dist6 = (a: WordVec, b: WordVec) => Math.hypot(...a.v.map((x, i) => x - b.v[i]))

const neighborsOf = (w: WordVec): Neighbor[] => {
  const all = WORD_VECTORS.filter((v) => v !== w).map((v) => ({ ...v, d: dist6(w, v) }))
  const dMax = Math.max(...all.map((v) => v.d), 0.0001)
  return all
    .sort((a, b) => a.d - b.d)
    .slice(0, 5)
    .map((v) => ({ ...v, sim: 1 - v.d / dMax }))
}

const neighbors = computed<Neighbor[]>(() => (selected.value ? neighborsOf(selected.value) : []))

// 星座连线：每个词连向最近的同簇词（配对去重），让「词聚成星座」直接可见
const CONSTELLATION: [WordVec, WordVec][] = (() => {
  const pairs: [WordVec, WordVec][] = []
  const seen = new Set<string>()
  for (const w of WORD_VECTORS) {
    let best: WordVec | null = null
    let bestD = Infinity
    for (const o of WORD_VECTORS) {
      if (o === w || o.cluster !== w.cluster) continue
      const d = dist6(w, o)
      if (d < bestD) {
        bestD = d
        best = o
      }
    }
    if (best) {
      const key = [w.word, best.word].sort().join('|')
      if (!seen.has(key)) {
        seen.add(key)
        pairs.push([w, best])
      }
    }
  }
  return pairs
})()

// 簇质心：星座的「星官名」标注位置
const CENTROIDS = CLUSTERS.map((cluster) => {
  const ws = WORD_VECTORS.filter((w) => w.cluster === cluster)
  const v = Array.from({ length: VEC_DIMS }, (_, d) => ws.reduce((s, w) => s + w.v[d], 0) / ws.length)
  return { cluster, v }
})

// ===== 语义算术（词 − 词 + 词）分步演示 =====
const TOTAL_BEATS = 3
const analogyIdx = ref(0)
const beat = ref(0) // 已推进到的拍 0..3
const playing = ref(false)
const speed = ref(1)
let beatStartedAt = 0
let playTimer: ReturnType<typeof setTimeout> | null = null

const analogy = computed(() => ANALOGIES[analogyIdx.value])

// c + (b − a) 的结果向量与其最近邻词（排除三个输入词）
const analogyCalc = computed(() => {
  const g = (word: string) => WORD_VECTORS.find((v) => v.word === word)!
  const va = g(analogy.value.a)
  const vb = g(analogy.value.b)
  const vc = g(analogy.value.c)
  const res = vc.v.map((x, i) => x + vb.v[i] - va.v[i])
  let nearest: WordVec | null = null
  let nearestD = Infinity
  for (const w of WORD_VECTORS) {
    if (w === va || w === vb || w === vc) continue
    const d = Math.hypot(...w.v.map((x, i) => x - res[i]))
    if (d < nearestD) {
      nearestD = d
      nearest = w
    }
  }
  return { va, vb, vc, res, nearest: nearest!, nearestD }
})

const BEAT_DUR = [1500, 1700, 2800] // 各拍在 1× 速度下的停留 ms（第 3 拍留足读数时间再循环）

const gotoBeat = (n: number) => {
  beat.value = n
  beatStartedAt = performance.now()
}

const clearPlayTimer = () => {
  if (playTimer !== null) {
    clearTimeout(playTimer)
    playTimer = null
  }
}

const schedulePlay = () => {
  clearPlayTimer()
  if (!playing.value) return
  const dur = (BEAT_DUR[Math.min(beat.value, TOTAL_BEATS - 1)] ?? 2000) / speed.value
  playTimer = setTimeout(() => {
    gotoBeat(beat.value >= TOTAL_BEATS ? 0 : beat.value + 1)
    schedulePlay()
  }, dur)
}

const togglePlay = () => {
  playing.value = !playing.value
  if (playing.value && beat.value >= TOTAL_BEATS) gotoBeat(0)
  schedulePlay()
}

const stepOnce = () => {
  playing.value = false
  gotoBeat(Math.min(beat.value + 1, TOTAL_BEATS))
}

const resetPlay = () => {
  playing.value = false
  gotoBeat(0)
}

const cycleSpeed = () => {
  speed.value = speed.value === 1 ? 2 : speed.value === 2 ? 0.5 : 1
  schedulePlay()
}

watch(analogyIdx, resetPlay)

// 点 chips 选类比：等 watcher 的 resetPlay 先落完，再重置并自动播放这组算术路径
const pickAnalogy = async (i: number) => {
  analogyIdx.value = i
  await nextTick()
  resetPlay()
  playing.value = true
  schedulePlay()
}

// 逐拍解说：每一步一句话，跟随 PlaybackBar 的拍号
const beatCaption = computed(() => {
  const an = analogy.value
  switch (beat.value) {
    case 1:
      return `测量「${an.a} → ${an.b}」的关系位移：这段向量差就是可以搬运的「关系」。`
    case 2:
      return `把同一段位移平移到「${an.c}」上，沿虚线平行四边形找到落点。`
    case 3:
      return `落点最近的词是「${analogyCalc.value.nearest.word}」（d = ${analogyCalc.value.nearestD.toFixed(2)}）。${an.note}`
    default:
      return '播放或单步：先看 a→b 的关系位移，再看同一段位移施加到 c 上落在哪。'
  }
})

// ===== 3D 旋转与投影 =====
let yaw = 0.7
let pitch = 0.32
const dragging = ref(false)
let lastInteract = 0
const autoSpin = !prefersReducedMotion()
const PITCH_LIMIT = 1.2

let cw = 0
let ch = 0

interface Proj {
  x: number
  y: number
  k: number // 透视缩放系数（≈深度）
}

const project = (w: WordVec): Proj => {
  const x = w.v[axes.value[0]]
  const y = w.v[axes.value[1]]
  const z = w.v[axes.value[2]]
  const cosY = Math.cos(yaw)
  const sinY = Math.sin(yaw)
  const x1 = x * cosY + z * sinY
  const z1 = -x * sinY + z * cosY
  const cosP = Math.cos(pitch)
  const sinP = Math.sin(pitch)
  const y1 = y * cosP - z1 * sinP
  const z2 = y * sinP + z1 * cosP
  // 弱透视：焦距取 3.2 倍数据半径，保证分母恒正且形变克制
  const k = (3.2 * WORD_VEC_RADIUS) / (3.2 * WORD_VEC_RADIUS + z2)
  const world = (Math.min(cw, ch) * 0.38) / WORD_VEC_RADIUS
  return { x: cw / 2 + x1 * world * k, y: ch / 2 - y1 * world * k, k }
}

const themeColors = () => {
  const css = getComputedStyle(document.documentElement)
  return {
    ink: css.getPropertyValue('--ink').trim() || '#0f2417',
    inkSoft: css.getPropertyValue('--ink-soft').trim() || '#42584a',
    ruleSoft: css.getPropertyValue('--rule-soft').trim() || 'rgba(0,0,0,0.15)',
    accent: css.getPropertyValue('--accent').trim() || '#195736',
  }
}

const draw = () => {
  const c = canvasEl.value
  if (!c || cw === 0 || ch === 0) return
  const dpr = window.devicePixelRatio || 1
  c.width = Math.round(cw * dpr)
  c.height = Math.round(ch * dpr)
  const ctx = c.getContext('2d')!
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, cw, ch)

  const { ink, inkSoft, ruleSoft, accent } = themeColors()
  const s = Math.min(cw, ch)
  const tNow = performance.now() / 1000

  // 标签避让：已占用的屏幕矩形（轴标签、高亮词、簇名优先登记），重叠的普通标签直接跳过
  const occupied: { x0: number; y0: number; x1: number; y1: number }[] = []
  const labelFree = (x: number, y: number, w: number, h: number) => {
    const r = { x0: x, y0: y - h, x1: x + w + 2, y1: y + 3 }
    const hit = occupied.some((o) => !(r.x1 < o.x0 || o.x1 < r.x0 || r.y1 < o.y0 || o.y1 < r.y0))
    if (hit) return false
    occupied.push(r)
    return true
  }
  // 待避让的普通词标签（稍后按深度近处优先绘制）
  const pendingLabels: { text: string; x: number; y: number; depthN: number }[] = []

  // 参考球赤道圈（强化"球内空间"的立体感）
  ctx.strokeStyle = ruleSoft
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.arc(cw / 2, ch / 2, s * 0.38, 0, Math.PI * 2)
  ctx.stroke()

  // 两条纬线圈：随俯仰角压扁的椭圆，球体转动时更有体积感（比赤道淡一档，不抢戏）
  const worldScale = (s * 0.38) / WORD_VEC_RADIUS
  const latR = WORD_VEC_RADIUS * Math.cos(Math.asin(0.5))
  ctx.globalAlpha = 0.5
  for (const lat of [-0.5, 0.5]) {
    const ry = Math.abs(Math.sin(pitch)) * latR * worldScale
    if (ry < 2) continue
    const cy = ch / 2 - WORD_VEC_RADIUS * lat * Math.cos(pitch) * worldScale
    ctx.beginPath()
    ctx.ellipse(cw / 2, cy, latR * worldScale, ry, 0, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.globalAlpha = 1

  // 三条投影轴：从中心沿旋转后的单位向量伸出，标注维度名
  ctx.font = "11px 'JetBrains Mono', ui-monospace, monospace"
  ctx.fillStyle = inkSoft
  for (let i = 0; i < 3; i++) {
    const fake = { word: '', cluster: '', v: [0, 0, 0, 0, 0, 0] } as WordVec
    fake.v[axes.value[i]] = WORD_VEC_RADIUS * 1.08
    const p = project(fake)
    ctx.strokeStyle = ruleSoft
    ctx.beginPath()
    ctx.moveTo(cw / 2, ch / 2)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    ctx.fillText(`D${axes.value[i] + 1}·${DIM_NAMES[axes.value[i]]}`, p.x + 4, p.y)
    const tw = ctx.measureText(`D${axes.value[i] + 1}·${DIM_NAMES[axes.value[i]]}`).width
    occupied.push({ x0: p.x + 2, y0: p.y - 11, x1: p.x + 6 + tw, y1: p.y + 3 })
  }

  // 星座连线：同簇最近邻相连，簇色淡线，近处更实（只做结构暗示，不喧宾夺主）
  ctx.lineWidth = 1
  for (const [a, b] of CONSTELLATION) {
    const pa = project(a)
    const pb = project(b)
    const kd = Math.max(0, Math.min(1, ((pa.k + pb.k) / 2 - 0.76) / 0.48))
    ctx.strokeStyle = CLUSTER_COLORS[a.cluster] ?? ruleSoft
    ctx.globalAlpha = 0.05 + kd * 0.18
    ctx.beginPath()
    ctx.moveTo(pa.x, pa.y)
    ctx.lineTo(pb.x, pb.y)
    ctx.stroke()
  }
  ctx.globalAlpha = 1

  // 选中词到 Top-5 邻居的连线（流动虚线）
  const neighborSet = new Set(neighbors.value.map((n) => n.word))
  if (selected.value) {
    const from = project(selected.value)
    ctx.setLineDash([6, 6])
    ctx.lineDashOffset = -tNow * 14
    for (const n of neighbors.value) {
      const to = project(n)
      ctx.strokeStyle = CLUSTER_COLORS[n.cluster] ?? inkSoft
      ctx.globalAlpha = 0.3 + n.sim * 0.5
      ctx.lineWidth = 1 + n.sim * 2
      ctx.beginPath()
      ctx.moveTo(from.x, from.y)
      ctx.lineTo(to.x, to.y)
      ctx.stroke()
    }
    ctx.setLineDash([])
    ctx.globalAlpha = 1
  }

  // ===== 语义算术箭头：端点存 6D，每帧随星球投影，旋转/拖拽时不脱节 =====
  const analogyWordSet = new Set<string>()
  if (beat.value > 0) {
    const { va, vb, vc, res, nearest } = analogyCalc.value
    analogyWordSet.add(va.word).add(vb.word).add(vc.word)
    if (beat.value >= 3) analogyWordSet.add(nearest.word)
    const pa = project(va)
    const pb = project(vb)
    const pc = project(vc)
    const pres = project({ word: '', cluster: '', v: res } as WordVec)
    const beatT = (performance.now() - beatStartedAt) / 1000
    const grow = (dur: number) => {
      const g = Math.min(beatT / dur, 1)
      return 1 - Math.pow(1 - g, 3) // easeOutCubic
    }
    const lerpP = (p: Proj, q: Proj, t: number): Proj => ({
      x: p.x + (q.x - p.x) * t,
      y: p.y + (q.y - p.y) * t,
      k: p.k + (q.k - p.k) * t,
    })
    const arrow = (from: Proj, to: Proj, color: string, width: number) => {
      const ang = Math.atan2(to.y - from.y, to.x - from.x)
      ctx.strokeStyle = color
      ctx.fillStyle = color
      ctx.lineWidth = width
      ctx.beginPath()
      ctx.moveTo(from.x, from.y)
      ctx.lineTo(to.x, to.y)
      ctx.stroke()
      const ah = 9 // 箭头头
      ctx.beginPath()
      ctx.moveTo(to.x, to.y)
      ctx.lineTo(to.x - ah * Math.cos(ang - 0.42), to.y - ah * Math.sin(ang - 0.42))
      ctx.lineTo(to.x - ah * Math.cos(ang + 0.42), to.y - ah * Math.sin(ang + 0.42))
      ctx.closePath()
      ctx.fill()
    }

    // 第 1 拍：a → b 的关系位移
    arrow(pa, lerpP(pa, pb, beat.value === 1 ? grow(0.9) : 1), accent, 2.5)

    if (beat.value >= 2) {
      // 第 2 拍：平行四边形参考线 + 同一段位移从 c 出发
      ctx.save()
      ctx.strokeStyle = inkSoft
      ctx.globalAlpha = 0.55
      ctx.lineWidth = 1
      ctx.setLineDash([4, 5])
      ctx.beginPath()
      ctx.moveTo(pa.x, pa.y)
      ctx.lineTo(pc.x, pc.y)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(pb.x, pb.y)
      ctx.lineTo(pres.x, pres.y)
      ctx.stroke()
      ctx.restore()
      arrow(pc, lerpP(pc, pres, beat.value === 2 ? grow(1.0) : 1), ink, 2.5)
    }

    if (beat.value >= 3) {
      // 第 3 拍：落点 ghost 圈
      ctx.save()
      ctx.strokeStyle = inkSoft
      ctx.lineWidth = 1
      ctx.setLineDash([3, 4])
      ctx.beginPath()
      ctx.arc(pres.x, pres.y, 9 * pres.k, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }
  }

  // 词点：按深度从远到近画（画家算法），近大远小、近实远淡
  const pulseWord = beat.value >= 3 ? analogyCalc.value.nearest.word : null
  const ordered = WORD_VECTORS.map((w) => ({ w, p: project(w) })).sort((a, b) => a.p.k - b.p.k)
  ctx.font = "12px -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif"
  for (const { w, p } of ordered) {
    const isSel = selected.value?.word === w.word
    const isHov = hovered.value?.word === w.word
    const isNb = neighborSet.has(w.word)
    const isAna = analogyWordSet.has(w.word)
    const depth = (p.k - 0.76) / 0.48 // k 的大致范围归一到 0..1
    const depthN = Math.max(0, Math.min(1, depth))
    const r = (isSel ? 7 : isHov ? 6 : isNb || isAna ? 5 : 4.2) * p.k
    ctx.fillStyle = CLUSTER_COLORS[w.cluster] ?? inkSoft
    ctx.globalAlpha = (selected.value && !isSel && !isNb ? 0.4 : 1) * (0.4 + 0.6 * depthN)
    ctx.beginPath()
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
    ctx.fill()
    if (isSel || isHov) {
      ctx.globalAlpha = 1
      ctx.strokeStyle = ink
      ctx.lineWidth = 1.5
      ctx.stroke()
    }
    // 选中词的呼吸光环
    if (isSel) {
      ctx.globalAlpha = 0.55
      ctx.strokeStyle = accent
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.arc(p.x, p.y, (11 + Math.sin(tNow * 2.6) * 2.2) * p.k, 0, Math.PI * 2)
      ctx.stroke()
    }
    // 第 3 拍：算术结果的最近邻词脉冲光圈
    if (w.word === pulseWord) {
      ctx.globalAlpha = 0.85
      ctx.strokeStyle = accent
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(p.x, p.y, (10 + Math.sin(tNow * 3) * 2.5) * p.k, 0, Math.PI * 2)
      ctx.stroke()
    }
    if (isSel || isHov || isNb || isAna) {
      ctx.globalAlpha = 1
      ctx.fillStyle = ink
      ctx.fillText(w.word, p.x + r + 4, p.y + 4)
      const tw = ctx.measureText(w.word).width
      occupied.push({ x0: p.x + r + 2, y0: p.y - 8, x1: p.x + r + 6 + tw, y1: p.y + 7 })
    } else {
      // 普通词标签进待画队列，避让后统一绘制
      pendingLabels.push({ text: w.word, x: p.x + r + 3, y: p.y + 3, depthN })
    }
    ctx.globalAlpha = 1
  }

  // 簇名标注：每个星座的「星官名」，画在簇质心上方；压到已有标签时本帧跳过
  ctx.font = "10px 'JetBrains Mono', ui-monospace, monospace"
  ctx.textAlign = 'center'
  for (const c of CENTROIDS) {
    const p = project({ word: '', cluster: c.cluster, v: c.v } as WordVec)
    const kd = Math.max(0, Math.min(1, (p.k - 0.76) / 0.48))
    const tw = ctx.measureText(c.cluster).width
    const ly = p.y - 30 * p.k
    if (!labelFree(p.x - tw / 2, ly, tw, 11)) continue
    ctx.globalAlpha = 0.3 + 0.5 * kd
    ctx.fillStyle = inkSoft
    ctx.fillText(c.cluster, p.x, ly)
  }
  ctx.textAlign = 'left'
  ctx.globalAlpha = 1

  // 普通词标签：近处优先贪心避让，后半球（depthN 低）直接不画
  ctx.font = "12px -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif"
  pendingLabels.sort((a, b) => b.depthN - a.depthN)
  for (const l of pendingLabels) {
    if (l.depthN < 0.45) continue
    const tw = ctx.measureText(l.text).width
    if (!labelFree(l.x, l.y, tw, 12)) continue
    ctx.globalAlpha = 0.25 + 0.55 * l.depthN
    ctx.fillStyle = inkSoft
    ctx.fillText(l.text, l.x, l.y)
  }
  ctx.globalAlpha = 1
}

// ===== 交互：拖拽旋转 + hover/点击选词 =====
const HIT_R = 14
const pickAt = (x: number, y: number): WordVec | null => {
  let best: WordVec | null = null
  let bestD = HIT_R
  for (const w of WORD_VECTORS) {
    const p = project(w)
    const d = Math.hypot(p.x - x, p.y - y)
    if (d < bestD) {
      bestD = d
      best = w
    }
  }
  return best
}

let lastPtr = { x: 0, y: 0 }
let dragDist = 0

const onDown = (e: PointerEvent) => {
  dragging.value = true
  dragDist = 0
  lastPtr = { x: e.offsetX, y: e.offsetY }
  ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
}

const onMove = (e: PointerEvent) => {
  if (dragging.value) {
    const dx = e.offsetX - lastPtr.x
    const dy = e.offsetY - lastPtr.y
    dragDist += Math.abs(dx) + Math.abs(dy)
    yaw += dx * 0.008
    pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch + dy * 0.008))
    lastPtr = { x: e.offsetX, y: e.offsetY }
    lastInteract = performance.now()
    tipPos.value = null
    return
  }
  const hit = pickAt(e.offsetX, e.offsetY)
  hovered.value = hit
  tipPos.value = hit ? { x: e.offsetX + 14, y: e.offsetY + 14 } : null
}

const onUp = () => {
  dragging.value = false
  lastInteract = performance.now()
}

const onLeave = () => {
  hovered.value = null
  tipPos.value = null
}

const onPick = (e: MouseEvent) => {
  if (dragDist > 4) return // 拖拽结束的 click 不触发选词
  const hit = pickAt(e.offsetX, e.offsetY)
  selected.value = hit // 点空白处清除选中
  if (hit) query.value = hit.word
}

// 搜索框：精确命中词名即选中
watch(query, (q) => {
  if (!q) return
  const hit = WORD_VECTORS.find((w) => w.word === q)
  if (hit) selected.value = hit
})

// ===== 「找一个词」自定义补全（替代原生 datalist）=====
const comboOpen = ref(false)
const comboIdx = ref(0)
const comboWords = computed(() => {
  const q = query.value
  if (!q) return []
  return WORD_VECTORS.filter((w) => w.word.includes(q)).slice(0, 8)
})

watch(query, () => {
  comboIdx.value = 0
})

const chooseWord = (word: string) => {
  query.value = word
  selected.value = WORD_VECTORS.find((w) => w.word === word) ?? null
  comboOpen.value = false
}

const onComboKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    comboOpen.value = false
    return
  }
  const list = comboWords.value
  if (list.length === 0) return
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    comboIdx.value = (comboIdx.value + 1) % list.length
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    comboIdx.value = (comboIdx.value - 1 + list.length) % list.length
  } else if (e.key === 'Enter') {
    chooseWord(list[Math.min(comboIdx.value, list.length - 1)].word)
  }
}

// ===== 主循环与尺寸/主题 =====
let rafId = 0
let resizeOb: ResizeObserver | null = null
let themeOb: MutationObserver | null = null

const tick = () => {
  // 松手 2.5s 后恢复自转；减少动效偏好下永不自转
  if (autoSpin && !dragging.value && performance.now() - lastInteract > 2500) yaw += 0.0035
  draw()
  rafId = requestAnimationFrame(tick)
}

onMounted(() => {
  const wrap = wrapEl.value
  if (wrap) {
    cw = wrap.clientWidth
    ch = wrap.clientHeight
    resizeOb = new ResizeObserver(() => {
      cw = wrap.clientWidth
      ch = wrap.clientHeight
    })
    resizeOb.observe(wrap)
  }
  themeOb = new MutationObserver(draw)
  themeOb.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  rafId = requestAnimationFrame(tick)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
  clearPlayTimer()
  resizeOb?.disconnect()
  themeOb?.disconnect()
})
</script>

<template>
  <div class="emb-stage-grid">
    <!-- 左：3D 散点 -->
    <div class="emb-stage-left">
      <div ref="wrapEl" class="emb-canvas-wrap">
        <canvas
          ref="canvasEl"
          class="emb-canvas"
          :class="{ pickable: hovered && !dragging, grabbing: dragging }"
          @pointerdown="onDown"
          @pointermove="onMove"
          @pointerup="onUp"
          @pointerleave="onLeave"
          @click="onPick"
        ></canvas>
        <div v-if="hovered && tipPos" class="emb-tooltip mono" :style="{ left: tipPos.x + 'px', top: tipPos.y + 'px' }">
          {{ hovered.word }} · {{ hovered.cluster }}
        </div>
      </div>
      <div class="emb-legend">
        <span v-for="c in CLUSTERS" :key="c" class="emb-legend-item">
          <i class="emb-dot" :style="{ background: CLUSTER_COLORS[c] }"></i>{{ c }}
        </span>
      </div>
      <p class="emb-hint">按住拖拽可手动旋转，松手后自动恢复自转。</p>
    </div>

    <!-- 右：控件 -->
    <div class="emb-controls">
      <div class="emb-block">
        <h3>观察角度（6 维选 3 维投影）</h3>
        <div class="emb-axis-row">
          <label v-for="slot in 3" :key="slot" class="emb-axis">
            <span class="mono">{{ ['X', 'Y', 'Z'][slot - 1] }} 轴</span>
            <select v-model.number="axes[slot - 1]" class="emb-select">
              <option v-for="d in dimOptions" :key="d" :value="d">D{{ d + 1 }} · {{ DIM_NAMES[d] }}</option>
            </select>
          </label>
        </div>
      </div>

      <div class="emb-block">
        <h3>语义算术：c + (b − a)</h3>
        <div class="emb-chips" role="tablist" aria-label="选择类比例子">
          <button
            v-for="(an, i) in ANALOGIES"
            :key="i"
            type="button"
            role="tab"
            :aria-selected="analogyIdx === i"
            :class="['emb-chip mono', { active: analogyIdx === i }]"
            @click="pickAnalogy(i)"
          >
            {{ an.c }} − {{ an.a }} + {{ an.b }}
          </button>
        </div>
        <PlaybackBar
          class="emb-play"
          :playing="playing"
          :step="beat"
          :total="TOTAL_BEATS"
          :speed="speed"
          @toggle="togglePlay"
          @step-forward="stepOnce"
          @reset="resetPlay"
          @cycle-speed="cycleSpeed"
        />
        <p class="emb-narration">
          <span class="emb-narration-tag mono">BEAT {{ beat }}/{{ TOTAL_BEATS }}</span>
          {{ beatCaption }}
        </p>
        <p v-if="beat >= 3" class="emb-readout mono">
          {{ analogy.c }} − {{ analogy.a }} + {{ analogy.b }} ≈ <b>{{ analogyCalc.nearest.word }}</b>
          （距离 {{ analogyCalc.nearestD.toFixed(2)
          }}<template v-if="analogyCalc.nearest.word !== analogy.expect">，预期 {{ analogy.expect }}</template>）
        </p>
      </div>

      <div class="emb-block">
        <h3>找一个词</h3>
        <div class="emb-combo">
          <input
            v-model.trim="query"
            class="emb-input"
            type="text"
            placeholder="输入词名，如「咖啡」…"
            role="combobox"
            :aria-expanded="comboOpen"
            autocomplete="off"
            @input="comboOpen = true"
            @focus="comboOpen = true"
            @keydown="onComboKey"
            @blur="comboOpen = false"
          />
          <ul v-if="comboOpen && comboWords.length" class="emb-combo-list" role="listbox">
            <li
              v-for="(w, i) in comboWords"
              :key="w.word"
              role="option"
              :aria-selected="i === comboIdx"
              :class="{ active: i === comboIdx }"
              @mouseenter="comboIdx = i"
              @mousedown.prevent="chooseWord(w.word)"
            >
              <i class="emb-dot" :style="{ background: CLUSTER_COLORS[w.cluster] }"></i>
              <span class="emb-combo-word">{{ w.word }}</span>
              <span class="emb-combo-cluster">{{ w.cluster }}</span>
            </li>
          </ul>
        </div>
      </div>

      <div class="emb-block">
        <h3 v-if="selected">「{{ selected.word }}」的邻居</h3>
        <h3 v-else>点一个词看看</h3>
        <template v-if="selected">
          <p class="emb-selected-meta">所属簇：{{ selected.cluster }} · 距离在完整 6 维空间中计算</p>
          <ul class="emb-neighbors">
            <li v-for="(n, i) in neighbors" :key="n.word">
              <span class="emb-n-rank mono">{{ i + 1 }}</span>
              <span class="emb-n-word">{{ n.word }}</span>
              <span class="emb-n-track">
                <span class="emb-n-fill" :style="{ width: n.sim * 100 + '%', background: CLUSTER_COLORS[n.cluster] }"></span>
              </span>
              <span class="emb-n-val mono">{{ (n.sim * 100).toFixed(0) }}%</span>
            </li>
          </ul>
          <p class="emb-tip-text">桥接词（如咖啡馆、流浪猫）的邻居常常跨簇——语义是连续渐变，不是硬边界。</p>
        </template>
        <p v-else class="emb-tip-text">在左侧球体里点击任意点，或在上方输入词名。相似度 = 距离归一化后的倒数。</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.emb-stage-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  align-items: start;
}

.emb-stage-left {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.emb-canvas-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 0;
  overflow: hidden;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
}

.emb-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  cursor: grab;
  touch-action: none;
}

.emb-canvas.pickable {
  cursor: pointer;
}

.emb-canvas.grabbing {
  cursor: grabbing;
}

.emb-tooltip {
  position: absolute;
  pointer-events: none;
  padding: 0.2rem 0.5rem;
  background: var(--accent);
  color: var(--paper);
  font-size: 0.78rem;
  white-space: nowrap;
  z-index: 2;
}

.emb-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.8rem;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.emb-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}

.emb-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  display: inline-block;
}

.emb-hint {
  margin: 0;
  font-size: 0.78rem;
  color: var(--text-secondary);
}

.emb-controls {
  display: grid;
  gap: 1rem;
}

.emb-block h3 {
  margin: 0 0 0.5rem;
  font-size: 0.96rem;
  font-family: var(--font-display);
}

.emb-axis-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

.emb-axis span {
  display: block;
  font-size: 0.76rem;
  color: var(--text-secondary);
  margin-bottom: 0.25rem;
}

.emb-select,
.emb-input {
  width: 100%;
  padding: 0.5rem 0.6rem;
  border-radius: 0;
  border: 1px solid var(--card-border);
  background: var(--card-bg);
  color: var(--text-primary);
  box-sizing: border-box;
}

.emb-select:focus,
.emb-input:focus {
  outline: none;
  border-color: var(--accent);
}

/* 「找一个词」补全面板 */
.emb-combo {
  position: relative;
}

.emb-combo-list {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 5;
  margin: 0;
  padding: 0;
  list-style: none;
  background: var(--paper-raised);
  border: 1px solid var(--rule);
  max-height: 15rem;
  overflow-y: auto;
}

.emb-combo-list li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.42rem 0.6rem;
  font-size: 0.86rem;
  cursor: pointer;
  border-bottom: 1px solid var(--rule-soft);
}

.emb-combo-list li:last-child {
  border-bottom: 0;
}

.emb-combo-list li.active {
  background: var(--accent-soft);
}

.emb-combo-word {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.emb-combo-cluster {
  font-size: 0.72rem;
  color: var(--text-secondary);
}

.emb-selected-meta {
  margin: 0 0 0.5rem;
  color: var(--text-secondary);
  font-size: 0.84rem;
}

.emb-play {
  margin-top: 0.55rem;
}

/* 类比例子 chips */
.emb-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.emb-chip {
  border: 1px solid var(--card-border);
  background: var(--card-bg);
  color: var(--text-primary);
  font-size: 0.74rem;
  letter-spacing: 0.04em;
  padding: 0.32em 0.7em;
  cursor: pointer;
  transition:
    border-color var(--dur-1) var(--ease-out-cubic),
    background var(--dur-1) var(--ease-out-cubic),
    color var(--dur-1) var(--ease-out-cubic);
}

.emb-chip:hover:not(.active) {
  border-color: var(--accent);
  color: var(--accent);
}

.emb-chip.active {
  border-color: var(--accent);
  background: var(--accent);
  color: var(--paper);
}

/* 逐拍解说条 */
.emb-narration {
  margin: 0.6rem 0 0;
  padding: 0.5rem 0.7rem;
  border-left: 2px solid var(--accent);
  background: var(--accent-soft);
  color: var(--text-primary);
  font-size: 0.84rem;
  line-height: 1.6;
}

.emb-narration-tag {
  display: inline-block;
  margin-right: 0.5em;
  font-size: 0.68rem;
  letter-spacing: 0.12em;
  color: var(--accent);
  font-weight: 700;
}

.emb-readout {
  margin: 0.55rem 0 0;
  font-size: 0.82rem;
  color: var(--text-primary);
}

.emb-readout b {
  color: var(--accent);
}

.emb-neighbors {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.4rem;
}

.emb-neighbors li {
  display: grid;
  grid-template-columns: 18px 64px 1fr 36px;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.88rem;
}

.emb-n-rank {
  color: var(--accent);
  font-weight: 700;
}

.emb-n-word {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.emb-n-track {
  height: 8px;
  background: var(--accent-soft);
  overflow: hidden;
}

.emb-n-fill {
  display: block;
  height: 100%;
  transition: width var(--dur-2) var(--ease-out-cubic);
}

.emb-n-val {
  color: var(--text-secondary);
  font-size: 0.8rem;
  text-align: right;
}

.emb-tip-text {
  margin: 0.6rem 0 0;
  color: var(--text-secondary);
  font-size: 0.82rem;
}

@media (max-width: 760px) {
  .emb-stage-grid {
    grid-template-columns: 1fr;
  }
}
</style>
