// 天气场景到色调滤镜（HSL 偏移）映射。仅做色调微调，不再驱动 shader。
export interface WeatherHue {
  hue: number // hue-rotate(deg)
  saturate: number // saturate(%)
  brightness: number // brightness(系数)
}

export const sceneToHue: Record<string, WeatherHue> = {
  clear: { hue: 8, saturate: 110, brightness: 0.78 },
  cloudy: { hue: -4, saturate: 92, brightness: 0.72 },
  rain: { hue: -14, saturate: 96, brightness: 0.66 },
  snow: { hue: -6, saturate: 84, brightness: 0.82 },
  fog: { hue: 0, saturate: 80, brightness: 0.7 },
  storm: { hue: -26, saturate: 120, brightness: 0.6 },
}

export function hueFilter(s: WeatherHue): string {
  return `hue-rotate(${s.hue}deg) saturate(${s.saturate}%) brightness(${s.brightness})`
}