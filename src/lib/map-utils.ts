import { getKanbanColumnColor } from '@/lib/kanban-columns'

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

/**
 * A cor de uma etapa vem da definição do board. Antes havia um mapa de ids
 * antigos embutido aqui (duplicado em duas funções), que saía de sincronia a
 * cada mudança de fluxo.
 */
export function getStageColor(stageName: string | null | undefined): string {
  return getKanbanColumnColor(stageName) || FALLBACK_COLOR
}

/**
 * Cor por status para o mapa. Etapas conhecidas do board usam a cor oficial;
 * valores desconhecidos (etapas antigas ainda no histórico, por exemplo) caem
 * na paleta genérica, sem repetir uma cor já usada.
 */
export function buildStatusColorMap(statusNames: string[]): Record<string, string> {
  const unique = [...new Set(statusNames.filter(Boolean))].sort()
  const map: Record<string, string> = {}
  const usedColors = new Set<string>()

  for (const name of unique) {
    const known = getKanbanColumnColor(name)
    if (known) {
      map[name] = known
      usedColors.add(known)
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
