<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { useHead } from '@unhead/vue'
import { vReveal } from '../directives'
import { useMobileNet } from '../composables/useMobileNet'
import { gsap } from '../plugins/motion'
import { prefersReducedMotion } from '../composables/usePrefersReducedMotion'
import { occlusionSensitivity, heatToImageData, gaussianBlurGrid, normalizeGrid, jet } from '../utils/gradcam'
import Splitting from 'splitting'

useHead({ title: 'XAI' })

type Mode = 'heatmap' | 'probe' | 'neuron' | 'occlusion'
const mode = ref<Mode>('heatmap')
const modes: { id: Mode; label: string; hint: string }[] = [
  { id: 'heatmap', label: '热力图', hint: '越红的地方，模型越盯着看' },
  { id: 'probe', label: '找证据', hint: '挑一个预测，看它靠哪里撑起来' },
  { id: 'neuron', label: '神经元偏好', hint: '关注区，外加它最爱什么画面' },
  { id: 'occlusion', label: '涂掉看看', hint: '用画笔挡住，看概率怎么变' },
]

const { state, progress, errMsg, load, reset } = useMobileNet()
type Pred = { className: string; probability: number }
const modelRef = shallowRef<{ classify: (img: HTMLCanvasElement | HTMLImageElement | ImageData, topk?: number) => Promise<Pred[]> } | null>(null)

// 主画布：当前选中的图（224²，便于 MobileNet 推理）。
const IMG = 224
const mainCanvas = ref<HTMLCanvasElement | null>(null)
const overlayCanvas = ref<HTMLCanvasElement | null>(null)
const archiveCanvas = ref<HTMLCanvasElement | null>(null)
const heroEl = ref<HTMLElement | null>(null)

// 预设图：Wikimedia Commons 直链（发送 CORS 头，保证遮挡热图 getImageData 不被污染），
// 每张都和标签一一对应；零本地资源。
const presets = [
  { id: 'cat', label: '猫', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Cat_November_2010-1a.jpg/250px-Cat_November_2010-1a.jpg' },
  { id: 'face', label: '人脸', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Boy_Face_from_Venezuela.jpg/250px-Boy_Face_from_Venezuela.jpg' },
  { id: 'scene', label: '风景', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Mountains_in_snow%2C_Mountain_lake%2C_Chola_Valley%2C_Nepal%2C_Himalayas.jpg/250px-Mountains_in_snow%2C_Mountain_lake%2C_Chola_Valley%2C_Nepal%2C_Himalayas.jpg' },
  { id: 'abstract', label: '抽象', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Kandinsky_-_Jaune_Rouge_Bleu.jpg/250px-Kandinsky_-_Jaune_Rouge_Bleu.jpg' },
]
const activePreset = ref(presets[0].id)
const uploading = ref(false)

// 推理结果
const topK = ref<{ className: string; probability: number }[]>([])
const targetClass = ref('')
const busy = ref(false)
const busyLabel = ref('')
// 粗网格分辨率：8×8=64 次推理，与 MobileNet 末层 7×7 感受野相当，恒定且轻量。
const GRID = 8
// 热力图模式的基线热图（一次推理得到），层滑块只对其做高斯模糊重绘，无需重算。
const baseHeat = ref<Float32Array | null>(null)
const layerIdx = ref(0) // 模拟"层"：0..6 对应高斯模糊强度，越大感受野越弥散
const LAYERS = 7
// 每层对应的模糊 sigma：层 0 锐利局部 -> 层 6 弥散平滑
const SIGMA_PER_LAYER = 0.6

// 神经元档案
const archiveShown = ref(false)
const archiveCells = 8

// 对抗遮挡
const brushSize = ref(28)
const brushFill = ref<'black' | 'gray' | 'blur'>('black')
const drawing = ref(false)
const probHistory = ref<{ className: string; probability: number }[]>([])

const isModelReady = computed(() => state.value === 'ready')

const runHeroIntro = () => {
  if (prefersReducedMotion() || !heroEl.value) return
  const h1 = heroEl.value.querySelector<HTMLElement>('h1')
  if (h1) Splitting({ target: h1, by: 'chars' })
  const chars = h1 ? Array.from(h1.querySelectorAll<HTMLElement>('.char')) : []
  const sub = heroEl.value.querySelector<HTMLElement>('.xai-sub')
  const cta = heroEl.value.querySelector<HTMLElement>('.xai-cta')
  gsap.set(chars, { opacity: 0, y: 24 })
  if (sub) gsap.set(sub, { opacity: 0, y: 16 })
  if (cta) gsap.set(cta, { opacity: 0, y: 16 })
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
  if (chars.length) tl.to(chars, { opacity: 1, y: 0, duration: 0.5, stagger: 0.05 })
  if (sub) tl.to(sub, { opacity: 1, y: 0, duration: 0.5 }, '-=0.3')
  if (cta) tl.to(cta, { opacity: 1, y: 0, duration: 0.5 }, '-=0.3')
}

onMounted(async () => {
  runHeroIntro()
  // 自动开始加载模型（用户进入即拉，骨架承接）
  const m = await load()
  modelRef.value = m
  await drawPreset(presets[0].src)
})

const drawPreset = (src: string) =>
  new Promise<void>((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const c = mainCanvas.value
      if (!c) return resolve()
      c.width = IMG
      c.height = IMG
      const ctx = c.getContext('2d')!
      // 居中裁切到正方形再缩放，避免非方形图被拉伸变形
      const s = Math.min(img.width, img.height)
      const sx = (img.width - s) / 2
      const sy = (img.height - s) / 2
      ctx.drawImage(img, sx, sy, s, s, 0, 0, IMG, IMG)
      resolve()
    }
    img.onerror = () => resolve()
    img.src = src
  })

const selectPreset = async (id: string) => {
  activePreset.value = id
  const p = presets.find((x) => x.id === id)
  if (!p) return
  busy.value = true
  busyLabel.value = '载入图片…'
  await drawPreset(p.src)
  await refreshInfer()
  busy.value = false
  busyLabel.value = ''
}

const onUpload = (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  uploading.value = true
  const reader = new FileReader()
  reader.onload = async () => {
    const img = new Image()
    img.onload = async () => {
      const c = mainCanvas.value
      if (!c) return
      c.width = IMG
      c.height = IMG
      const ctx = c.getContext('2d')!
      // 居中裁切到正方形
      const s = Math.min(img.width, img.height)
      const sx = (img.width - s) / 2
      const sy = (img.height - s) / 2
      ctx.drawImage(img, sx, sy, s, s, 0, 0, IMG, IMG)
      activePreset.value = 'upload'
      uploading.value = false
      busy.value = true
      busyLabel.value = '推理中…'
      await refreshInfer()
      busy.value = false
      busyLabel.value = ''
    }
    img.src = reader.result as string
  }
  reader.readAsDataURL(file)
}

const infer = async (canvas: HTMLCanvasElement, topk = 5): Promise<Pred[]> => {
  if (!modelRef.value) return []
  return modelRef.value.classify(canvas, topk)
}

const refreshInfer = async () => {
  const c = mainCanvas.value
  if (!c || !modelRef.value) return
  const preds = await infer(c, 5)
  topK.value = preds.map((p) => ({ className: p.className, probability: +p.probability.toFixed(4) }))
  if (!targetClass.value && topK.value[0]) targetClass.value = topK.value[0].className
  // 进入新模式后按需重算
  await rerunForMode()
}

// 不同模式的热图计算
const rerunForMode = async () => {
  const c = mainCanvas.value
  if (!c || !modelRef.value) return
  if (mode.value === 'heatmap') {
    await computeHeatmap()
  } else if (mode.value === 'probe' || mode.value === 'neuron') {
    await computeProbeHeat()
  } else if (mode.value === 'occlusion') {
    // 对抗遮挡不预算热图，只刷新 top5
    probHistory.value = (await infer(c, 5)).map((p) => ({ className: p.className, probability: +p.probability.toFixed(4) }))
  }
}

// 热力图：一次性粗网格遮挡敏感度，层滑块只做高斯模糊后处理（模拟"不同层感受野"）
const computeHeatmap = async () => {
  const c = mainCanvas.value
  if (!c || !modelRef.value) return
  const target = targetClass.value || topK.value[0]?.className || ''
  if (!target) return
  busy.value = true
  busyLabel.value = '计算激活敏感度…'
  // infer 回调：返回全 1000 类，按 className 找目标概率
  const inferAll = async (cv: HTMLCanvasElement) => {
    const all = await infer(cv, 1000)
    const hit = all.find((p) => p.className === target)
    return hit ? [{ className: target, probability: hit.probability }] : [{ className: target, probability: 0 }]
  }
  const h = await occlusionSensitivity(c, inferAll, 0, { grid: GRID, fill: 'rgba(0,0,0,1)' })
  baseHeat.value = h
  paintHeatForLayer()
  busy.value = false
  busyLabel.value = ''
}

// 按当前层对基线热图做高斯模糊并重绘（纯后处理，无推理，可即时响应滑块）
const paintHeatForLayer = () => {
  if (!baseHeat.value) return
  const blurred = gaussianBlurGrid(baseHeat.value, GRID, layerIdx.value * SIGMA_PER_LAYER)
  paintOverlay(normalizeGrid(blurred))
}

// 类别探针 / 神经元探针：固定目标类，算遮挡敏感度
const computeProbeHeat = async () => {
  const c = mainCanvas.value
  if (!c || !modelRef.value) return
  const target = targetClass.value || topK.value[0]?.className || ''
  if (!target) return
  busy.value = true
  busyLabel.value = `定位 ${target} 的关注区…`
  const inferAll = async (cv: HTMLCanvasElement) => {
    const all = await infer(cv, 1000)
    const hit = all.find((p) => p.className === target)
    return hit ? [{ className: target, probability: hit.probability }] : [{ className: target, probability: 0 }]
  }
  const h = await occlusionSensitivity(c, inferAll, 0, { grid: GRID, fill: 'rgba(0,0,0,1)' })
  paintOverlay(h)
  busy.value = false
  busyLabel.value = ''
}

const paintOverlay = (h: Float32Array) => {
  const oc = overlayCanvas.value
  if (!oc) return
  oc.width = IMG
  oc.height = IMG
  const ctx = oc.getContext('2d')!
  ctx.clearRect(0, 0, IMG, IMG)
  const data = heatToImageData(h, GRID, IMG, IMG, 0.72)
  ctx.putImageData(data, 0, 0)
}

// 层滑块：仅高斯模糊重绘基线热图，无推理 -> 即时响应，无需防抖。
// 目标类下拉仍触发完整遮挡重算，保留防抖避免连点卡顿。
let targetDebounce = 0

watch(layerIdx, () => {
  if (mode.value !== 'heatmap') return
  paintHeatForLayer()
})

watch(targetClass, () => {
  if (mode.value !== 'probe' && mode.value !== 'neuron') return
  window.clearTimeout(targetDebounce)
  targetDebounce = window.setTimeout(() => void computeProbeHeat(), 250)
})

onBeforeUnmount(() => {
  window.clearTimeout(targetDebounce)
})

const switchMode = async (m: Mode) => {
  mode.value = m
  // 切模式清空 overlay，按需重算
  const oc = overlayCanvas.value
  if (oc) oc.getContext('2d')!.clearRect(0, 0, IMG, IMG)
  baseHeat.value = null
  archiveShown.value = false
  await rerunForMode()
}

// 神经元偏好：程序化生成 8 张"神经元偏爱画面"小图（边缘/纹理/噪声等），无需外部 atlas 资源
const buildArchive = () => {
  const ac = archiveCanvas.value
  if (!ac) return
  const cell = 96
  ac.width = cell * 4
  ac.height = cell * 2
  const ctx = ac.getContext('2d')!
  ctx.fillStyle = '#0a1c33'
  ctx.fillRect(0, 0, ac.width, ac.height)
  const labels = ['斜向边缘', '斑点纹理', '放射条纹', '网格', '涡旋', '色块', '细密噪点', '柔和渐变']
  for (let i = 0; i < archiveCells; i++) {
    const cx = (i % 4) * cell
    const cy = Math.floor(i / 4) * cell
    const img = ctx.createImageData(cell, cell)
    const angle = (i / archiveCells) * Math.PI
    const freq = 0.1 + i * 0.06
    for (let y = 0; y < cell; y++) {
      for (let x = 0; x < cell; x++) {
        let v = 0
        const u = x * Math.cos(angle) + y * Math.sin(angle)
        if (i === 1) v = Math.sin(x * 0.3) * Math.cos(y * 0.3)
        else if (i === 5) v = (x + y) / (cell * 2)
        else if (i === 6) v = Math.random()
        else if (i === 7) v = (x + y) / (cell * 2)
        else v = Math.sin(u * freq * Math.PI * 2)
        const t = (v + 1) / 2
        const [r, g, b] = jet(t)
        const idx = (y * cell + x) * 4
        img.data[idx] = r
        img.data[idx + 1] = g
        img.data[idx + 2] = b
        img.data[idx + 3] = 255
      }
    }
    ctx.putImageData(img, cx, cy)
    // 标签
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    ctx.font = '10px Inter, sans-serif'
    ctx.fillText(labels[i] ?? `N${i}`, cx + 4, cy + 12)
  }
}

const openArchive = async () => {
  archiveShown.value = true
  // canvas 在 v-if 内，需等下一帧挂载后才能拿到 ref 作画
  await nextTick()
  buildArchive()
}

const onOverlayClick = (_e: MouseEvent) => {
  // 点击热图区域：在神经元偏好模式下弹出档案
  if (mode.value === 'neuron') void openArchive()
}

// ===== 对抗遮挡交互 =====
const getBrushStyle = () => {
  if (brushFill.value === 'black') return 'rgba(0,0,0,1)'
  if (brushFill.value === 'gray') return 'rgba(128,128,128,1)'
  return 'rgba(0,0,0,0)' // blur 用滤镜近似
}

const lastPos = { x: 0, y: 0 }
const drawBrush = (e: MouseEvent) => {
  if (!drawing.value || mode.value !== 'occlusion') return
  const c = mainCanvas.value
  if (!c) return
  const rect = c.getBoundingClientRect()
  const x = ((e.clientX - rect.left) / rect.width) * IMG
  const y = ((e.clientY - rect.top) / rect.height) * IMG
  const ctx = c.getContext('2d')!
  if (brushFill.value === 'blur') {
    // 模糊笔：取小块→blur 后贴回
    const sx = Math.max(0, Math.floor(x - brushSize.value / 2))
    const sy = Math.max(0, Math.floor(y - brushSize.value / 2))
    ctx.filter = 'blur(6px)'
    ctx.drawImage(c, sx, sy, brushSize.value, brushSize.value, sx, sy, brushSize.value, brushSize.value)
    ctx.filter = 'none'
  } else {
    ctx.fillStyle = getBrushStyle()
    ctx.beginPath()
    ctx.arc(x, y, brushSize.value / 2, 0, Math.PI * 2)
    // 连续插值，避免快速移动断点
    ctx.moveTo(lastPos.x, lastPos.y)
    ctx.lineTo(x, y)
    ctx.lineWidth = brushSize.value
    ctx.strokeStyle = getBrushStyle()
    ctx.stroke()
    ctx.fill()
  }
  lastPos.x = x
  lastPos.y = y
}

const onCanvasDown = (e: MouseEvent) => {
  if (mode.value !== 'occlusion') return
  drawing.value = true
  const rect = mainCanvas.value!.getBoundingClientRect()
  lastPos.x = ((e.clientX - rect.left) / rect.width) * IMG
  lastPos.y = ((e.clientY - rect.top) / rect.height) * IMG
  drawBrush(e)
}

const onCanvasUp = async () => {
  if (!drawing.value) return
  drawing.value = false
  if (mode.value === 'occlusion') {
    probHistory.value = (await infer(mainCanvas.value!, 5)).map((p) => ({ className: p.className, probability: +p.probability.toFixed(4) }))
  }
}

const clearOcclusion = async () => {
  const p = presets.find((x) => x.id === activePreset.value)
  if (p) await drawPreset(p.src)
  probHistory.value = (await infer(mainCanvas.value!, 5)).map((x) => ({ className: x.className, probability: +x.probability.toFixed(4) }))
}

const retryModel = async () => {
  reset()
  const m = await load()
  modelRef.value = m
  if (m) await refreshInfer()
}

// 概率柱最大值用于归一
const maxProb = computed(() => Math.max(...probHistory.value.map((p) => p.probability), 0.0001))
</script>

<template>
  <section class="page xai-view">
    <!-- 叙事首屏 -->
    <article ref="heroEl" v-reveal class="glass-card xai-hero">
      <h1>停下来，看看一个神经网络正在看什么</h1>
      <p class="xai-sub">这里不只告诉你模型认成了什么，还把它的注意力、最在意的地方、神经元偏爱的画面，一并摊开给你看。</p>
      <div class="xai-cta">
        <span class="xai-cta-note">选一张图开始 ↓</span>
      </div>
    </article>

    <!-- 模型加载骨架 / 进度 -->
    <article v-if="!isModelReady" class="glass-card xai-loader">
      <div class="xai-loader-head">
        <h2>正在准备 MobileNet</h2>
        <p v-if="state === 'loading'">拉取预训练权重（约 5MB），仅本次首次访问需要等待…</p>
        <p v-else-if="state === 'error'" class="xai-err">加载失败：{{ errMsg }} <button class="btn ghost" type="button" @click="retryModel">重试</button></p>
        <p v-else>准备就绪…</p>
      </div>
      <div class="xai-progress">
        <div class="xai-progress-bar" :style="{ width: progress + '%' }"></div>
      </div>
    </article>

    <template v-if="isModelReady">
      <!-- 图片选择 -->
      <article v-reveal class="glass-card xai-source">
        <h2>① 选一张图</h2>
        <div class="xai-preset-row">
          <button
            v-for="p in presets"
            :key="p.id"
            type="button"
            :class="['xai-preset', { active: activePreset === p.id }]"
            @click="selectPreset(p.id)"
          >
            <img :src="p.src" :alt="p.label" loading="lazy" />
            <span>{{ p.label }}</span>
          </button>
          <label class="xai-upload" :class="{ active: activePreset === 'upload' }">
            <input type="file" accept="image/*" @change="onUpload" />
            <span>{{ uploading ? '读取中…' : '📤 上传' }}</span>
          </label>
        </div>
      </article>

      <!-- 模式 tabs -->
      <article v-reveal class="glass-card xai-modes">
        <h2>② 选一种观测模式</h2>
        <div class="xai-mode-row">
          <button
            v-for="m in modes"
            :key="m.id"
            type="button"
            :class="['xai-mode', { active: mode === m.id }]"
            @click="switchMode(m.id)"
          >
            <span class="xai-mode-label">{{ m.label }}</span>
            <span class="xai-mode-hint">{{ m.hint }}</span>
          </button>
        </div>
      </article>

      <!-- 工作区 -->
      <article v-reveal class="glass-card xai-stage">
        <div class="xai-stage-grid">
          <!-- 左：画布 + 图例 -->
          <div class="xai-stage-left">
            <div class="xai-canvas-wrap" :class="{ drawing: mode === 'occlusion' }">
              <canvas ref="mainCanvas" class="xai-canvas" :class="{ occlusion: mode === 'occlusion' }"
                @mousedown="onCanvasDown" @mousemove="drawBrush" @mouseup="onCanvasUp" @mouseleave="onCanvasUp"
                @click="onOverlayClick"
              ></canvas>
              <canvas ref="overlayCanvas" class="xai-overlay" :class="{ hidden: mode === 'occlusion' }"></canvas>
              <div v-if="busy" class="xai-busy">
                <span class="xai-spinner"></span>
                <span>{{ busyLabel }}</span>
              </div>
            </div>
            <div v-if="mode !== 'occlusion'" class="xai-legend">
              <span class="xai-legend-label">关注低</span>
              <span class="xai-legend-bar" aria-hidden="true"></span>
              <span class="xai-legend-label">关注高</span>
            </div>
          </div>

          <!-- 右：控件 -->
          <div class="xai-controls">
            <!-- top5 -->
            <div class="xai-block">
              <h3>模型预测 · Top 5</h3>
              <ul class="xai-topk">
                <li v-for="(p, i) in topK" :key="p.className" :class="{ active: p.className === targetClass }">
                  <span class="xai-rank">{{ i + 1 }}</span>
                  <span class="xai-name">{{ p.className }}</span>
                  <span class="xai-prob">{{ (p.probability * 100).toFixed(1) }}%</span>
                </li>
              </ul>
            </div>

            <!-- 热力图模式：层滑块 -->
            <div v-if="mode === 'heatmap'" class="xai-block">
              <h3>层级 <span class="xai-layer-tag">L{{ layerIdx + 1 }}/{{ LAYERS }}</span></h3>
              <input type="range" min="0" :max="LAYERS - 1" step="1" v-model.number="layerIdx" class="xai-range" />
              <p class="xai-tip">拖动看不同层级：底层抓细节边缘，高层看整体部件，滑动即时重绘。</p>
            </div>

            <!-- 找证据 / 神经元偏好模式：选一个预测结果 -->
            <div v-if="mode === 'probe' || mode === 'neuron'" class="xai-block">
              <h3>想看哪个结果</h3>
              <select v-model="targetClass" class="xai-select">
                <option v-for="p in topK" :key="p.className" :value="p.className">{{ p.className }}</option>
              </select>
              <button v-if="mode === 'neuron'" type="button" class="btn ghost xai-archive-btn" @click="openArchive">
                🧠 看它偏爱什么画面
              </button>
            </div>

            <!-- 涂掉看看：画笔控件 -->
            <div v-if="mode === 'occlusion'" class="xai-block">
              <h3>画笔</h3>
              <label class="xai-field">
                <span>大小 {{ brushSize }}px</span>
                <input type="range" min="8" max="80" step="2" v-model.number="brushSize" class="xai-range" />
              </label>
              <div class="xai-brush-row">
                <button :class="['xai-brush', { active: brushFill === 'black' }]" @click="brushFill = 'black'">⬛ 黑</button>
                <button :class="['xai-brush', { active: brushFill === 'gray' }]" @click="brushFill = 'gray'">🔲 灰</button>
                <button :class="['xai-brush', { active: brushFill === 'blur' }]" @click="brushFill = 'blur'">🌫️ 模糊</button>
              </div>
              <button type="button" class="btn ghost" @click="clearOcclusion">↺ 清除</button>
              <h3>实时概率</h3>
              <div class="xai-probbars">
                <div v-for="p in probHistory" :key="p.className" class="xai-probbar">
                  <span class="xai-probbar-name">{{ p.className }}</span>
                  <span class="xai-probbar-track">
                    <span class="xai-probbar-fill" :style="{ width: (p.probability / maxProb * 100) + '%' }"></span>
                  </span>
                  <span class="xai-probbar-val">{{ (p.probability * 100).toFixed(1) }}%</span>
                </div>
              </div>
              <p class="xai-tip">在图上按住拖拽涂抹，松手看 top5 概率如何变化。</p>
            </div>
          </div>
        </div>
      </article>

      <!-- 神经元偏好弹层 -->
      <Transition name="reader">
        <div v-if="archiveShown" class="xai-archive-mask" @click.self="archiveShown = false">
          <section class="xai-archive glass-card glass-card--blur" data-lenis-prevent>
            <header class="xai-archive-head">
              <h2>🧠 神经元偏爱什么</h2>
              <button type="button" class="btn-icon xai-archive-close" aria-label="关闭" @click="archiveShown = false">×</button>
            </header>
            <p class="xai-archive-sub">下面是该层几个神经元“最喜欢”的画面（程序生成的示意）。点画布上发亮的地方：那里越像哪一张，就说明那个神经元越偏爱它。</p>
            <canvas ref="archiveCanvas" class="xai-archive-canvas"></canvas>
            <div class="xai-archive-grid">
              <span v-for="i in archiveCells" :key="i">N{{ i }} · {{ ['边缘','斑点','条纹','网格','涡旋','色块','细密噪点','柔和渐变'][i-1] }}</span>
            </div>
          </section>
        </div>
      </Transition>

      <article v-reveal class="glass-card xai-foot">
        <p>所有可视化均为浏览器内实时计算，数据为示意；模型为 MobileNet v2，权重约 5MB，仅进入本页时加载。</p>
      </article>
    </template>
  </section>
</template>

<style scoped>
.xai-view {
  display: grid;
  gap: 1rem;
}

.xai-hero {
  padding: 1.6rem 1.4rem;
}

.xai-hero h1 {
  margin: 0 0 0.6rem;
  font-size: clamp(1.4rem, 2.4vw, 2rem);
  font-family: var(--font-display);
  line-height: 1.25;
}

.xai-sub {
  margin: 0 0 0.8rem;
  color: var(--text-secondary);
  max-width: 60ch;
}

.xai-cta-note {
  color: var(--accent);
  font-weight: 600;
  font-size: 0.92rem;
}

/* 加载骨架 */
.xai-loader {
  padding: 1.2rem;
}

.xai-loader-head h2 {
  margin: 0 0 0.3rem;
  font-size: 1.1rem;
}

.xai-loader-head p {
  margin: 0 0 0.8rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.xai-err {
  color: #d64545;
}

.xai-progress {
  height: 6px;
  border-radius: 6px;
  background: rgba(47, 109, 186, 0.14);
  overflow: hidden;
}

.xai-progress-bar {
  height: 100%;
  background: linear-gradient(to right, var(--accent), var(--accent-strong));
  transition: width 0.25s ease;
}

/* 图片选择 */
.xai-source {
  padding: 1.1rem 1.2rem;
}

.xai-source h2,
.xai-modes h2 {
  margin: 0 0 0.8rem;
  font-size: 1.05rem;
}

.xai-preset-row {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.xai-preset,
.xai-upload {
  position: relative;
  width: 88px;
  height: 88px;
  border-radius: 14px;
  overflow: hidden;
  border: 2px solid transparent;
  background: var(--card-bg);
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: border-color var(--dur-1) var(--ease-out-cubic), transform var(--dur-1) var(--ease-out-cubic);
}

.xai-preset img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.xai-preset span,
.xai-upload span {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 0.2rem;
  background: rgba(10, 28, 51, 0.62);
  color: #fff;
  font-size: 0.72rem;
  text-align: center;
}

.xai-preset:hover:not(.active),
.xai-upload:hover:not(.active) {
  border-color: var(--accent);
  transform: translateY(-2px);
  box-shadow: 0 10px 22px rgba(30, 64, 124, 0.16);
}

.xai-preset.active,
.xai-upload.active {
  border-color: var(--accent);
  transform: translateY(-2px);
}

.xai-upload input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

/* 模式 tabs */
.xai-mode-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.6rem;
}

.xai-mode {
  border: 1px solid var(--card-border);
  border-radius: 12px;
  padding: 0.7rem 0.9rem;
  background: var(--card-bg);
  cursor: pointer;
  text-align: left;
  color: var(--text-primary);
  transition: border-color var(--dur-1) var(--ease-out-cubic), background var(--dur-1) var(--ease-out-cubic);
}

.xai-mode.active {
  border-color: var(--accent);
  background: rgba(47, 109, 186, 0.1);
}

.xai-mode:hover:not(.active) {
  border-color: var(--accent);
  transform: translateY(-2px);
  box-shadow: 0 10px 22px rgba(30, 64, 124, 0.16);
}

.xai-mode-label {
  display: block;
  font-weight: 700;
  font-size: 0.96rem;
}

.xai-mode-hint {
  display: block;
  color: var(--text-secondary);
  font-size: 0.82rem;
  margin-top: 0.15rem;
}

/* 工作区 */
.xai-stage {
  padding: 1.1rem;
}

.xai-stage-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  align-items: start;
}

.xai-stage-left {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.xai-canvas-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 14px;
  overflow: hidden;
  background: #0a1c33;
}

.xai-canvas-wrap.drawing .xai-canvas {
  cursor: crosshair;
}

.xai-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  object-fit: contain;
}

.xai-overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

/* 色阶图例：与 spectral colormap 同色带 */
.xai-legend {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  font-size: 0.78rem;
  color: var(--text-secondary);
}

.xai-legend-label {
  flex-shrink: 0;
}

.xai-legend-bar {
  flex: 1;
  height: 8px;
  border-radius: 8px;
  background: linear-gradient(
    to right,
    rgb(49, 54, 149),
    rgb(50, 136, 189),
    rgb(102, 194, 165),
    rgb(244, 161, 76),
    rgb(214, 47, 39)
  );
}

.xai-overlay.hidden {
  display: none;
}

.xai-busy {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  gap: 0.5rem;
  background: rgba(10, 28, 51, 0.5);
  color: #fff;
  font-size: 0.88rem;
}

.xai-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: xai-spin 0.9s linear infinite;
}

@keyframes xai-spin {
  to { transform: rotate(360deg); }
}

/* 右控件 */
.xai-controls {
  display: grid;
  gap: 1rem;
}

.xai-block h3 {
  margin: 0 0 0.5rem;
  font-size: 0.96rem;
  font-family: var(--font-display);
}

.xai-layer-tag {
  color: var(--accent);
  font-size: 0.82rem;
  margin-left: 0.4rem;
}

.xai-topk {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.4rem;
}

.xai-topk li {
  display: grid;
  grid-template-columns: 22px 1fr auto;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.6rem;
  border-radius: 10px;
  border: 1px solid var(--card-border);
  background: var(--card-bg);
  font-size: 0.88rem;
}

.xai-topk li.active {
  border-color: var(--accent);
  background: rgba(47, 109, 186, 0.1);
}

.xai-rank {
  color: var(--accent);
  font-weight: 700;
}

.xai-name {
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.xai-prob {
  color: var(--text-secondary);
  font-family: var(--font-mono);
  font-size: 0.84rem;
}

.xai-range {
  width: 100%;
  accent-color: var(--accent);
}

.xai-tip {
  margin: 0.5rem 0 0;
  color: var(--text-secondary);
  font-size: 0.82rem;
}

.xai-select {
  width: 100%;
  padding: 0.5rem 0.6rem;
  border-radius: 10px;
  border: 1px solid var(--card-border);
  background: var(--card-bg);
  color: var(--text-primary);
}

.xai-archive-btn {
  margin-top: 0.6rem;
  width: 100%;
}

.xai-field {
  display: block;
  margin-bottom: 0.5rem;
}

.xai-field span {
  display: block;
  font-size: 0.84rem;
  color: var(--text-secondary);
  margin-bottom: 0.3rem;
}

.xai-brush-row {
  display: flex;
  gap: 0.4rem;
  margin: 0.4rem 0 0.6rem;
}

.xai-brush {
  border: 1px solid var(--card-border);
  border-radius: 8px;
  background: var(--card-bg);
  padding: 0.35rem 0.6rem;
  cursor: pointer;
  color: var(--text-primary);
  font-size: 0.86rem;
  transition:
    transform var(--dur-1) var(--ease-out-cubic),
    border-color var(--dur-1) var(--ease-out-cubic),
    background var(--dur-1) var(--ease-out-cubic);
}

.xai-brush:hover:not(.active) {
  transform: translateY(-1px);
  border-color: var(--accent);
  background: rgba(47, 109, 186, 0.1);
}

.xai-brush.active {
  border-color: var(--accent);
  background: rgba(47, 109, 186, 0.12);
}

.xai-probbars {
  display: grid;
  gap: 0.35rem;
}

.xai-probbar {
  display: grid;
  grid-template-columns: 90px 1fr 44px;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.82rem;
}

.xai-probbar-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.xai-probbar-track {
  height: 8px;
  border-radius: 8px;
  background: rgba(47, 109, 186, 0.14);
  overflow: hidden;
}

.xai-probbar-fill {
  display: block;
  height: 100%;
  background: linear-gradient(to right, var(--accent), var(--accent-strong));
  transition: width 0.3s ease;
}

.xai-probbar-val {
  font-family: var(--font-mono);
  color: var(--text-secondary);
  text-align: right;
}

/* 神经元档案弹层 */
.xai-archive-mask {
  position: fixed;
  inset: 0;
  z-index: 40;
  background: rgba(8, 16, 32, 0.55);
  backdrop-filter: blur(6px);
  display: grid;
  place-items: center;
  padding: 1.5rem;
}

.xai-archive {
  width: min(640px, 96vw);
  padding: 1.2rem 1.4rem;
  border-radius: 18px;
}

.xai-archive-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.xai-archive-head h2 {
  margin: 0;
  font-size: 1.1rem;
  font-family: var(--font-display);
}

.xai-archive-close {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1px solid var(--card-border);
  background: var(--card-bg);
  color: var(--text-primary);
  font-size: 1.3rem;
  line-height: 1;
  cursor: pointer;
  transition:
    transform var(--dur-1) var(--ease-out-cubic),
    background var(--dur-1) var(--ease-out-cubic),
    box-shadow var(--dur-1) var(--ease-out-cubic);
}

.xai-archive-close:hover {
  transform: translateY(-2px) scale(1.06);
  background: rgba(47, 109, 186, 0.14);
  box-shadow: 0 10px 22px rgba(30, 64, 124, 0.18);
}

.xai-archive-sub {
  margin: 0 0 0.8rem;
  color: var(--text-secondary);
  font-size: 0.86rem;
}

.xai-archive-canvas {
  width: 100%;
  height: auto;
  border-radius: 10px;
  background: #0a1c33;
}

.xai-archive-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.3rem;
  margin-top: 0.6rem;
  font-size: 0.78rem;
  color: var(--text-secondary);
  font-family: var(--font-mono);
}

/* footer */
.xai-foot {
  padding: 1rem 1.2rem;
  color: var(--text-secondary);
  font-size: 0.86rem;
}

.xai-foot p {
  margin: 0;
}

/* XaiView 大卡片：轻量悬停（上浮+边框高亮+加深阴影），不叠加 3D 倾斜 */
.xai-hero,
.xai-source,
.xai-modes,
.xai-stage,
.xai-foot,
.xai-loader {
  transition:
    transform var(--dur-1) var(--ease-out-cubic),
    box-shadow var(--dur-1) var(--ease-out-cubic),
    border-color var(--dur-1) var(--ease-out-cubic);
}

.xai-hero:hover,
.xai-source:hover,
.xai-modes:hover,
.xai-stage:hover,
.xai-foot:hover,
.xai-loader:hover {
  transform: translateY(-3px);
  border-color: var(--accent);
  box-shadow: var(--shadow-hover);
}

@media (max-width: 820px) {
  .xai-stage-grid {
    grid-template-columns: 1fr;
  }
  .xai-mode-row {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .xai-spinner { animation: none; }
}
</style>