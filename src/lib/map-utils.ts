export const COLOR_PALETTE: string[] = [
  '#2563eb',
  '#16a34a',
  '#9333ea',
  '#ea580c',
  '#0891b2',
  '#db2777',
  '#ca8a04',
  '#4f46e5',
  '#dc2626',
  '#059669',
  '#7c3aed',
  '#d97706',
  '#0d9488',
  '#be185d',
  '#4338ca',
  '#65a30d',
]

export const FALLBACK_COLOR = '#999999'

export function getStageColor(stageName: string | null | undefined): string {
  if (!stageName) return FALLBACK_COLOR
  const stageMap: Record<string, number> = {
    'aguardando-doc': 0,
    prospeccao: 1,
    'analise-tecnica': 2,
    'proposta-assinada': 3,
    'dda-analise': 4,
    aprovado: 5,
    reprovado: 6,
    'emissao-certidoes': 7,
  }
  const index = stageMap[stageName]
  if (index !== undefined && index < COLOR_PALETTE.length) {
    return COLOR_PALETTE[index]
  }
  return FALLBACK_COLOR
}

export function buildStatusColorMap(statusNames: string[]): Record<string, string> {
  const unique = [...new Set(statusNames.filter(Boolean))].sort()
  const map: Record<string, string> = {}
  const usedColors = new Set<string>()

  const stageMap: Record<string, number> = {
    'aguardando-doc': 0,
    prospeccao: 1,
    'analise-tecnica': 2,
    'proposta-assinada': 3,
    'dda-analise': 4,
    aprovado: 5,
    reprovado: 6,
    'emissao-certidoes': 7,
  }

  for (const name of unique) {
    const knownIndex = stageMap[name]
    if (knownIndex !== undefined && knownIndex < COLOR_PALETTE.length) {
      map[name] = COLOR_PALETTE[knownIndex]
      usedColors.add(COLOR_PALETTE[knownIndex])
    }
  }

  let paletteIdx = 0
  for (const name of unique) {
    if (map[name]) continue
    while (paletteIdx < COLOR_PALETTE.length && usedColors.has(COLOR_PALETTE[paletteIdx])) {
      paletteIdx++
    }
    const color = COLOR_PALETTE[paletteIdx % COLOR_PALETTE.length]
    map[name] = color
    usedColors.add(color)
    paletteIdx++
  }

  return map
}

export function getRiskColor(riskLevel: string | null | undefined): string {
  switch (riskLevel) {
    case 'high':
      return '#ef4444'
    case 'medium':
      return '#eab308'
    case 'low':
      return '#22c55e'
    default:
      return FALLBACK_COLOR
  }
}

export function calculateCentroid(geoJSON: any): [number, number] {
  if (!geoJSON) return [-14.235, -51.9253]

  let geom = geoJSON
  if (geoJSON.type === 'FeatureCollection') {
    geom = geoJSON.features?.[0]?.geometry || geoJSON.features?.[0] || geoJSON
  } else if (geoJSON.type === 'Feature') {
    geom = geoJSON.geometry || geoJSON
  }

  let rings: number[][][] = []
  if (geom.type === 'Polygon') {
    rings = [geom.coordinates?.[0] || []]
  } else if (geom.type === 'MultiPolygon') {
    for (const poly of geom.coordinates || []) {
      if (poly[0]) rings.push(poly[0])
    }
  } else if (Array.isArray(geom) && Array.isArray(geom[0])) {
    if (Array.isArray(geom[0][0]) && Array.isArray(geom[0][0][0])) {
      for (const poly of geom) {
        if (poly[0]) rings.push(poly[0])
      }
    } else {
      rings = [geom[0] || []]
    }
  }

  if (rings.length === 0 || rings[0].length === 0) return [-14.235, -51.9253]

  let bestRing = rings[0]
  let bestArea = 0
  for (const ring of rings) {
    let a = 0
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      a += ring[i][0] * ring[j][1] - ring[j][0] * ring[i][1]
    }
    a = Math.abs(a * 0.5)
    if (a > bestArea) {
      bestArea = a
      bestRing = ring
    }
  }

  const ring = bestRing
  let area = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    area += ring[i][0] * ring[j][1] - ring[j][0] * ring[i][1]
  }
  area *= 0.5

  if (Math.abs(area) < 1e-10) {
    let latSum = 0
    let lngSum = 0
    for (const [lng, lat] of ring) {
      lngSum += lng
      latSum += lat
    }
    return [latSum / ring.length, lngSum / ring.length]
  }

  let cx = 0
  let cy = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const cross = ring[i][0] * ring[j][1] - ring[j][0] * ring[i][1]
    cx += (ring[i][0] + ring[j][0]) * cross
    cy += (ring[i][1] + ring[j][1]) * cross
  }

  return [cy / (6 * area), cx / (6 * area)]
}

export function parseShapeWgs84(shapeWgs84: any): any {
  if (!shapeWgs84) return null
  if (typeof shapeWgs84 === 'object') return shapeWgs84
  if (typeof shapeWgs84 === 'string') {
    try {
      return JSON.parse(shapeWgs84)
    } catch {
      return null
    }
  }
  return null
}
