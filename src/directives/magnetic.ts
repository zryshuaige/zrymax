import type { Directive, DirectiveBinding } from 'vue'
import { prefersReducedMotion } from '../composables/usePrefersReducedMotion'

interface MagneticEl extends HTMLElement {
  _magneticCleanup?: () => void
}

/**
 * 磁吸按钮：鼠标在元素附近移动时，元素被「拉向」光标。
 * v-magnetic 或 v-magnetic="0.35"（强度，0~1）
 */
export const vMagnetic: Directive<MagneticEl> = {
  mounted(el, binding: DirectiveBinding<number | undefined>) {
    if (prefersReducedMotion()) return
    const strength = typeof binding.value === 'number' ? binding.value : 0.3

    const onMove = (event: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      const relX = event.clientX - (rect.left + rect.width / 2)
      const relY = event.clientY - (rect.top + rect.height / 2)
      el.style.transform = `translate(${relX * strength}px, ${relY * strength}px)`
    }
    const onLeave = () => {
      el.style.transform = ''
    }

    el.addEventListener('mousemove', onMove, { passive: true })
    el.addEventListener('mouseleave', onLeave, { passive: true })
    el._magneticCleanup = () => {
      el.removeEventListener('mousemove', onMove)
      el.removeEventListener('mouseleave', onLeave)
    }
  },
  unmounted(el) {
    el._magneticCleanup?.()
    el._magneticCleanup = undefined
  },
}
