import { differenceInDays } from 'date-fns'
import { parseDateValue } from '@/lib/process-dates-helpers'
import { getStatusLabel } from '@/lib/status-mapping'

export interface DelayStageConfig {
  label: string
  plannedKey: string
  actualKey: string
}

export const DELAY_STAGES: DelayStageConfig[] = [
  {
    label: 'DD Preliminar',
    plannedKey: 'data_pedido_inicio_ddl',
    actualKey: 'data_recebimento_preliminar_ddm',
  },
  {
    label: 'DD Conclusiva',
    plannedKey: 'data_estimada_recebimento_ddl_conclusiva',
    actualKey: 'data_recebimento_dd_conclusiva',
  },
  { label: 'DDA', plannedKey: 'data_pedido_dda', actualKey: 'data_recebimento_dda' },
]

export interface StageDelayData {
  label: string
  count: number
  averageDelay: number
  onTimeCount: number
  delayedCount: number
}

export interface StageDurationData {
  label: string
  count: number
  averageDuration: number
}

function toLandArray(lands: unknown): Record<string, any>[] {
  if (Array.isArray(lands)) return lands
  if (lands instanceof Map) return Array.from(lands.values())
  if (lands && typeof lands === 'object') return Object.values(lands)
  return []
}

export function calculateStageDelays(lands: unknown): StageDelayData[] {
  const landArray = toLandArray(lands)
  return DELAY_STAGES.map((stage) => {
    const valid = landArray.filter(
      (l) => parseDateValue(l[stage.plannedKey]) && parseDateValue(l[stage.actualKey]),
    )
    const delays = valid.map((l) => {
      const planned = parseDateValue(l[stage.plannedKey])!
      const actual = parseDateValue(l[stage.actualKey])!
      return differenceInDays(actual, planned)
    })
    const avg = delays.length ? delays.reduce((s, d) => s + d, 0) / delays.length : 0
    return {
      label: stage.label,
      count: valid.length,
      averageDelay: Math.round(avg * 10) / 10,
      onTimeCount: delays.filter((d) => d <= 0).length,
      delayedCount: delays.filter((d) => d > 0).length,
    }
  })
}

export interface StatusDistributionData {
  label: string
  status: string
  count: number
}

export function calculateStatusDistribution(lands: unknown): StatusDistributionData[] {
  const landArray = toLandArray(lands)
  const counts = new Map<string, number>()
  let noStatusCount = 0

  for (const land of landArray) {
    const status = (land.status || '').trim()
    if (!status) {
      noStatusCount++
      continue
    }
    counts.set(status, (counts.get(status) || 0) + 1)
  }

  const result: StatusDistributionData[] = []
  for (const [status, count] of counts) {
    result.push({ status, label: getStatusLabel(status), count })
  }
  if (noStatusCount > 0) {
    result.push({ status: '', label: 'Sem status', count: noStatusCount })
  }

  return result.sort((a, b) => b.count - a.count)
}

export function calculateStageDurations(lands: unknown): StageDurationData[] {
  const landArray = toLandArray(lands)
  return DELAY_STAGES.map((stage) => {
    const valid = landArray.filter(
      (l) =>
        parseDateValue(l['data_assinatura_carta_proposta']) && parseDateValue(l[stage.actualKey]),
    )
    const durations = valid.map((l) => {
      const start = parseDateValue(l['data_assinatura_carta_proposta'])!
      const end = parseDateValue(l[stage.actualKey])!
      return differenceInDays(end, start)
    })
    const avg = durations.length ? durations.reduce((s, d) => s + d, 0) / durations.length : 0
    return {
      label: stage.label,
      count: valid.length,
      averageDuration: Math.round(avg * 10) / 10,
    }
  })
}

export interface StageAverageTimeData {
  label: string
  status: string
  averageDays: number
  count: number
}

export function calculateStageAverageTime(lands: unknown): StageAverageTimeData[] {
  const landArray = toLandArray(lands)
  const now = new Date()

  const groups = new Map<string, number[]>()

  for (const land of landArray) {
    const status = (land.status || '').trim()
    if (!status) continue

    const updated = parseDateValue(land.updated)
    const created = parseDateValue(land.created)
    const referenceDate = updated || created
    if (!referenceDate) continue

    const days = differenceInDays(now, referenceDate)
    if (days < 0) continue

    if (!groups.has(status)) groups.set(status, [])
    groups.get(status)!.push(days)
  }

  const result: StageAverageTimeData[] = []
  for (const [status, days] of groups) {
    const avg = days.reduce((s, d) => s + d, 0) / days.length
    result.push({
      status,
      label: getStatusLabel(status),
      averageDays: Math.round(avg * 10) / 10,
      count: days.length,
    })
  }

  return result.sort((a, b) => b.averageDays - a.averageDays)
}

export interface LandStageRankingItem {
  externalId: string
  name: string
  clusterSerial: string
  status: string
  statusLabel: string
  daysInStage: number
}

export function calculateLandStageRanking(
  lands: unknown,
  limit: number = 10,
): LandStageRankingItem[] {
  const landArray = toLandArray(lands)
  const now = new Date()

  const items: LandStageRankingItem[] = []

  for (const land of landArray) {
    const status = (land.status || '').trim()
    if (!status) continue

    const updated = parseDateValue(land.updated)
    const created = parseDateValue(land.created)
    const referenceDate = updated || created
    if (!referenceDate) continue

    const days = differenceInDays(now, referenceDate)
    if (days < 0) continue

    items.push({
      externalId: land.external_id || land.id || '',
      name: land.name || land.external_id || 'Sem nome',
      clusterSerial: land.cluster_serial || '',
      status,
      statusLabel: getStatusLabel(status),
      daysInStage: days,
    })
  }

  items.sort((a, b) => b.daysInStage - a.daysInStage)
  return items.slice(0, limit)
}
