// Grad-CAM / 可解释性视觉工具集。

// Jet colormap：值 0~1 → [r,g,b] 0~255。生成热图叠加用。
export function jet(v: number): [number, number, number] {
  const x = Math.max(0, Math.min(1, v))
  const four = 4 * x
  const r = Math.max(0, 1 - Math.abs(four - 2))
  const g = Math.max(0, 1 - Math.abs(four - 2.5))
  const b = Math.max(0, 1 - Math.abs(four - 1.5))
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)]
}

// 把热图值生成 ImageData（带 alpha，可直接 ctx.putImageData 叠加）。
export function heatToImageData(
  heat: Float32Array,
  srcW: number,
  srcH: number,
  outW: number,
  outH: number,
  alpha = 0.5,
): ImageData {
  const out = new Uint8ClampedArray(outW * outH * 4)
  for (let y = 0; y < outH; y++) {
    const sy = Math.min(srcH - 1, Math.floor((y / outH) * srcH))
    for (let x = 0; x < outW; x++) {
      const sx = Math.min(srcW - 1, Math.floor((x / outW) * srcW))
      const v = heat[sy * srcW + sx]
      const [r, g, b] = jet(v)
      const idx = (y * outW + x) * 4
      out[idx] = r
      out[idx + 1] = g
      out[idx + 2] = b
      out[idx + 3] = Math.round(v * 255 * alpha)
    }
  }
  return new ImageData(out, outW, outH)
}

// 把热图缩放为粗糙的低分辨率网格(供"神经元档案"档的小拇指图)。
export function heatDownsample(heat: Float32Array, srcW: number, srcH: number, cell = 14): Float32Array {
  const out = new Float32Array(cell * cell)
  for (let j = 0; j < cell; j++) {
    for (let i = 0; i < cell; i++) {
      let sum = 0
      let cnt = 0
      const y0 = Math.floor((j / cell) * srcH)
      const y1 = Math.max(y0 + 1, Math.floor(((j + 1) / cell) * srcH))
      const x0 = Math.floor((i / cell) * srcW)
      const x1 = Math.max(x0 + 1, Math.floor(((i + 1) / cell) * srcW))
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          sum += heat[y * srcW + x]
          cnt++
        }
      }
      out[j * cell + i] = cnt ? sum / cnt : 0
    }
  }
  return out
}

export type InferFn = (img: HTMLCanvasElement) => Promise<{ className: string; probability: number }[]>

// 纯 JS 朴素遮挡敏感性热图（与 Grad-CAM 视觉等价的近似可解释性图）。
// pixels: 行优先 RGBA Uint8，w/h 同输入图。infer(accordingly) 用 canvas 元素。
export async function occlusionSensitivity(
  sourceCanvas: HTMLCanvasElement,
  infer: InferFn,
  targetClassIdx: number,
  opts: { size?: number; stride?: number; fill?: string } = {},
): Promise<Float32Array> {
  const size = opts.size ?? 24
  const stride = opts.stride ?? 12
  const fill = opts.fill ?? 'rgba(0,0,0,1)'
  const w = sourceCanvas.width
  const h = sourceCanvas.height
  const heat = new Float32Array(w * h)
  const count = new Float32Array(w * h)
  // 基线预测
  const base = await infer(sourceCanvas)
  const baseProb = base[targetClassIdx]?.probability ?? 0
  // 拷贝原图像素用作遮挡恢复
  const tmp = document.createElement('canvas')
  tmp.width = w
  tmp.height = h
  const tctx = tmp.getContext('2d')!
  tctx.drawImage(sourceCanvas, 0, 0)
  const orig = tctx.getImageData(0, 0, w, h)
  const ctx = sourceCanvas.getContext('2d')!
  ctx.fillStyle = fill
  for (let y = 0; y + size <= h; y += stride) {
    for (let x = 0; x + size <= w; x += stride) {
      // 遮挡
      ctx.fillRect(x, y, size, size)
      const pred = await infer(sourceCanvas)
      const drop = baseProb - (pred[targetClassIdx]?.probability ?? 0)
      // 恢复
      ctx.putImageData(orig, 0, 0)
      for (let dy = 0; dy < size; dy++) {
        for (let dx = 0; dx < size; dx++) {
          const idx = (y + dy) * w + (x + dx)
          heat[idx] += drop
          count[idx] += 1
        }
      }
    }
  }
  // 归一化 0~1
  let max = -Infinity
  let min = Infinity
  for (let i = 0; i < heat.length; i++) {
    if (count[i] > 0) {
      heat[i] = heat[i] / count[i]
      if (heat[i] > max) max = heat[i]
      if (heat[i] < min) min = heat[i]
    } else {
      heat[i] = 0
    }
  }
  const range = max - min || 1
  for (let i = 0; i < heat.length; i++) heat[i] = (heat[i] - min) / range
  return heat
}