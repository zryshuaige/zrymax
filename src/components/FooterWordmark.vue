<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { prefersReducedMotion } from '../composables/usePrefersReducedMotion'

/**
 * 页脚巨字「ASTER」：主题色主版 + 墨色副版双色套印。
 * - 主版：主题色字母（日间苔绿 accent-strong / 夜间极光绿 accent），Fraunces 900 限宽居中排布；
 * - 副版：墨色层垫在主版下，终态保留 1.5px 错位，作印刷肌理；
 * - 落版（进入视口/悬停）：副版先以错位态淡入 → 主版字母逐字升起 → 副版滑向套准位；
 * - 重印（切换日/夜主题）：副版跳到反向错位再归位，字母自左向右快速闪印一遍。
 * 全部为一次性动效，无常驻循环。减少动效偏好：静态终态。
 */
const LETTERS = ['A', 'S', 'T', 'E', 'R']
const TICKS = 61 // 下划线刻度数（每 5 格一根长刻度）
const BASE = 100 // 测量基准字号

const wrapEl = ref<HTMLElement | null>(null)
const stackEl = ref<HTMLElement | null>(null)
const textEl = ref<HTMLElement | null>(null)
const fontSize = ref(0)
const slotWidths = ref<number[]>([]) // 各字母槽宽（BASE 字号下量出，随 fontSize 等比缩放）
const fitted = ref(false)
const on = ref(false)
const reducedMotion = prefersReducedMotion()

let io: IntersectionObserver | null = null
let ro: ResizeObserver | null = null
let themeOb: MutationObserver | null = null
let reprintTimer: ReturnType<typeof setTimeout> | null = null

const textStyle = computed(() => (fontSize.value ? { fontSize: fontSize.value + 'px' } : undefined))
const slotStyle = (i: number) =>
  slotWidths.value.length ? { width: (slotWidths.value[i] * fontSize.value) / BASE + 'px' } : undefined

const fit = () => {
  const wrap = wrapEl.value
  const stack = stackEl.value
  const text = textEl.value
  if (!wrap || !stack || !text || stack.clientWidth === 0) return
  const prevSize = text.style.fontSize
  // measuring：切回 flex-start、固定 900 字重、停掉动画，量出字形自然总宽
  wrap.classList.add('measuring')
  text.style.fontSize = `${BASE}px`
  const slots = Array.from(text.querySelectorAll<HTMLElement>('.wl-mask'))
  // 清掉上一次 fit 写入的内联槽宽，否则会按旧宽度量出新槽宽，反复 fit 越缩越小
  for (const s of slots) s.style.width = ''
  const widths = slots.map((s) => s.getBoundingClientRect().width)
  const totalW = text.getBoundingClientRect().width
  text.style.fontSize = prevSize
  wrap.classList.remove('measuring')
  if (totalW <= 0 || widths.some((w) => w <= 0)) return
  fontSize.value = (BASE * stack.clientWidth) / totalW
  slotWidths.value = widths
  fitted.value = true
}

const replay = () => {
  if (!on.value) return
  on.value = false
  requestAnimationFrame(() => requestAnimationFrame(() => (on.value = true)))
}

onMounted(() => {
  // 等可变字体就绪再测量，避免按回退字体算出的槽宽失真
  if (document.fonts?.ready) document.fonts.ready.then(fit)
  else fit()
  const wrap = wrapEl.value
  if (!wrap) return
  ro = new ResizeObserver(fit)
  ro.observe(wrap)
  if (reducedMotion) {
    on.value = true
    return
  }
  io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        on.value = false
        if (entry.isIntersecting) {
          // 进入视口：先摘再挂，从头重播落版动画
          requestAnimationFrame(() => requestAnimationFrame(() => (on.value = true)))
        }
      }
    },
    { threshold: 0.1 },
  )
  io.observe(wrap)
  // 主题切换 → 重印动画（颜色本身由 CSS 变量随主题切换）
  themeOb = new MutationObserver(() => {
    if (!on.value) return
    wrap.classList.remove('reprint')
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        wrap.classList.add('reprint')
        if (reprintTimer) clearTimeout(reprintTimer)
        reprintTimer = setTimeout(() => wrap.classList.remove('reprint'), 800)
      }),
    )
  })
  themeOb.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
})

onBeforeUnmount(() => {
  io?.disconnect()
  ro?.disconnect()
  themeOb?.disconnect()
  if (reprintTimer) clearTimeout(reprintTimer)
})
</script>

<template>
  <div ref="wrapEl" class="wm-wrap" :class="{ on, fitted }" @mouseenter="replay">
    <div ref="stackEl" class="wm-stack">
      <!-- 副版：墨色错位层 -->
      <div class="wm-plate" :style="textStyle" aria-hidden="true">
        <span v-for="(ch, i) in LETTERS" :key="'p' + i" class="pl" :style="slotStyle(i)">{{ ch }}</span>
      </div>
      <!-- 主版：主题色字母 -->
      <div ref="textEl" class="wm-text" :style="textStyle" role="img" aria-label="ASTER">
        <span
          v-for="(ch, i) in LETTERS"
          :key="i"
          class="wl-mask"
          :style="slotStyle(i)"
          aria-hidden="true"
          ><span class="wl" :style="{ '--i': i }">{{ ch }}</span></span>
      </div>
    </div>
    <div class="wm-rule" aria-hidden="true">
      <i v-for="t in TICKS" :key="t" :class="{ long: (t - 1) % 5 === 0 }"></i>
    </div>
  </div>
</template>

<style scoped>
.wm-wrap {
  --wm-main: var(--accent-strong); /* 日间苔绿 */
  --plate-op: 0.35;
  padding: 0 1vw;
  user-select: none;
}

:root[data-theme='dark'] .wm-wrap {
  --wm-main: var(--accent); /* 夜间极光绿 */
  --plate-op: 0.45;
}

/* 巨字限宽居中，字母间距随容器自然收拢；刻度线与字宽对齐 */
.wm-stack,
.wm-rule {
  max-width: 62rem;
  margin-inline: auto;
}

.wm-stack {
  position: relative;
  visibility: hidden;
}

.wm-wrap.fitted .wm-stack {
  visibility: visible;
}

/* 测量态：自然排列 + 最粗字重 + 无动画，保证槽宽按 900 字重量出 */
.wm-wrap.measuring .wm-stack {
  visibility: hidden;
}

.wm-wrap.measuring .wm-text {
  justify-content: flex-start;
  /* 块级 flex 容器宽度恒等于父宽，必须收成内容宽才能量出字形真实总宽 */
  width: max-content;
}

.wm-wrap.measuring .wl {
  animation: none !important;
  transform: none;
  font-weight: 900;
}

.wm-text,
.wm-plate {
  display: flex;
  justify-content: center;
  align-items: baseline;
  font-family: var(--font-display);
  font-weight: 900;
  line-height: 1;
  letter-spacing: 0;
  white-space: nowrap;
}

/* 负字距：吃掉字形两侧的自然 bearing，字母贴紧但不碰笔画 */
.pl + .pl,
.wl-mask + .wl-mask {
  margin-left: -0.05em;
}

.wm-text {
  position: relative;
  z-index: 1;
  color: var(--wm-main);
}

.wm-plate {
  position: absolute;
  inset: 0;
  z-index: 0;
  color: var(--ink);
  opacity: 0;
  transform: translate(0.06em, -0.05em);
}

.wm-wrap.on .wm-plate {
  animation: wm-plate-in 1.3s var(--ease-out-cubic) both;
}

.pl {
  display: inline-block;
  text-align: center;
}

.wl-mask {
  display: inline-block;
  overflow: hidden;
  text-align: center;
}

.wl {
  display: inline-block;
  transform: translateY(112%);
}

.wm-wrap.on .wl {
  transform: translateY(0);
}

.wm-wrap.on .wm-text .wl {
  animation: wm-rise 0.72s var(--ease-out-cubic) both;
  animation-delay: calc(0.15s + var(--i) * 75ms);
}

/* 刻度下划线：落版后自左向右展开 */
.wm-rule {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  height: 10px;
  margin-top: 0.06em;
  border-top: 1px solid var(--wm-main);
  transform: scaleX(0);
  transform-origin: left;
}

.wm-wrap.on .wm-rule {
  animation: wm-rule-draw 0.9s var(--ease-out-cubic) 1.05s both;
}

.wm-rule i {
  width: 1px;
  height: 4px;
  background: var(--wm-main);
  opacity: 0.55;
}

.wm-rule i.long {
  height: 8px;
  opacity: 0.9;
}

/* 落版：副版先在错位位淡入，主版落字后滑向套准位（终态保留 1.5px 错位肌理） */
@keyframes wm-plate-in {
  0% {
    transform: translate(0.06em, -0.05em);
    opacity: 0;
  }
  30% {
    transform: translate(0.06em, -0.05em);
    opacity: var(--plate-op);
  }
  100% {
    transform: translate(1.5px, 1.5px);
    opacity: var(--plate-op);
  }
}

@keyframes wm-rise {
  from {
    transform: translateY(112%);
  }
  to {
    transform: translateY(0);
  }
}

@keyframes wm-rule-draw {
  from {
    transform: scaleX(0);
  }
  to {
    transform: scaleX(1);
  }
}

/* 重印：主题切换时副版跳向反向错位再归位，字母自左向右闪印一遍 */
.wm-wrap.reprint .wm-plate {
  animation: wm-plate-reprint 0.45s var(--ease-out-cubic);
}

.wm-wrap.reprint .wm-text .wl {
  animation: wm-letter-flip 0.4s ease-in-out;
  animation-delay: calc(var(--i) * 60ms);
}

@keyframes wm-plate-reprint {
  0% {
    transform: translate(-0.05em, 0.05em);
  }
  100% {
    transform: translate(1.5px, 1.5px);
  }
}

@keyframes wm-letter-flip {
  0% {
    opacity: 1;
    transform: translateY(0);
  }
  35% {
    opacity: 0.15;
    transform: translateY(1px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .wm-plate {
    transform: translate(1.5px, 1.5px);
    opacity: var(--plate-op);
    animation: none !important;
  }

  .wl {
    transform: none;
    animation: none !important;
  }

  .wm-rule {
    transform: none;
    animation: none !important;
  }
}
</style>
