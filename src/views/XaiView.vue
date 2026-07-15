<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import { useHead } from '@unhead/vue'
import { vReveal } from '../directives'
import { useMobileNet } from '../composables/useMobileNet'
import { gsap } from '../plugins/motion'
import { prefersReducedMotion } from '../composables/usePrefersReducedMotion'
import { occlusionSensitivity, heatToImageData, jet } from '../utils/gradcam'
import Splitting from 'splitting'

useHead({ title: 'XAI' })

type Mode = 'heatmap' | 'probe' | 'neuron' | 'occlusion'
const mode = ref<Mode>('heatmap')
const modes: { id: Mode; label: string; hint: string }[] = [
  { id: 'heatmap', label: '激活热力图', hint: '选某层 → 看模型在看哪' },
  { id: 'probe', label: '类别探针', hint: '选 top5 之一 → 反推关注区' },
  { id: 'neuron', label: '神经元探针', hint: '决策关注区 + 神经元档案' },
  { id: 'occlusion', label: '对抗遮挡', hint: '画笔遮挡 → 看概率流动' },
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

// 预设图：picsum 种子化，224² 小尺寸，零本地资源。
const presets = [
  { id: 'cat', label: '猫', src: 'https://picsum.photos/seed/zzcat/224/224' },
  { id: 'face', label: '人脸', src: 'https://picsum.photos/seed/zzface/224/224' },
  { id: 'scene', label: '风景', src: 'https://picsum.photos/seed/zzscene/224/224' },
  { id: 'abstract', label: '抽象', src: 'https://picsum.photos/seed/zzabs/224/224' },
]
const activePreset = ref(presets[0].id)
const uploading = ref(false)

// 推理结果
const topK = ref<{ className: string; probability: number }[]>([])
const targetClass = ref('')
const busy = ref(false)
const busyLabel = ref('')
const heat = ref<Float32Array | null>(null)
const layerIdx = ref(0) // 模拟"层"：0..6 对应不同平滑度，用于层滑块演示
const LAYERS = 7

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
      ctx.drawImage(img, 0, 0, IMG, IMG)
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

// 热力图：用层滑块控制 occlusionSensitivity 的 size/stride，模拟"不同层感受野"
const computeHeatmap = async () => {
  const c = mainCanvas.value
  if (!c || !modelRef.value) return
  busy.value = true
  busyLabel.value = `计算第 ${layerIdx.value + 1} 层激活…`
  // 层 0(底层小感受野) → 6(高层大感受野)
  const size = 16 + layerIdx.value * 8
  const stride = Math.max(8, 24 - layerIdx.value * 2)
  const target = targetClass.value || topK.value[0]?.className || ''
  if (!target) {
    busy.value = false
    busyLabel.value = ''
    return
  }
  // infer 回调：返回全 1000 类，按 className 找目标概率
  const inferAll = async (cv: HTMLCanvasElement) => {
    const all = await infer(cv, 1000)
    const hit = all.find((p) => p.className === target)
    return hit ? [{ className: target, probability: hit.probability }] : [{ className: target, probability: 0 }]
  }
  const h = await occlusionSensitivity(c, inferAll, 0, { size, stride, fill: 'rgba(0,0,0,1)' })
  heat.value = h
  paintOverlay(h)
  busy.value = false
  busyLabel.value = ''
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
  const h = await occlusionSensitivity(c, inferAll, 0, { size: 32, stride: 16, fill: 'rgba(0,0,0,1)' })
  heat.value = h
  paintOverlay(h)
  busy.value = false
  busyLabel.value = ''
}

const paintOverlay = (h: Float32Array) => {
  const oc = overlayCanvas.value
  const c = mainCanvas.value
  if (!oc || !c) return
  oc.width = IMG
  oc.height = IMG
  const ctx = oc.getContext('2d')!
  ctx.clearRect(0, 0, IMG, IMG)
  const data = heatToImageData(h, IMG, IMG, IMG, IMG, 0.55)
  ctx.putImageData(data, 0, 0)
}

watch(layerIdx, () => {
  if (mode.value === 'heatmap') void computeHeatmap()
})

watch(targetClass, () => {
  if (mode.value === 'probe' || mode.value === 'neuron') void computeProbeHeat()
})

const switchMode = async (m: Mode) => {
  mode.value = m
  // 切模式清空 overlay，按需重算
  const oc = overlayCanvas.value
  if (oc) oc.getContext('2d')!.clearRect(0, 0, IMG, IMG)
  heat.value = null
  archiveShown.value = false
  await rerunForMode()
}

// 神经元档案：程序化生成 8 张"神经元最爱图样"小图（Gabor/噪声），无需外部 atlas 资源
const buildArchive = () => {
  const ac = archiveCanvas.value
  if (!ac) return
  const cell = 96
  ac.width = cell * 4
  ac.height = cell * 2
  const ctx = ac.getContext('2d')!
  ctx.fillStyle = '#0a1c33'
  ctx.fillRect(0, 0, ac.width, ac.height)
  const labels = ['Gabor 边缘', '斑点纹理', '径向条纹', '网格', '涡旋', '色块', '高频噪声', '低频梯度']
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

const openArchive = () => {
  archiveShown.value = true
  buildArchive()
}

const onOverlayClick = (_e: MouseEvent) => {
  // 点击热图区域：在神经元探针模式下弹出档案
  if (mode.value === 'neuron') openArchive()
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
      <p class="xai-sub">这里不再告诉你"模型分类成了什么"，而是把它的注意力、它最在意的区域、它的神经元最爱什么图样，摊开给你看。</p>
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
          <!-- 左：画布 -->
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
              <h3>观测层 <span class="xai-layer-tag">L{{ layerIdx + 1 }}/{{ LAYERS }}</span></h3>
              <input type="range" min="0" :max="LAYERS - 1" step="1" v-model.number="layerIdx" class="xai-range" />
              <p class="xai-tip">底层(小感受野)看边缘纹理；高层(大感受野)看物体部件。滑动即时重算。</p>
            </div>

            <!-- 探针 / 神经元模式：目标类选择 -->
            <div v-if="mode === 'probe' || mode === 'neuron'" class="xai-block">
              <h3>目标类别</h3>
              <select v-model="targetClass" class="xai-select">
                <option v-for="p in topK" :key="p.className" :value="p.className">{{ p.className }}</option>
              </select>
              <button v-if="mode === 'neuron'" type="button" class="btn ghost xai-archive-btn" @click="openArchive">
                🧠 查看神经元档案
              </button>
            </div>

            <!-- 对抗遮挡：画笔控件 -->
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
              <h3>实时概率流动</h3>
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

      <!-- 神经元档案弹层 -->
      <Transition name="reader">
        <div v-if="archiveShown" class="xai-archive-mask" @click.self="archiveShown = false">
          <section class="xai-archive glass-card" data-lenis-prevent>
            <header class="xai-archive-head">
              <h2>🧠 神经元档案</h2>
              <button type="button" class="btn-icon xai-archive-close" aria-label="关闭" @click="archiveShown = false">×</button>
            </header>
            <p class="xai-archive-sub">下列为该层若干神经元的"激活最大化"图样（程序化预生成示意）。点击画布上的高响应区，对应区域的像素模式会更接近其中某一张——这就是该神经元"最喜欢"的样子。</p>
            <canvas ref="archiveCanvas" class="xai-archive-canvas"></canvas>
            <div class="xai-archive-grid">
              <span v-for="i in archiveCells" :key="i">N{{ i }} · {{ ['边缘','斑点','条纹','网格','涡旋','色块','高频','低频'][i-1] }}</span>
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
  mix-blend-mode: screen;
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
  backdrop-filter: blur(10px);
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