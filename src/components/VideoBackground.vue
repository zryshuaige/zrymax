<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { weatherState, type WeatherScene } from '../composables/useWeatherState'

// 真实自然风景视频背景，按天气场景切换；mixkit（Envato 官方免费素材站，Mixkit License 允商用）。
// 仅加载当前天气那一个视频，preload=none 不阻塞首屏；失败回退 .css-bg。
const props = defineProps<{
  // 手动场景覆盖：给定时使用该场景而非真实天气；undefined → 跟随 weatherState.scene
  sceneOverride?: WeatherScene
}>()

const SCENE_VIDEO: Record<WeatherScene, { src: string; name: string }> = {
  clear: { src: 'https://assets.mixkit.co/videos/51105/51105-720.mp4', name: '白云过晴空' },
  cloudy: { src: 'https://assets.mixkit.co/videos/4132/4132-720.mp4', name: '阿尔卑斯山云' },
  rain: { src: 'https://assets.mixkit.co/videos/47948/47948-720.mp4', name: '雨景' },
  snow: { src: 'https://assets.mixkit.co/videos/28844/28844-720.mp4', name: '雪林路' },
  fog: { src: 'https://assets.mixkit.co/videos/22728/22728-720.mp4', name: '雾林' },
  storm: { src: 'https://assets.mixkit.co/videos/47948/47948-720.mp4', name: '雷暴夜雨' },
}

const videoRef = ref<HTMLVideoElement | null>(null)
// 当前场景：有手动覆盖则用覆盖值，否则跟随真实天气
const current = ref<WeatherScene>(props.sceneOverride ?? weatherState.scene)
const failed = ref(false)
const loaded = ref(false)

const active = computed(() => SCENE_VIDEO[current.value] ?? SCENE_VIDEO.clear)

// 日夜联动：夜晚加深（手动场景也沿用真实日夜，保持氛围一致）
const videoFilter = computed(() => {
  const night = weatherState.dayNight
  const base = `saturate(${night ? 90 : 108}%) brightness(${night ? 0.5 : 0.78}) contrast(${night ? 115 : 100}%)`
  if (current.value === 'rain' && night) return `${base} hue-rotate(-10deg)`
  return base
})

// 解析「应当展示的场景」：手动覆盖优先，否则真实天气
const resolvedScene = () => props.sceneOverride ?? weatherState.scene

watch(
  () => props.sceneOverride,
  (s) => {
    const next = s ?? weatherState.scene
    if (next === current.value) return
    loaded.value = false
    current.value = next
    failed.value = false
  },
)

watch(
  () => weatherState.scene,
  (s) => {
    // 手动覆盖存在时不跟随真实天气
    if (props.sceneOverride) return
    if (s === current.value) return
    loaded.value = false
    current.value = s
    failed.value = false
  },
)

watch(active, () => {
  const v = videoRef.value
  if (!v) return
  v.load()
})

onMounted(() => {
  current.value = resolvedScene()
})

const onCanPlay = () => {
  loaded.value = true
  videoRef.value?.play().catch(() => {
    /* 自动播放被阻止：静音视频一般允许，忽略 */
  })
}

const onError = () => {
  failed.value = true
}

const emit = defineEmits<{ loaded: [] }>()
watch(loaded, (v) => {
  if (v) emit('loaded')
})
</script>

<template>
  <div class="video-bg" :class="{ 'is-loaded': loaded, 'is-failed': failed }" aria-hidden="true">
    <video
      ref="videoRef"
      class="video-el"
      :src="active.src"
      :style="{ filter: videoFilter }"
      autoplay
      muted
      loop
      playsinline
      preload="none"
      @canplay="onCanPlay"
      @error="onError"
    ></video>
    <div class="video-tint"></div>
    <div class="video-vignette"></div>
  </div>
</template>

<style scoped>
.video-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
  background: transparent;
}

.video-el {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 1.2s ease;
}

.video-bg.is-loaded .video-el {
  opacity: 1;
}

.video-bg.is-failed .video-el {
  display: none;
}

/* 北卡蓝半透明蒙板：保证卡片可读 */
.video-tint {
  position: absolute;
  inset: 0;
  background: linear-gradient(160deg, rgba(10, 28, 51, 0.42), rgba(238, 243, 251, 0.18));
  mix-blend-mode: multiply;
}

:root[data-theme='dark'] .video-tint {
  background: linear-gradient(160deg, rgba(6, 14, 28, 0.62), rgba(10, 20, 40, 0.46));
  mix-blend-mode: normal;
}

/* 暗角强化电影感 */
.video-vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at center, transparent 50%, rgba(8, 18, 36, 0.4) 100%);
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .video-bg {
    display: none;
  }
}

@media (pointer: coarse) {
  /* 移动端弱化蒙板避免过暗 */
  .video-tint {
    background: linear-gradient(160deg, rgba(10, 28, 51, 0.3), rgba(238, 243, 251, 0.12));
  }
}
</style>