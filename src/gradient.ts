export interface ParsedGradient {
  type: 'linear' | 'radial' | 'conic'
  angle: number
  stops: { position: number, color: string }[]
}

// Parses the gradients this picker produces (and simple hand-written ones).
// Direction keywords like "to right" fall back to 90deg.
export const parseGradient = (value: string): ParsedGradient | null => {
  const m = value.trim().match(/^(linear|radial|conic)-gradient\((.*)\)$/s)
  if (!m) return null

  // Split on commas that are not inside rgba(...) / hsl(...)
  const parts = m[2].split(/,(?![^(]*\))/).map(p => p.trim())
  let angle = 90
  const deg = parts[0].match(/(-?\d+(?:\.\d+)?)deg/)
  if (deg || /^(to |from |at |circle|ellipse)/.test(parts[0])) {
    parts.shift()
    if (deg) angle = parseFloat(deg[1])
  }
  if (parts.length < 2) return null

  const stops = parts.map((p, i) => {
    const sm = p.match(/^(.*?)\s+(-?\d+(?:\.\d+)?)%$/)
    return sm
      ? { color: sm[1], position: parseFloat(sm[2]) }
      : { color: p, position: (i / (parts.length - 1)) * 100 }
  })

  return { type: m[1] as ParsedGradient['type'], angle, stops }
}
