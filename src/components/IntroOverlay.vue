<script setup lang="ts">
import { onMounted, ref, useTemplateRef } from 'vue'
import { gsap } from '../plugins/motion'
import { prefersReducedMotion } from '../composables/usePrefersReducedMotion'

const emit = defineEmits<{ done: [] }>()
const root = useTemplateRef<HTMLElement>('rootRef')
const counter = ref('00')
const showCounter = ref(true)

const run = async () => {
  if (prefersReducedMotion()) {
    document.documentElement.classList.remove('intro-lock')
    emit('done')
    return
  }
  const el = root.value
  if (!el) {
    document.documentElement.classList.remove('intro-lock')
    emit('done')
    return
  }

  try {
    await (document as any).fonts?.ready
  } catch {
    /* ignore */
  }

  gsap.set(el, { autoAlpha: 1 })
  gsap.from('.intro-bracket-l, .intro-bracket-r', { x: (i: number) => (i === 0 ? -40 : 40), opacity: 0, duration: 0.5, ease: 'power3.out' })
  await gsap.from('.intro-mono', { y: 28, opacity: 0, duration: 0.55, stagger: 0.06, ease: 'power3.out', delay: 0.25 })
  await gsap.to({}, { duration: 0.3 })

  const frames = 42
  let f = 0
  await new Promise<void>((resolve) => {
    const tick = () => {
      f++
      counter.value = Math.round((f / frames) * 100).toString().padStart(2, '0')
      if (f >= frames) return resolve()
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })

  await gsap.to('.intro-counter', { opacity: 0, scale: 1.6, duration: 0.28 })
  showCounter.value = false

  await gsap.to(el, {
    clipPath: 'polygon(0 0, 100% 0, 100% 0, 0 0)',
    duration: 0.55,
    ease: 'power4.in',
  })
  document.documentElement.classList.remove('intro-lock')
  emit('done')
}

onMounted(() => {
  document.documentElement.classList.add('intro-lock')
  void run()
})
</script>

<template>
  <div ref="rootRef" class="intro-overlay" aria-hidden="true">
    <div class="intro-row">
      <span class="intro-bracket intro-bracket-l">/</span>
      <span class="intro-mark">
        <span v-for="(ch, i) in 'zrymax'.split('')" :key="i" class="intro-mono">{{ ch }}</span>
      </span>
      <span class="intro-bracket intro-bracket-r">/</span>
    </div>
    <Transition name="fade">
      <div v-if="showCounter" class="intro-counter">
        <span class="intro-pct">{{ counter }}</span><span class="intro-pct-dim">%</span>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.intro-overlay {
  position: fixed;
  inset: 0;
  z-index: 9998;
  display: grid;
  place-content: center;
  align-content: center;
  gap: 1.6rem;
  justify-items: center;
  background: var(--bg-primary, #eef3fb);
  color: var(--text-primary, #0a1c33);
  opacity: 0;
  visibility: hidden;
  clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
}

.intro-row {
  display: inline-flex;
  align-items: center;
  gap: 0.7rem;
  font-family: 'Space Grotesk', 'Inter', system-ui, sans-serif;
  font-size: clamp(2rem, 6vw, 4rem);
  font-weight: 700;
  letter-spacing: -0.02em;
}

.intro-bracket {
  font-size: 0.82em;
  font-weight: 500;
  color: var(--accent, #2f6dba);
  opacity: 0.7;
}

.intro-mark {
  display: inline-flex;
  overflow: hidden;
}

.intro-mono {
  display: inline-block;
  will-change: transform, opacity;
}

.intro-counter {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.86rem;
  font-weight: 500;
  letter-spacing: 0.1em;
  color: var(--text-secondary, #38526f);
}

.intro-pct-dim {
  opacity: 0.5;
}

.fade-leave-active {
  transition: opacity 0.2s ease;
}
</style>