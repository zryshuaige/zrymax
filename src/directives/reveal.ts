import type { Directive, DirectiveBinding } from 'vue'
import { gsap } from '../plugins/motion'
import { prefersReducedMotion } from '../composables/usePrefersReducedMotion'

type RevealOptions = {
  /** 入场前纵向位移，默认 36 */
  y?: number
  /** 入场前透明度，默认 0 */
  opacity?: number
  /** 时长（秒），默认 0.7 */
  duration?: number
  /** 延迟（秒），默认 0 */
  delay?: number
  /** 触发起点，默认 'top 85%' */
  start?: string
  /** 设置后改为对直接子元素做 stagger 入场；可为 true 或具体秒数 */
  stagger?: boolean | number
}

interface RevealEl extends HTMLElement {
  _revealCleanup?: () => void
}

const killTween = (tween: gsap.core.Tween) => {
  const trigger = (tween as unknown as { scrollTrigger?: { kill: () => void } }).scrollTrigger
  trigger?.kill()
  tween.kill()
}

export const vReveal: Directive<RevealEl> = {
  mounted(el, binding: DirectiveBinding<RevealOptions>) {
    const opts = binding.value ?? {}

    if (prefersReducedMotion()) {
      gsap.set(el, { opacity: 1, y: 0 })
      return
    }

    const start = opts.start ?? 'top 85%'

    if (opts.stagger) {
      const children = Array.from(el.children) as HTMLElement[]
      const staggerVal = typeof opts.stagger === 'number' ? opts.stagger : 0.08
      gsap.set(children, { opacity: 0, y: opts.y ?? 28 })
      const tween = gsap.to(children, {
        opacity: 1,
        y: 0,
        duration: opts.duration ?? 0.6,
        ease: 'power3.out',
        stagger: staggerVal,
        delay: opts.delay ?? 0,
        scrollTrigger: { trigger: el, start, toggleActions: 'play none none none' },
      })
      el._revealCleanup = () => killTween(tween)
      return
    }

    gsap.set(el, { opacity: opts.opacity ?? 0, y: opts.y ?? 36 })
    const tween = gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: opts.duration ?? 0.7,
      ease: 'power3.out',
      delay: opts.delay ?? 0,
      scrollTrigger: { trigger: el, start, toggleActions: 'play none none none' },
    })
    el._revealCleanup = () => killTween(tween)
  },
  unmounted(el) {
    el._revealCleanup?.()
    el._revealCleanup = undefined
  },
}
