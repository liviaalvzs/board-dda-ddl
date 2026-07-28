export const COLOR_PALETTE: string[] = [
  '#2563eb',
  '#16a34a',
  '#9333ea',
  '#ea580c',
  '#0891b2',
  '#db2777',
  '#ca8a04',
  '#4f46e5',
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

export function calculateCentroid(coordinates: any): [number, number] {
  if (!coordinates || !Array.isArray(coordinates)) return [-14.235, -51.9253]

  let allCoords: number[][] = []

  if (coordinates.type === 'Polygon') {
    allCoords = coordinates.coordinates[0] || []
  } else if (coordinates.type === 'MultiPolygon') {
    for (const polygon of coordinates.coordinates) {
      if (polygon[0]) {
        allCoords = allCoords.concat(polygon[0])
      }
    }
  } else if (Array.isArray(coordinates[0]) && Array.isArray(coordinates[0][0])) {
    if (Array.isArray(coordinates[0][0][0])) {
      for (const polygon of coordinates) {
        if (polygon[0]) {
          allCoords = allCoords.concat(polygon[0])
        }
      }
    } else {
      allCoords = coordinates[0] || []
    }
  } else if (Array.isArray(coordinates[0]) && typeof coordinates[0][0] === 'number') {
    allCoords = coordinates
  }

  if (allCoords.length === 0) return [-14.235, -51.9253]

  let latSum = 0
  let lngSum = 0
  for (const coord of allCoords) {
    lngSum += coord[0]
    latSum += coord[1]
  }

  return [latSum / allCoords.length, lngSum / allCoords.length]
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
