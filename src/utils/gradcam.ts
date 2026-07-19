// Grad-CAM / 可解释性视觉工具集。

// Jet colormap：值 0~1 -> [r,g,b] 0~255。神经元档案仍在用。
export function jet(v: number): [number, number, number] {
  const x = Math.max(0, Math.min(1, v))
  const four = 4 * x
  const r = Math.max(0, 1 - Math.abs(four - 2))
  const g = Math.max(0, 1 - Math.abs(four - 2.5))
  const b = Math.max(0, 1 - Math.abs(four - 1.5))
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)]
}

// 5 段平滑 Spectral 风格 colormap：深蓝 -> 蓝 -> 青绿 -> 橙 -> 红。
// 感知更均匀、比 jet 更"热"，配合透明冷区形成经典 saliency 观感。
const SPECTRAL_STOPS: [number, [number, number, number]][] = [
  [0.0, [49, 54, 149]], // 深蓝
  [0.25, [50, 136, 189]], // 蓝
  [0.5, [102, 194, 165]], // 青绿
  [0.75, [244, 161, 76]], // 橙
  [1.0, [214, 47, 39]], // 红
]

export function spectral(v: number): [number, number, number] {
  const x = Math.max(0, Math.min(1, v))
  for (let i = 0; i < SPECTRAL_STOPS.length - 1; i++) {
    const [t0, c0] = SPECTRAL_STOPS[i]
    const [t1, c1] = SPECTRAL_STOPS[i + 1]
    if (x <= t1) {
      const f = (x - t0) / (t1 - t0 || 1)
      return [
        Math.round(c0[0] + (c1[0] - c0[0]) * f),
        Math.round(c0[1] + (c1[1] - c0[1]) * f),
        Math.round(c0[2] + (c1[2] - c0[2]) * f),
      ]
    }
  }
  return SPECTRAL_STOPS[SPECTRAL_STOPS.length - 1][1]
}

// 把粗网格热图（grid²）双线性插值上采样到 outW×outH，生成带 alpha 的 ImageData。
// alpha 随热度提升：冷区透明(透出原图)、热区显色 -> 干净的经典 saliency 叠加。
export function heatToImageData(
  heat: Float32Array,
  grid: number,
  outW: number,
  outH: number,
  maxAlpha = 0.72,
): ImageData {
  const out = new Uint8ClampedArray(outW * outH * 4)
  const gMax = grid - 1
  for (let y = 0; y < outH; y++) {
    const gy = (y / (outH - 1)) * gMax
    const gy0 = Math.floor(gy)
    const gy1 = Math.min(gMax, gy0 + 1)
    const fy = gy - gy0
    for (let x = 0; x < outW; x++) {
      const gx = (x / (outW - 1)) * gMax
      const gx0 = Math.floor(gx)
      const gx1 = Math.min(gMax, gx0 + 1)
      const fx = gx - gx0
      // 四角双线性插值
      const v00 = heat[gy0 * grid + gx0]
      const v10 = heat[gy0 * grid + gx1]
      const v01 = heat[gy1 * grid + gx0]
      const v11 = heat[gy1 * grid + gx1]
      const v0 = v00 + (v10 - v00) * fx
      const v1 = v01 + (v11 - v01) * fx
      const v = v0 + (v1 - v0) * fy
      const [r, g, b] = spectral(v)
      const idx = (y * outW + x) * 4
      out[idx] = r
      out[idx + 1] = g
      out[idx + 2] = b
      out[idx + 3] = Math.round(Math.pow(v, 1.2) * 255 * maxAlpha)
    }
  }
  return new ImageData(out, outW, outH)
}

export type InferFn = (img: HTMLCanvasElement) => Promise<{ className: string; probability: number }[]>

// 粗网格遮挡敏感性热图：固定 grid×grid 个遮挡块，单次推理/块。
// 推理数恒定（默认 8×8=64，与 MobileNet 末层 7×7 感受野相当），与"层"解耦，
// 主线程开销可控且可预期。返回长度 = grid² 的归一化热图。
export async function occlusionSensitivity(
  sourceCanvas: HTMLCanvasElement,
  infer: InferFn,
  targetClassIdx: number,
  opts: { grid?: number; fill?: string } = {},
): Promise<Float32Array> {
  const grid = opts.grid ?? 8
  const fill = opts.fill ?? 'rgba(0,0,0,1)'
  const w = sourceCanvas.width
  const h = sourceCanvas.height
  const heat = new Float32Array(grid * grid)

  // 基线预测
  const base = await infer(sourceCanvas)
  const baseProb = base[targetClassIdx]?.probability ?? 0

  // 拷贝原图像素用于遮挡后恢复
  const tmp = document.createElement('canvas')
  tmp.width = w
  tmp.height = h
  const tctx = tmp.getContext('2d')!
  tctx.drawImage(sourceCanvas, 0, 0)
  const orig = tctx.getImageData(0, 0, w, h)
  const ctx = sourceCanvas.getContext('2d')!
  ctx.fillStyle = fill

  const bw = w / grid
  const bh = h / grid
  for (let j = 0; j < grid; j++) {
    for (let i = 0; i < grid; i++) {
      const x = Math.floor(i * bw)
      const y = Math.floor(j * bh)
      const sizeX = Math.ceil((i + 1) * bw) - x
      const sizeY = Math.ceil((j + 1) * bh) - y
      ctx.fillRect(x, y, sizeX, sizeY)
      const pred = await infer(sourceCanvas)
      const drop = baseProb - (pred[targetClassIdx]?.probability ?? 0)
      heat[j * grid + i] = drop
      ctx.putImageData(orig, 0, 0) // 恢复原图
    }
  }

  return normalizeGrid(heat)
}

// 归一化到 0~1（模糊后对比度下降时用来恢复色阶）。
export function normalizeGrid(heat: Float32Array): Float32Array {
  let max = -Infinity
  let min = Infinity
  for (let i = 0; i < heat.length; i++) {
    if (heat[i] > max) max = heat[i]
    if (heat[i] < min) min = heat[i]
  }
  const range = max - min || 1
  const out = new Float32Array(heat.length)
  for (let i = 0; i < heat.length; i++) out[i] = (heat[i] - min) / range
  return out
}

// 对粗网格热图做可分离高斯模糊：sigma 越大越弥散，模拟"高层大感受野"。
// 纯后处理、无推理，故层滑块可即时重绘。
export function gaussianBlurGrid(heat: Float32Array, grid: number, sigma: number): Float32Array {
  if (sigma <= 0) return heat
  const radius = Math.max(1, Math.ceil(sigma * 3))
  // 1D 高斯核
  const kernel: number[] = []
  let ksum = 0
  for (let i = -radius; i <= radius; i++) {
    const w = Math.exp(-(i * i) / (2 * sigma * sigma))
    kernel.push(w)
    ksum += w
  }
  for (let i = 0; i < kernel.length; i++) kernel[i] /= ksum
  const clamp = (v: number) => Math.min(grid - 1, Math.max(0, v))
  // 水平 pass
  const tmp = new Float32Array(grid * grid)
  for (let j = 0; j < grid; j++) {
    for (let i = 0; i < grid; i++) {
      let s = 0
      for (let k = 0; k < kernel.length; k++) {
        const ii = clamp(i + k - radius)
        s += heat[j * grid + ii] * kernel[k]
      }
      tmp[j * grid + i] = s
    }
  }
  // 垂直 pass
  const out = new Float32Array(grid * grid)
  for (let j = 0; j < grid; j++) {
    for (let i = 0; i < grid; i++) {
      let s = 0
      for (let k = 0; k < kernel.length; k++) {
        const jj = clamp(j + k - radius)
        s += tmp[jj * grid + i] * kernel[k]
      }
      out[j * grid + i] = s
    }
  }
  return out
}
