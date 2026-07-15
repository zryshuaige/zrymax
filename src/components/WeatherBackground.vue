<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { TresCanvas } from '@tresjs/core'
import { EffectComposerPmndrs as EffectComposer, BloomPmndrs as Bloom, VignettePmndrs as Vignette } from '@tresjs/post-processing'
import * as THREE from 'three'
import { weatherState, sceneToWeatherUniform } from '../composables/useWeatherState'
import { weatherVertexShader, weatherFragmentShader } from '../shaders/weatherBackground'

const host = ref<HTMLElement | null>(null)
const mouse = new THREE.Vector2(0.5, 0.5)
let rafId = 0
let lowPerf = false

const uniforms = {
  uTime: { value: 0 },
  uDayNight: { value: weatherState.dayNight },
  uWeather: { value: sceneToWeatherUniform[weatherState.scene] },
  uResolution: { value: new THREE.Vector2(1, 1) },
  uMouse: { value: new THREE.Vector2(0.5, 0.5) },
  uScroll: { value: 0 },
}

const cameraPosition = new THREE.Vector3(0, 0, 1)
// 首帧后采样 FPS 降级用
let lastT = 0
let frames = 0

const resize = () => {
  const el = host.value
  if (!el) return
  uniforms.uResolution.value.set(el.clientWidth || window.innerWidth, el.clientHeight || window.innerHeight)
}

watch(
  () => weatherState.scene,
  (s) => {
    uniforms.uWeather.value = sceneToWeatherUniform[s]
  },
)

watch(
  () => weatherState.dayNight,
  (n) => {
    uniforms.uDayNight.value = n
  },
)

watch(
  () => weatherState.scrollProgress,
  (s) => {
    uniforms.uScroll.value = s
  },
)

const tick = (t: number) => {
  uniforms.uTime.value = t / 1000
  uniforms.uMouse.value.lerp(mouse, 0.05)
  // FPS 监测：前 90 帧后判定，<40 触发降级（关 Bloom 由模板控制）
  if (!lowPerf && frames > 0) {
    if (frames === 90) {
      const avg = (t - lastT) / 90
      if (avg > 1000 / 40) {
        lowPerf = true
      }
      lastT = t
      frames = 1
    } else {
      frames++
    }
  }
  rafId = window.requestAnimationFrame(tick)
}

const onMouseMove = (e: MouseEvent) => {
  mouse.set(e.clientX / window.innerWidth, 1 - e.clientY / window.innerHeight)
}

onMounted(() => {
  resize()
  window.addEventListener('mousemove', onMouseMove, { passive: true })
  window.addEventListener('resize', resize)
  lastT = performance.now()
  frames = 1
  rafId = window.requestAnimationFrame(tick)
})

onBeforeUnmount(() => {
  window.cancelAnimationFrame(rafId)
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('resize', resize)
})
</script>

<template>
  <div ref="host" class="weather-bg">
    <TresCanvas :alpha="false" power-preference="high-performance" :dpr="[1, 2]" output-color-space="srgb">
      <TresOrthographicCamera :position="cameraPosition" />
      <TresMesh :position="cameraPosition">
        <TresPlaneGeometry :args="[2, 2]" />
        <TresShaderMaterial
          :vertex-shader="weatherVertexShader"
          :fragment-shader="weatherFragmentShader"
          :uniforms="uniforms"
          :depth-write="false"
          :depth-test="false"
        />
      </TresMesh>
      <Suspense>
        <EffectComposer v-if="!lowPerf">
          <Bloom :intensity="0.35" :luminance-threshold="0.55" :luminance-smoothing="0.5" :mipmap-blur="true" />
          <Vignette :darkness="0.55" :offset="0.32" />
        </EffectComposer>
      </Suspense>
    </TresCanvas>
  </div>
</template>

<style scoped>
.weather-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.weather-bg :deep(canvas) {
  width: 100% !important;
  height: 100% !important;
  display: block;
}
</style>