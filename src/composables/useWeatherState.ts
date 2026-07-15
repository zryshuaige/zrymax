import { reactive } from 'vue'

export type WeatherScene = 'clear' | 'cloudy' | 'rain' | 'snow' | 'fog' | 'storm'

// 天气场景 -> 着色器数值
export const sceneToWeatherUniform: Record<WeatherScene, number> = {
  clear: 0,
  cloudy: 1,
  rain: 2,
  snow: 3,
  fog: 4,
  storm: 5,
}

export const weatherState = reactive({
  scene: 'clear' as WeatherScene,
  dayNight: 0 as number, // 0 白天 / 1 夜晚
  scrollProgress: 0 as number, // 整页滚动归一化进度 0~1
})

export function setWeatherScene(scene: WeatherScene) {
  weatherState.scene = scene
}

export function setDayNight(value: number) {
  weatherState.dayNight = value
}

export function setScrollProgress(value: number) {
  weatherState.scrollProgress = value
}

export const mapWeatherCodeToScene = (code: number): WeatherScene => {
  if (code === 45 || code === 48) return 'fog'
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain'
  if (code >= 71 && code <= 77) return 'snow'
  if (code >= 95) return 'storm'
  if (code >= 1 && code <= 3) return 'cloudy'
  return 'clear'
}
