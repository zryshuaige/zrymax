import type { Directive } from 'vue'
import { prefersReducedMotion } from '../composables/usePrefersReducedMotion'

/**
 * v-reveal：IntersectionObserver 驱动的滚动显现。
 * 只负责给元素挂/摘 data-reveal 与 .is-in，动画全部由 CSS 承担。
 */
interface RevealEl extends HTMLElement {
  _revealObserver?: IntersectionObserver
}

const bind = (el: RevealEl) => {
  if (prefersReducedMotion()) {
    el.classList.add('is-in')
    return
  }
  el.setAttribute('data-reveal', '')
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          ;(entry.target as HTMLElement).classList.add('is-in')
          observer.unobserve(entry.target)
        }
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
  )
  observer.observe(el)
  el._revealObserver = observer
}

export const vReveal: Directive<RevealEl> = {
  mounted: bind,
  unmounted(el) {
    el._revealObserver?.disconnect()
    delete el._revealObserver
  },
}
