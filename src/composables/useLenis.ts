import { onBeforeUnmount, onMounted } from 'vue'
import Lenis from 'lenis'
import { gsap, ScrollTrigger } from '../plugins/motion'
import { prefersReducedMotion } from './usePrefersReducedMotion'
import { setScrollProgress } from './useWeatherState'

/**
 * 初始化 Lenis 平滑滚动，并与 GSAP 的 ticker / ScrollTrigger 联动。
 * 在「减弱动效」偏好下直接跳过，保持原生滚动。
 */
export function useLenis() {
  let lenis: Lenis | null = null
  let ticker: ((time: number) => void) | null = null

  const updateProgress = () => {
    const doc = document.documentElement
    const max = doc.scrollHeight - doc.clientHeight
    setScrollProgress(max > 0 ? Math.min(1, lenis ? lenis.scroll / max : window.scrollY / max) : 0)
  }

  onMounted(() => {
    if (prefersReducedMotion()) {
      window.addEventListener('scroll', updateProgress, { passive: true })
      return
    }

    lenis = new Lenis({
      duration: 1.1,
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.6,
    })

    lenis.on('scroll', () => {
      ScrollTrigger.update()
      updateProgress()
    })

    ticker = (time: number) => lenis?.raf(time * 1000)
    gsap.ticker.add(ticker)
    gsap.ticker.lagSmoothing(0)
  })

  onBeforeUnmount(() => {
    if (ticker) gsap.ticker.remove(ticker)
    window.removeEventListener('scroll', updateProgress)
    lenis?.destroy()
    lenis = null
    ticker = null
  })
}
