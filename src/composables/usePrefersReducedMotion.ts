import { onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * 响应式地监听系统的「减弱动效」偏好。
 * 用于在 setup 上下文中按需禁用 GSAP / Lenis 等动效。
 */
export function usePrefersReducedMotion() {
  const reduced = ref(false)
  let mql: MediaQueryList | null = null

  const sync = () => {
    reduced.value = mql?.matches ?? false
  }

  onMounted(() => {
    mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    sync()
    mql.addEventListener('change', sync)
  })

  onBeforeUnmount(() => {
    mql?.removeEventListener('change', sync)
  })

  return reduced
}

/**
 * 非响应式快照，供指令（脱离 setup 生命周期）使用。
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
