export interface CardPalette {
  tint: string
  tintSoft: string
  border: string
  accent: string
}

const cardPalettes: CardPalette[] = [
  { tint: 'rgba(93, 114, 255, 0.2)', tintSoft: 'rgba(93, 114, 255, 0.08)', border: 'rgba(93, 114, 255, 0.36)', accent: '#5d72ff' },
  { tint: 'rgba(255, 127, 179, 0.2)', tintSoft: 'rgba(255, 127, 179, 0.08)', border: 'rgba(255, 127, 179, 0.34)', accent: '#ff5ea9' },
  { tint: 'rgba(72, 198, 162, 0.22)', tintSoft: 'rgba(72, 198, 162, 0.08)', border: 'rgba(72, 198, 162, 0.34)', accent: '#2fb98f' },
  { tint: 'rgba(255, 166, 87, 0.22)', tintSoft: 'rgba(255, 166, 87, 0.1)', border: 'rgba(255, 166, 87, 0.35)', accent: '#ff9f43' },
  { tint: 'rgba(126, 104, 255, 0.2)', tintSoft: 'rgba(126, 104, 255, 0.08)', border: 'rgba(126, 104, 255, 0.34)', accent: '#7457ff' },
  { tint: 'rgba(40, 175, 255, 0.2)', tintSoft: 'rgba(40, 175, 255, 0.08)', border: 'rgba(40, 175, 255, 0.34)', accent: '#279dff' },
]

export const getCardColorStyle = (index: number): Record<string, string> => {
  const palette = cardPalettes[index % cardPalettes.length]
  return {
    '--card-tint': palette.tint,
    '--card-tint-soft': palette.tintSoft,
    '--card-border-tint': palette.border,
    '--card-accent': palette.accent,
  }
}
