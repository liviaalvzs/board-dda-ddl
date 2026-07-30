import { differenceInDays, parseISO } from 'date-fns'

export interface StageDuration {
  stageId: string
  stageLabel: string
  avgDuration: number
  eligibleCount: number
}

export interface StageDelay {
  stageId: string
  stageLabel: string
  avgDelay: number
  eligibleCount: number
  hasDelayData: boolean
}

export interface LandDelayDetail {
  landId: string
  landName: string
  clusterSerial: string
  delayDays: number
  estimatedDate: string
  actualDate: string
}

function parseDate(value: any): Date | null {
  if (!value) return null
  try {
    const parsed = parseISO(typeof value === 'string' ? value : new Date(value).toISOString())
    return isNaN(parsed.getTime()) ? null : parsed
  } catch {
    return null
  }
}

function daysBetween(start: any, end: any): number | null {
  const s = parseDate(start)
  const e = parseDate(end)
  if (!s || !e) return null
  return differenceInDays(e, s)
}

const STAGE_CONFIG = [
  {
    stageId: 'preliminar',
    stageLabel: 'DD Preliminar',
    startField: 'data_pedido_inicio_ddl',
    endField: 'data_recebimento_preliminar_ddm',
  },
  {
    stageId: 'conclusiva',
    stageLabel: 'DD Conclusiva',
    startField: 'data_estimada_recebimento_ddl_conclusiva',
    endField: 'data_recebimento_dd_conclusiva',
  },
  {
    stageId: 'dda',
    stageLabel: 'DDA',
    startField: 'data_pedido_dda',
    endField: 'data_recebimento_dda',
  },
]

export function calculateStageDurations(records: any[]): StageDuration[] {
  return STAGE_CONFIG.map((stage) => {
    const durations: number[] = []
    for (const record of records) {
      const days = daysBetween(record[stage.startField], record[stage.endField])
      if (days !== null && days >= 0) durations.push(days)
    }
    const avg =
      durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0
    return {
      stageId: stage.stageId,
      stageLabel: stage.stageLabel,
      avgDuration: avg,
      eligibleCount: durations.length,
    }
  })
}

export function calculateStageDelays(records: any[]): StageDelay[] {
  const conclusivaDelays: number[] = []
  for (const record of records) {
    const delay = daysBetween(
      record['data_estimada_recebimento_ddl_conclusiva'],
      record['data_recebimento_dd_conclusiva'],
    )
    if (delay !== null) conclusivaDelays.push(delay)
  }
  const avgConclusiva =
    conclusivaDelays.length > 0
      ? Math.round(conclusivaDelays.reduce((a, b) => a + b, 0) / conclusivaDelays.length)
      : 0
  return [
    {
      stageId: 'preliminar',
      stageLabel: 'DD Preliminar',
      avgDelay: 0,
      eligibleCount: 0,
      hasDelayData: false,
    },
    {
      stageId: 'conclusiva',
      stageLabel: 'DD Conclusiva',
      avgDelay: avgConclusiva,
      eligibleCount: conclusivaDelays.length,
      hasDelayData: true,
    },
    { stageId: 'dda', stageLabel: 'DDA', avgDelay: 0, eligibleCount: 0, hasDelayData: false },
  ]
}

export function calculateLandDelays(records: any[]): LandDelayDetail[] {
  const details: LandDelayDetail[] = []
  for (const record of records) {
    const delay = daysBetween(
      record['data_estimada_recebimento_ddl_conclusiva'],
      record['data_recebimento_dd_conclusiva'],
    )
    if (delay !== null) {
      details.push({
        landId: record.id,
        landName: record.name || record.external_id || 'Sem nome',
        clusterSerial: record.cluster_serial || '',
        delayDays: delay,
        estimatedDate: record['data_estimada_recebimento_ddl_conclusiva'] || '',
        actualDate: record['data_recebimento_dd_conclusiva'] || '',
      })
    }
  }
  return details.sort((a, b) => b.delayDays - a.delayDays)
}

export function getDelayBadgeClass(days: number): string {
  if (days <= 0) return 'bg-green-100 text-green-700'
  if (days <= 7) return 'bg-amber-100 text-amber-700'
  return 'bg-red-100 text-red-700'
}
