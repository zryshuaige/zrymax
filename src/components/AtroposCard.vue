<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import Atropos, { type AtroposInstance } from 'atropos'

defineOptions({ inheritAttrs: false })

const props = defineProps<{
  rotateXMax?: number
  rotateYMax?: number
  activeOffset?: number
  duration?: number
  innerClass?: string
}>()

const host = ref<HTMLElement | null>(null)
let instance: AtroposInstance | null = null

onMounted(() => {
  if (!host.value) return
  // 减弱动效偏好下不初始化，直接以静态卡片呈现。
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  instance = Atropos({
    el: host.value,
    activeOffset: props.activeOffset ?? 30,
    shadow: false,
    highlight: false,
    rotateXMax: props.rotateXMax ?? 7,
    rotateYMax: props.rotateYMax ?? 7,
    duration: props.duration ?? 320,
  })
})

onBeforeUnmount(() => {
  instance?.destroy()
  instance = null
})
</script>

<template>
  <div ref="host" class="atropos-host">
    <div class="atropos-scale">
      <div class="atropos-rotate">
        <div class="atropos-inner" :class="innerClass">
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>
