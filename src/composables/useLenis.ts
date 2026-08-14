import { onBeforeUnmount, onMounted } from 'vue'
import Lenis from 'lenis'
import { prefersReducedMotion } from './usePrefersReducedMotion'

/**
 * 初始化 Lenis 平滑滚动（自带 rAF 循环，零 GSAP 依赖）。
 * 在「减弱动效」偏好下直接跳过，保持原生滚动。
 */
export function useLenis() {
  let lenis: Lenis | null = null
  let rafId = 0

  onMounted(() => {
    if (prefersReducedMotion()) {
      return
    }

    lenis = new Lenis({
      duration: 1.1,
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.6,
    })

    const raf = (time: number) => {
      lenis?.raf(time)
      rafId = requestAnimationFrame(raf)
    }
    rafId = requestAnimationFrame(raf)
  })

  onBeforeUnmount(() => {
    cancelAnimationFrame(rafId)
    lenis?.destroy()
    lenis = null
  })
}
