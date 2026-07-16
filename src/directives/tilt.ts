import type { Directive, DirectiveBinding } from 'vue'
import { prefersReducedMotion } from '../composables/usePrefersReducedMotion'

interface TiltEl extends HTMLElement {
  _tiltCleanup?: () => void
}

/**
 * 卡片 3D 倾斜：鼠标在元素上移动时，按偏移做 perspective rotateX/rotateY。
 * v-tilt 或 v-tilt="6"（最大倾角，度，0~20）。触屏 / 减弱动效下 no-op。
 */
export const vTilt: Directive<TiltEl> = {
  mounted(el, binding: DirectiveBinding<number | undefined>) {
    if (prefersReducedMotion()) return
    if (window.matchMedia('(pointer: coarse)').matches) return
    const max = typeof binding.value === 'number' ? binding.value : 6

    el.style.transformStyle = 'preserve-3d'
    el.style.willChange = 'transform'
    el.style.transition = 'transform var(--dur-1) var(--ease-out-cubic)'

    let raf = 0
    let targetX = 0
    let targetY = 0

    const apply = () => {
      el.style.transform = `perspective(800px) rotateX(${targetX}deg) rotateY(${targetY}deg)`
    }

    const onMove = (event: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      const relX = (event.clientX - rect.left) / rect.width - 0.5
      const relY = (event.clientY - rect.top) / rect.height - 0.5
      // relY 控制 rotateX（上下移动 → 绕 X 轴），relX 控制 rotateY（左右 → 绕 Y 轴）
      targetX = -relY * max * 2
      targetY = relX * max * 2
      if (!raf) raf = window.requestAnimationFrame(() => {
        raf = 0
        apply()
      })
    }

    const onLeave = () => {
      targetX = 0
      targetY = 0
      apply()
    }

    el.addEventListener('mousemove', onMove, { passive: true })
    el.addEventListener('mouseleave', onLeave, { passive: true })
    el._tiltCleanup = () => {
      if (raf) window.cancelAnimationFrame(raf)
      el.removeEventListener('mousemove', onMove)
      el.removeEventListener('mouseleave', onLeave)
    }
  },
  unmounted(el) {
    el._tiltCleanup?.()
    el._tiltCleanup = undefined
  },
}
