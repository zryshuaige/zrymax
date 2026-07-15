import { readonly, ref } from 'vue'
import '@tensorflow/tfjs'
import * as mobilenet from '@tensorflow-models/mobilenet'
import type { MobileNet } from '@tensorflow-models/mobilenet'

// MobileNet 模型懒加载单例：进入 XAI 页才拉取 ~5MB 权重。
// 加载状态对外只读，避免误改。
type ModelState = 'idle' | 'loading' | 'ready' | 'error'
const state = ref<ModelState>('idle')
const progress = ref(0)
const errMsg = ref('')
let model: MobileNet | null = null
let inflight: Promise<MobileNet | null> | null = null

// tfjs 没有暴露细粒度进度回调，这里用一个模拟进度 ticker 让骨架体感更顺。
let progressTimer: number | null = null
const startFakeProgress = () => {
  progress.value = 0
  if (progressTimer !== null) window.clearInterval(progressTimer)
  progressTimer = window.setInterval(() => {
    if (progress.value < 92) progress.value = +(progress.value + Math.random() * 6).toFixed(1)
  }, 220)
}
const stopFakeProgress = (ok: boolean) => {
  if (progressTimer !== null) {
    window.clearInterval(progressTimer)
    progressTimer = null
  }
  progress.value = ok ? 100 : 0
}

export function useMobileNet() {
  const load = async (): Promise<MobileNet | null> => {
    if (model) {
      state.value = 'ready'
      progress.value = 100
      return model
    }
    if (inflight) return inflight
    state.value = 'loading'
    errMsg.value = ''
    startFakeProgress()
    inflight = (async () => {
      try {
        const m = await mobilenet.load({ version: 2, alpha: 1.0 })
        model = m
        stopFakeProgress(true)
        state.value = 'ready'
        return model
      } catch (e) {
        stopFakeProgress(false)
        state.value = 'error'
        errMsg.value = e instanceof Error ? e.message : String(e)
        inflight = null
        return null
      }
    })()
    return inflight
  }

  const reset = () => {
    model = null
    inflight = null
    state.value = 'idle'
    progress.value = 0
    errMsg.value = ''
  }

  return {
    state: readonly(state),
    progress: readonly(progress),
    errMsg: readonly(errMsg),
    load,
    reset,
  }
}