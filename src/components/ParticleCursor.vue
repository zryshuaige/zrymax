<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

// 粒子光标：替代原生光标 + 拖尾粒子 + 点击爆裂。
// 仅在「精细指针 + 非减弱动效」下启用；触屏与无障碍偏好下完全关闭。
const canvas = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null
let raf = 0
let w = 0
let h = 0
let dpr = 1

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  max: number
  size: number
  hue: number
  burst: boolean
}
const particles: Particle[] = []
const mouse = { x: -100, y: -100, px: -100, py: -100 }
let active = false // 悬停在可交互元素上
let down = false // 鼠标按下

// 北卡蓝色域：~205-220 蓝
const HUE_TRAIL = 208
const HUE_BURST = 200

const resize = () => {
  const c = canvas.value
  if (!c) return
  dpr = Math.min(window.devicePixelRatio || 1, 2)
  w = window.innerWidth
  h = window.innerHeight
  c.width = w * dpr
  c.height = h * dpr
  ctx = c.getContext('2d')
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
}

const spawn = () => {
  const dx = mouse.x - mouse.px
  const dy = mouse.y - mouse.py
  const speed = Math.hypot(dx, dy)
  const count = Math.min(3, Math.floor(speed / 6) + (speed > 0.5 ? 1 : 0))
  for (let i = 0; i < count; i++) {
    particles.push({
      x: mouse.x + (Math.random() - 0.5) * 4,
      y: mouse.y + (Math.random() - 0.5) * 4,
      vx: (Math.random() - 0.5) * 1.2 + dx * 0.04,
      vy: (Math.random() - 0.5) * 1.2 + dy * 0.04,
      life: 1,
      max: 0.5 + Math.random() * 0.5,
      size: 2 + Math.random() * 3,
      hue: HUE_TRAIL + Math.random() * 14,
      burst: false,
    })
  }
  mouse.px = mouse.x
  mouse.py = mouse.y
}

// 点击爆裂：一束径向粒子
const burst = (x: number, y: number) => {
  const n = 18
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 + Math.random() * 0.3
    const sp = 2.5 + Math.random() * 3
    particles.push({
      x,
      y,
      vx: Math.cos(ang) * sp,
      vy: Math.sin(ang) * sp,
      life: 1,
      max: 0.5 + Math.random() * 0.35,
      size: 2.5 + Math.random() * 3,
      hue: HUE_BURST + Math.random() * 18,
      burst: true,
    })
  }
}

const loop = () => {
  raf = window.requestAnimationFrame(loop)
  if (!ctx) return
  ctx.clearRect(0, 0, w, h)

  spawn()

  ctx.globalCompositeOperation = 'lighter'
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]
    p.life -= 0.016 / p.max
    if (p.life <= 0) {
      particles.splice(i, 1)
      continue
    }
    p.x += p.vx
    p.y += p.vy
    if (p.burst) {
      p.vx *= 0.92
      p.vy *= 0.92
      p.vy += 0.02 // 轻微下落
    } else {
      p.vx *= 0.95
      p.vy *= 0.95
    }
    const a = p.life
    const r = p.size * p.life
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 2.4)
    g.addColorStop(0, `hsla(${p.hue}, 85%, 62%, ${a * 0.9})`)
    g.addColorStop(1, `hsla(${p.hue}, 85%, 50%, 0)`)
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(p.x, p.y, r * 2.4, 0, Math.PI * 2)
    ctx.fill()
  }

  // 核心光点（保证点击精度）
  ctx.globalCompositeOperation = 'source-over'
  const coreR = down ? 7 : active ? 9 : 5
  const cg = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, coreR * 2.4)
  cg.addColorStop(0, 'rgba(255,255,255,0.96)')
  cg.addColorStop(0.4, 'rgba(120,170,230,0.75)')
  cg.addColorStop(1, 'rgba(120,170,230,0)')
  ctx.fillStyle = cg
  ctx.beginPath()
  ctx.arc(mouse.x, mouse.y, coreR * 2.4, 0, Math.PI * 2)
  ctx.fill()

  // 可交互元素的指示环
  if (active) {
    ctx.strokeStyle = down ? 'rgba(47,109,186,0.9)' : 'rgba(120,170,230,0.85)'
    ctx.lineWidth = down ? 2 : 1.5
    ctx.beginPath()
    ctx.arc(mouse.x, mouse.y, coreR + 7, 0, Math.PI * 2)
    ctx.stroke()
  }
}

const onMove = (e: MouseEvent) => {
  mouse.x = e.clientX
  mouse.y = e.clientY
}
const onOver = (e: MouseEvent) => {
  const t = e.target as Element | null
  active = !!(t && t.closest('a, button, .btn, input, [role="button"], .nav-link, .timeline-node, .reader-close'))
}
const onDown = (e: MouseEvent) => {
  down = true
  burst(e.clientX, e.clientY)
}
const onUp = () => {
  down = false
}
const onLeave = () => {
  mouse.x = -100
  mouse.y = -100
  down = false
}

onMounted(() => {
  if (window.matchMedia('(pointer: coarse)').matches) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  resize()
  document.documentElement.classList.add('cursor-hidden')
  window.addEventListener('resize', resize)
  window.addEventListener('mousemove', onMove, { passive: true })
  window.addEventListener('mouseover', onOver, { passive: true })
  window.addEventListener('mousedown', onDown, { passive: true })
  window.addEventListener('mouseup', onUp, { passive: true })
  document.addEventListener('mouseleave', onLeave)
  raf = window.requestAnimationFrame(loop)
})

onBeforeUnmount(() => {
  window.cancelAnimationFrame(raf)
  document.documentElement.classList.remove('cursor-hidden')
  window.removeEventListener('resize', resize)
  window.removeEventListener('mousemove', onMove)
  window.removeEventListener('mouseover', onOver)
  window.removeEventListener('mousedown', onDown)
  window.removeEventListener('mouseup', onUp)
  document.removeEventListener('mouseleave', onLeave)
})
</script>

<template>
  <canvas ref="canvas" class="particle-cursor" aria-hidden="true"></canvas>
</template>

<style scoped>
.particle-cursor {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 9999;
  pointer-events: none;
}

@media (pointer: coarse), (prefers-reduced-motion: reduce) {
  .particle-cursor {
    display: none;
  }
}
</style>