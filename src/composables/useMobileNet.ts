import { readonly, ref } from 'vue'
import * as tf from '@tensorflow/tfjs'
import * as mobilenet from '@tensorflow-models/mobilenet'
import type { MobileNet } from '@tensorflow-models/mobilenet'

// MobileNet 模型懒加载单例：进入 XAI 页才拉取权重。
// 加载分三个阶段对外播报，避免「长时间假死」观感：
//   weights —— 下载预训练权重（无真实进度回调，缓动逼近 70%）
//   backend —— 初始化 WebGL 计算后端
//   warmup  —— 用空白张量跑一次推理，预编译着色器管线，
//              保证就绪后的首张图不再经历首次推理的长卡顿
type ModelState = 'idle' | 'loading' | 'ready' | 'error'
export type LoadPhase = 'weights' | 'backend' | 'warmup'

const state = ref<ModelState>('idle')
const phase = ref<LoadPhase>('weights')
const progress = ref(0)
const errMsg = ref('')
let model: MobileNet | null = null
let inflight: Promise<MobileNet | null> | null = null

let progressTimer: number | null = null
const startWeightsProgress = () => {
  progress.value = 0
  if (progressTimer !== null) window.clearInterval(progressTimer)
  progressTimer = window.setInterval(() => {
    // 缓动逼近 70%：越接近越慢，永不「到顶假死」
    const remain = 70 - progress.value
    if (remain > 0.2) progress.value = +(progress.value + remain * 0.06).toFixed(1)
  }, 180)
}
const stopWeightsProgress = () => {
  if (progressTimer !== null) {
    window.clearInterval(progressTimer)
    progressTimer = null
  }
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
    phase.value = 'weights'
    startWeightsProgress()
    inflight = (async () => {
      try {
        const m = await mobilenet.load({ version: 2, alpha: 1.0 })
        stopWeightsProgress()

        // 阶段二：显式选定后端，webgl 不可用时回退 wasm / cpu
        phase.value = 'backend'
        progress.value = 74
        await tf.nextFrame() // 让进度条先绘制一帧
        try {
          await tf.setBackend('webgl')
        } catch {
          /* 回退默认后端链 */
        }
        await tf.ready()
        await tf.nextFrame()

        // 阶段三：预热——首次 classify 会编译 WebGL 着色器，
        // 是「就绪后第一张图卡几秒」的根因，提前到加载期完成
        phase.value = 'warmup'
        progress.value = 86
        await tf.nextFrame()
        await m.classify(new ImageData(224, 224), 1)
        progress.value = 100

        model = m
        state.value = 'ready'
        return model
      } catch (e) {
        stopWeightsProgress()
        progress.value = 0
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
    phase: readonly(phase),
    progress: readonly(progress),
    errMsg: readonly(errMsg),
    load,
    reset,
  }
}
