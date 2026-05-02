export interface HitokotoResponse {
  hitokoto: string
  from: string
  from_who: string | null
}

export interface OpenMeteoResponse {
  current: {
    temperature_2m: number
    weather_code: number
    wind_speed_10m: number
  }
}

export const fetchHitokoto = async (): Promise<HitokotoResponse> => {
  const response = await fetch('https://v1.hitokoto.cn')
  if (!response.ok) {
    throw new Error('获取一言失败')
  }
  return (await response.json()) as HitokotoResponse
}

export const fetchWeather = async (
  latitude: number,
  longitude: number,
): Promise<OpenMeteoResponse> => {
  const endpoint =
    'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,wind_speed_10m&timezone=auto`

  const response = await fetch(endpoint)
  if (!response.ok) {
    throw new Error('获取天气失败')
  }
  return (await response.json()) as OpenMeteoResponse
}

export const weatherCodeToText = (code: number): string => {
  if (code === 0) return '晴朗'
  if (code === 1 || code === 2) return '少云'
  if (code === 3) return '阴天'
  if (code === 45 || code === 48) return '有雾'
  if (code >= 51 && code <= 57) return '毛毛雨'
  if (code >= 61 && code <= 67) return '降雨'
  if (code >= 71 && code <= 77) return '降雪'
  if (code >= 80 && code <= 82) return '阵雨'
  if (code >= 95) return '雷暴'
  return '天气多变'
}
