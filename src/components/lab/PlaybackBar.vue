<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'

/**
 * 实验室共享播放控件：播放/暂停、单步、重置、速度切换（1× → 2× → 0.5× 循环）。
 * 键盘：空格 = 播放/暂停，→ = 单步，R = 重置（输入框聚焦时不劫持）。
 * 同一时刻页面只挂载一个 demo，因此全局键监听不会串台。
 */
defineProps<{
  playing: boolean
  step: number // 已推进到的拍（含义由父组件定义）
  total: number
  speed: number
}>()

const emit = defineEmits<{
  toggle: []
  stepForward: []
  reset: []
  cycleSpeed: []
}>()

const onKey = (e: KeyboardEvent) => {
  const t = e.target
  if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement) return
  if (e.code === 'Space') {
    e.preventDefault()
    emit('toggle')
  } else if (e.key === 'ArrowRight') {
    emit('stepForward')
  } else if (e.key === 'r' || e.key === 'R') {
    emit('reset')
  }
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="pb-bar">
    <button type="button" class="pb-btn pb-main" @click="emit('toggle')">{{ playing ? '暂停' : '播放' }}</button>
    <button type="button" class="pb-btn" @click="emit('stepForward')">单步 →</button>
    <button type="button" class="pb-btn" @click="emit('reset')">重置</button>
    <button type="button" class="pb-btn mono" title="切换动画速度" @click="emit('cycleSpeed')">{{ speed }}×</button>
    <span class="pb-track" aria-hidden="true">
      <span class="pb-fill" :style="{ width: (total > 0 ? (Math.min(step, total) / total) * 100 : 0) + '%' }"></span>
    </span>
    <span class="pb-count mono">{{ Math.min(step, total) }}/{{ total }}</span>
  </div>
</template>

<style scoped>
.pb-bar {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex-wrap: wrap;
}

.pb-btn {
  border: 1px solid var(--card-border);
  background: var(--card-bg);
  color: var(--text-primary);
  font-size: 0.76rem;
  padding: 0.34em 0.85em;
  cursor: pointer;
  transition:
    background var(--dur-1) var(--ease-out-cubic),
    color var(--dur-1) var(--ease-out-cubic),
    border-color var(--dur-1) var(--ease-out-cubic);
}

.pb-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.pb-main {
  border-color: var(--accent);
  color: var(--accent);
  font-weight: 700;
}

.pb-main:hover {
  background: var(--accent);
  color: var(--paper);
}

.pb-track {
  flex: 1;
  min-width: 48px;
  height: 4px;
  background: var(--accent-soft);
  overflow: hidden;
}

.pb-fill {
  display: block;
  height: 100%;
  background: var(--accent);
  transition: width var(--dur-2) var(--ease-out-cubic);
}

.pb-count {
  font-size: 0.74rem;
  color: var(--text-secondary);
  min-width: 2.6em;
  text-align: right;
}
</style>
