<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { prefersReducedMotion } from '../composables/usePrefersReducedMotion'

/**
 * 天空画布：全站环境背景，随「白昼 / 星夜」主题切换两种场景。
 *
 * 日间 · 清新自然
 *   - 天空渐变按真实时刻微调：清晨薰衣草 → 正午薄荷 → 黄昏暖杏
 *   - 右上角柔光日轮，花瓣/花粉缓慢飘落、左右摇摆
 *
 * 夜间 · 梦幻星空
 *   - 深靛夜空 + 极光色星云辉光 + 冷月晕
 *   - 星点按随机相位闪烁，相邻孢子浮现星座连线
 *   - 偶有流星划过（随机 6–14s 一颗，带渐隐尾迹）
 *
 * 2D Canvas，DPR 感知，标签页隐藏暂停，尊重减弱动效。
 */
const canvasRef = ref<HTMLCanvasElement | null>(null)

interface Star {
  x: number; y: number; r: number
  phase: number; period: number; oMin: number; oMax: number
}

interface Spore {
  x: number; y: number; ox: number; oy: number
  r: number; mass: number; phase: number; speed: number
  vx: number; vy: number; gold: boolean
}

interface Petal {
  x: number; y: number; w: number; h: number
  rot: number; rotSpeed: number; phase: number
  vy: number; sway: number; tint: number
}

interface Meteor {
  x: number; y: number; vx: number; vy: number; life: number; maxLife: number
}

let ctx: CanvasRenderingContext2D | null = null
let stars: Star[] = []
let spores: Spore[] = []
let petals: Petal[] = []
let meteors: Meteor[] = []
let nextMeteorAt = 0
let rafId = 0
let running = false
let width = 0
let height = 0
let dpr = 1
let mouseX = -9999
let mouseY = -9999
let isDark = false
let themeObserver: MutationObserver | null = null

const STAR_COUNT = 130
const SPORE_COUNT = 56
const PETAL_COUNT = 26
const LINK_DIST = 110

let accentRGB = '25, 87, 54'
let signalRGB = '255, 191, 46'

const readTheme = () => {
  isDark = document.documentElement.getAttribute('data-theme') === 'dark'
  const styles = getComputedStyle(document.documentElement)
  const parse = (name: string, fallback: string) => {
    const m = styles.getPropertyValue(name).trim().match(/^#([0-9a-f]{6})$/i)
    if (!m) return fallback
    const h = m[1]
    return `${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)}`
  }
  accentRGB = parse('--accent', accentRGB)
  signalRGB = parse('--signal', signalRGB)
}

const resize = () => {
  const canvas = canvasRef.value
  if (!canvas) return
  dpr = Math.min(window.devicePixelRatio || 1, 2)
  width = window.innerWidth
  height = window.innerHeight
  canvas.width = Math.floor(width * dpr)
  canvas.height = Math.floor(height * dpr)
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
  ctx?.setTransform(dpr, 0, 0, dpr, 0, 0)
}

const seed = () => {
  stars = Array.from({ length: STAR_COUNT }, () => {
    const oMin = 0.08 + Math.random() * 0.25
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      r: [1, 1.4, 2, 2.6][Math.floor(Math.random() * 4)],
      phase: Math.random() * Math.PI * 2,
      period: 2400 + Math.random() * 5200,
      oMin,
      oMax: Math.min(0.95, oMin + 0.25 + Math.random() * 0.5),
    }
  })
  spores = Array.from({ length: SPORE_COUNT }, (_, i) => {
    const gold = i < 2
    const mass = gold ? 1 : 0.15 + Math.random() * 0.55
    return {
      x: Math.random() * width, y: Math.random() * height, ox: 0, oy: 0,
      r: gold ? 3.2 : 0.8 + mass * 2.4, mass,
      phase: Math.random() * Math.PI * 2, speed: 0.12 + Math.random() * 0.25,
      vx: (Math.random() - 0.5) * 0.16, vy: -(0.05 + Math.random() * 0.12), gold,
    }
  })
  petals = Array.from({ length: PETAL_COUNT }, () => ({
    x: Math.random() * width, y: Math.random() * height,
    w: 3 + Math.random() * 4, h: 1.6 + Math.random() * 2.4,
    rot: Math.random() * Math.PI, rotSpeed: (Math.random() - 0.5) * 0.012,
    phase: Math.random() * Math.PI * 2,
    vy: 0.18 + Math.random() * 0.3, sway: 0.4 + Math.random() * 0.8,
    tint: Math.random(),
  }))
}

/* 日间天空按时刻微调：清晨薰衣草 / 正午薄荷 / 黄昏暖杏 */
const daySkyTop = () => {
  const h = new Date().getHours()
  if (h >= 5 && h < 8) return '213, 220, 255'   // 清晨
  if (h >= 17 && h < 20) return '255, 214, 170' // 黄昏
  return '191, 226, 217'                         // 正午
}

const paintSky = () => {
  if (!ctx) return
  if (isDark) {
    // 深靛夜空
    const sky = ctx.createLinearGradient(0, 0, 0, height)
    sky.addColorStop(0, 'rgba(18, 22, 52, 0.9)')
    sky.addColorStop(0.55, 'rgba(14, 16, 40, 0.55)')
    sky.addColorStop(1, 'rgba(10, 14, 31, 0)')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, width, height)

    // 星云：极光绿 + 紫罗兰两团辉光
    const nebA = ctx.createRadialGradient(width * 0.2, height * 0.28, 0, width * 0.2, height * 0.28, width * 0.38)
    nebA.addColorStop(0, 'rgba(65, 243, 140, 0.07)')
    nebA.addColorStop(1, 'rgba(65, 243, 140, 0)')
    ctx.fillStyle = nebA
    ctx.fillRect(0, 0, width, height)

    const nebB = ctx.createRadialGradient(width * 0.82, height * 0.6, 0, width * 0.82, height * 0.6, width * 0.42)
    nebB.addColorStop(0, 'rgba(139, 127, 240, 0.08)')
    nebB.addColorStop(1, 'rgba(139, 127, 240, 0)')
    ctx.fillStyle = nebB
    ctx.fillRect(0, 0, width, height)

    // 冷月晕
    const moon = ctx.createRadialGradient(width * 0.76, height * 0.16, 0, width * 0.76, height * 0.16, 140)
    moon.addColorStop(0, 'rgba(196, 195, 255, 0.22)')
    moon.addColorStop(0.25, 'rgba(196, 195, 255, 0.08)')
    moon.addColorStop(1, 'rgba(196, 195, 255, 0)')
    ctx.fillStyle = moon
    ctx.fillRect(0, 0, width, height)
  } else {
    // 清新天空洗色
    const sky = ctx.createLinearGradient(0, 0, 0, height * 0.7)
    sky.addColorStop(0, `rgba(${daySkyTop()}, 0.55)`)
    sky.addColorStop(1, `rgba(${daySkyTop()}, 0)`)
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, width, height)

    // 柔光日轮
    const sun = ctx.createRadialGradient(width * 0.78, height * 0.14, 0, width * 0.78, height * 0.14, 160)
    sun.addColorStop(0, `rgba(${signalRGB}, 0.28)`)
    sun.addColorStop(0.3, `rgba(${signalRGB}, 0.1)`)
    sun.addColorStop(1, `rgba(${signalRGB}, 0)`)
    ctx.fillStyle = sun
    ctx.fillRect(0, 0, width, height)
  }
}

const frame = (t: number) => {
  if (!running) return
  if (ctx) {
    ctx.clearRect(0, 0, width, height)
    paintSky()

    if (isDark) {
      // 星点闪烁
      for (const st of stars) {
        const k = 0.5 + 0.5 * Math.sin((t / st.period) * Math.PI * 2 + st.phase)
        ctx.beginPath()
        ctx.arc(st.x, st.y, st.r * (1 + k * 0.25), 0, Math.PI * 2)
        ctx.fillStyle = `rgba(232, 236, 248, ${st.oMin + (st.oMax - st.oMin) * k})`
        ctx.fill()
      }

      // 流星
      if (t > nextMeteorAt) {
        nextMeteorAt = t + 6000 + Math.random() * 8000
        const sx = width * (0.15 + Math.random() * 0.7)
        meteors.push({ x: sx, y: -10, vx: -(3.2 + Math.random() * 2), vy: 4.5 + Math.random() * 2, life: 0, maxLife: 55 + Math.random() * 25 })
      }
      meteors = meteors.filter((m) => m.life < m.maxLife)
      for (const m of meteors) {
        m.life += 1
        m.x += m.vx
        m.y += m.vy
        const fade = 1 - m.life / m.maxLife
        const tail = 14
        const grad = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * tail, m.y - m.vy * tail)
        grad.addColorStop(0, `rgba(255, 255, 255, ${0.85 * fade})`)
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)')
        ctx.strokeStyle = grad
        ctx.lineWidth = 1.6
        ctx.beginPath()
        ctx.moveTo(m.x, m.y)
        ctx.lineTo(m.x - m.vx * tail, m.y - m.vy * tail)
        ctx.stroke()
      }

      // 孢子 + 星座连线 + 指针推斥
      const repelR = width / 10
      for (const s of spores) {
        const wander = Math.sin(t * 0.0004 * s.speed + s.phase) * 0.22
        s.x += s.vx + wander * 0.3
        s.y += s.vy
        if (s.y < -8) { s.y = height + 8; s.x = Math.random() * width }
        if (s.x < -8) s.x = width + 8
        if (s.x > width + 8) s.x = -8

        const dx = s.x - mouseX
        const dy = s.y - mouseY
        const dist = Math.hypot(dx, dy)
        let tx = 0, ty = 0
        if (dist < repelR && dist > 0.01) {
          const force = (1 - dist / repelR) * 26
          tx = (dx / dist) * force
          ty = (dy / dist) * force
        }
        s.ox += (tx - s.ox) * 0.08
        s.oy += (ty - s.oy) * 0.08

        const breathe = 0.55 + 0.45 * Math.sin(t * 0.001 * s.speed + s.phase)
        const alpha = s.gold ? 0.5 + breathe * 0.4 : 0.14 + breathe * 0.3 * s.mass
        ctx.beginPath()
        ctx.arc(s.x + s.ox, s.y + s.oy, s.r * (s.gold ? 1 + breathe * 0.25 : 1), 0, Math.PI * 2)
        ctx.fillStyle = s.gold ? `rgba(${signalRGB}, ${alpha})` : `rgba(${accentRGB}, ${alpha})`
        ctx.fill()
      }

      ctx.lineWidth = 0.6
      for (let i = 0; i < spores.length; i++) {
        for (let j = i + 1; j < spores.length; j++) {
          const a = spores[i], b = spores[j]
          const dx = a.x - b.x, dy = a.y - b.y
          if (Math.abs(dx) > LINK_DIST || Math.abs(dy) > LINK_DIST) continue
          const dist = Math.hypot(dx, dy)
          if (dist < LINK_DIST) {
            ctx.strokeStyle = `rgba(${accentRGB}, ${(1 - dist / LINK_DIST) * 0.2})`
            ctx.beginPath()
            ctx.moveTo(a.x + a.ox, a.y + a.oy)
            ctx.lineTo(b.x + b.ox, b.y + b.oy)
            ctx.stroke()
          }
        }
      }
    } else {
      // 花瓣 / 花粉飘落
      for (const p of petals) {
        p.y += p.vy
        p.x += Math.sin(t * 0.001 + p.phase) * p.sway * 0.4
        p.rot += p.rotSpeed
        if (p.y > height + 10) { p.y = -10; p.x = Math.random() * width }
        if (p.x < -10) p.x = width + 10
        if (p.x > width + 10) p.x = -10

        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        const rgb = p.tint > 0.75 ? signalRGB : accentRGB
        ctx.fillStyle = `rgba(${rgb}, ${p.tint > 0.75 ? 0.35 : 0.22})`
        ctx.beginPath()
        ctx.ellipse(0, 0, p.w, p.h, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }
    }
  }
  rafId = requestAnimationFrame(frame)
}

const start = () => {
  if (running || !ctx) return
  running = true
  rafId = requestAnimationFrame(frame)
}

const stop = () => {
  running = false
  cancelAnimationFrame(rafId)
}

const onVisibility = () => {
  if (document.hidden) stop()
  else start()
}

const onPointerMove = (e: PointerEvent) => {
  mouseX = e.clientX
  mouseY = e.clientY
}

onMounted(() => {
  if (prefersReducedMotion()) return
  const canvas = canvasRef.value
  if (!canvas) return
  ctx = canvas.getContext('2d')
  if (!ctx) return

  readTheme()
  resize()
  seed()
  start()

  window.addEventListener('resize', resize, { passive: true })
  window.addEventListener('pointermove', onPointerMove, { passive: true })
  document.addEventListener('visibilitychange', onVisibility)

  themeObserver = new MutationObserver(readTheme)
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  })
})

onBeforeUnmount(() => {
  stop()
  window.removeEventListener('resize', resize)
  window.removeEventListener('pointermove', onPointerMove)
  document.removeEventListener('visibilitychange', onVisibility)
  themeObserver?.disconnect()
})
</script>

<template>
  <canvas ref="canvasRef" class="spore-field" aria-hidden="true"></canvas>
</template>
