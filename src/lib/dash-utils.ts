import { differenceInDays } from 'date-fns'
import { parseDateValue } from '@/lib/process-dates-helpers'

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
