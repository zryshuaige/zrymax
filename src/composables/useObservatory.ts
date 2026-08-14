import { computed, ref } from 'vue'
import { fetchWeather, weatherCodeToText } from '../services/apis'

/**
 * 全站共享的观测数据：实时时钟 + 杭州气象。
 * 单例拉取 —— App 信息带与首页观测台共用同一份数据，不重复请求。
 */
const now = ref(new Date())
let clockStarted = false

const temperature = ref<number | null>(null)
const weatherCode = ref<number | null>(null)
const windSpeed = ref<number | null>(null)
const weatherFailed = ref(false)
let weatherRequested = false

const startClock = () => {
  if (clockStarted) return
  clockStarted = true
  window.setInterval(() => {
    now.value = new Date()
  }, 1000)
}

const ensureWeather = () => {
  if (weatherRequested) return
  weatherRequested = true
  fetchWeather(30.2741, 120.1551)
    .then((w) => {
      temperature.value = Math.round(w.current.temperature_2m)
      weatherCode.value = w.current.weather_code
      windSpeed.value = Math.round(w.current.wind_speed_10m)
    })
    .catch(() => {
      weatherFailed.value = true
    })
}

const pad = (n: number) => String(n).padStart(2, '0')

export function useObservatory() {
  startClock()
  ensureWeather()

  const clockText = computed(() => {
    const d = now.value
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  })

  /* 信息带专用：HH:MM（秒数在窄条里会挤压相邻 cell） */
  const clockShort = computed(() => {
    const d = now.value
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`
  })

  const dateLine = computed(() => {
    const d = now.value
    const weekdays = ['日', '一', '二', '三', '四', '五', '六']
    return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日 · 星期${weekdays[d.getDay()]}`
  })

  const weatherText = computed(() => {
    if (weatherFailed.value) return '气象暂缺'
    if (weatherCode.value === null || temperature.value === null) return '读取中'
    return `${weatherCodeToText(weatherCode.value)} ${temperature.value}°C`
  })

  const windText = computed(() => {
    if (weatherFailed.value) return ''
    if (windSpeed.value === null) return ''
    return `风速 ${windSpeed.value} km/h`
  })

  const greeting = computed(() => {
    const h = now.value.getHours()
    if (h < 6) return '夜深了，灵感还在线'
    if (h < 12) return '早上好，今天继续发光'
    if (h < 18) return '下午好，保持专注节奏'
    return '晚上好，适合打磨细节'
  })

  return {
    now,
    clockText,
    clockShort,
    dateLine,
    greeting,
    temperature,
    weatherCode,
    weatherText,
    windText,
    weatherFailed,
  }
}
