<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { prefersReducedMotion } from '../composables/usePrefersReducedMotion'

/**
 * 墨迹光标：blend-mode difference 的圆点，随指针移动，
 * 悬停交互元素时放大。仅指针设备启用；尊重减弱动效偏好。
 */
const cursorRef = ref<HTMLElement | null>(null)

let rafId = 0
let targetX = -100
let targetY = -100
let currentX = -100
let currentY = -100

const INTERACTIVE_SELECTOR = 'a, button, input, textarea, [role="button"], select, label'

const onPointerMove = (e: PointerEvent) => {
  targetX = e.clientX
  targetY = e.clientY
  const el = cursorRef.value
  if (!el) return
  const hit = (e.target as Element | null)?.closest?.(INTERACTIVE_SELECTOR)
  el.classList.toggle('is-active', Boolean(hit))
}

const tick = () => {
  const el = cursorRef.value
  if (el) {
    // 阻尼跟随：比直接贴指针更有「墨滴」感
    currentX += (targetX - currentX) * 0.22
    currentY += (targetY - currentY) * 0.22
    el.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`
  }
  rafId = requestAnimationFrame(tick)
}

onMounted(() => {
  if (prefersReducedMotion()) return
  if (!window.matchMedia('(pointer: fine)').matches) return
  document.documentElement.classList.add('cursor-hidden')
  window.addEventListener('pointermove', onPointerMove, { passive: true })
  rafId = requestAnimationFrame(tick)
})

onBeforeUnmount(() => {
  document.documentElement.classList.remove('cursor-hidden')
  window.removeEventListener('pointermove', onPointerMove)
  cancelAnimationFrame(rafId)
})
</script>

<template>
  <div ref="cursorRef" class="ink-cursor" aria-hidden="true"></div>
</template>
