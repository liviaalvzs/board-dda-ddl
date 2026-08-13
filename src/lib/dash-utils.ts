import { differenceInDays } from 'date-fns'
import { parseDateValue } from '@/lib/process-dates-helpers'
import { getStatusLabel } from '@/lib/status-mapping'
import { buildStageSpans, getCurrentStageEntry } from '@/lib/stage-dates-helpers'

/**
 * `kind` distingue o que a diferença entre as duas datas realmente mede:
 *
 * - 'deviation' — a data planejada é uma *estimativa de conclusão*, então a
 *   diferença é desvio do previsto: negativo = adiantado, positivo = atrasado.
 * - 'leadtime'  — a data planejada é a do *pedido*, não uma expectativa. A
 *   diferença é o tempo de resposta do fornecedor, e é sempre positiva. Tratar
 *   isso como "atraso" (como era feito antes) faz um prazo normal de 30 dias
 *   parecer um atraso de 30 dias.
 */
export type DelayStageKind = 'deviation' | 'leadtime'

export interface DelayStageConfig {
  label: string
  plannedKey: string
  actualKey: string
  plannedLabel: string
  actualLabel: string
  kind: DelayStageKind
}

export const DELAY_STAGES: DelayStageConfig[] = [
  {
    label: 'Diligência (DDL)',
    plannedKey: 'data_estimada_ddl',
    actualKey: 'data_recebimento_ddl',
    plannedLabel: 'Recebimento estimado',
    actualLabel: 'Recebimento efetivo',
    kind: 'deviation',
  },
  {
    // A coluna se chama data_pedido_dda por legado, mas o campo passou a ser a
    // data estimada de recebimento — por isso a diferença virou desvio de prazo.
    label: 'DDA',
    plannedKey: 'data_pedido_dda',
    actualKey: 'data_recebimento_dda',
    plannedLabel: 'Recebimento estimado',
    actualLabel: 'Recebimento efetivo',
    kind: 'deviation',
  },
]

export interface StageDelayData {
  label: string
  kind: DelayStageKind
  plannedLabel: string
  actualLabel: string
  count: number
  averageDelay: number
  medianDelay: number
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
    const sorted = [...delays].sort((a, b) => a - b)
    const median = sorted.length
      ? sorted.length % 2 === 1
        ? sorted[(sorted.length - 1) / 2]
        : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : 0
    return {
      label: stage.label,
      kind: stage.kind,
      plannedLabel: stage.plannedLabel,
      actualLabel: stage.actualLabel,
      count: valid.length,
      averageDelay: Math.round(avg * 10) / 10,
      medianDelay: Math.round(median * 10) / 10,
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
  closedCount: number
  openCount: number
}

/**
 * Tempo médio por etapa, calculado a partir de `land_metadata.stage_dates` —
 * as datas de entrada em cada etapa, carimbadas ao mover o card e corrigíveis
 * na tela da terra.
 *
 * É a mesma fonte que o card do board usa, então o que se lê aqui e lá nunca
 * diverge. Antes isso era reconstruído de history_logs, que não é editável.
 */
export function calculateStageAverageTime(lands: unknown): StageAverageTimeData[] {
  const landArray = toLandArray(lands)
  const now = new Date()

  const closed = new Map<string, number[]>()
  const open = new Map<string, number[]>()

  const push = (map: Map<string, number[]>, status: string, days: number) => {
    if (!status || days < 0) return
    if (!map.has(status)) map.set(status, [])
    map.get(status)!.push(days)
  }

  for (const land of landArray) {
    const spans = buildStageSpans(land.stage_dates, now)
    for (const span of spans) {
      push(span.end ? closed : open, span.stageId, span.days)
    }
  }

  const statuses = new Set<string>([...closed.keys(), ...open.keys()])
  const result: StageAverageTimeData[] = []

  for (const status of statuses) {
    const closedDays = closed.get(status) || []
    const openDays = open.get(status) || []
    const all = closedDays.concat(openDays)
    if (all.length === 0) continue
    const avg = all.reduce((s, d) => s + d, 0) / all.length
    result.push({
      status,
      label: getStatusLabel(status),
      averageDays: Math.round(avg * 10) / 10,
      count: all.length,
      closedCount: closedDays.length,
      openCount: openDays.length,
    })
  }

  return result.sort((a, b) => b.averageDays - a.averageDays)
}

export interface StageLandSpanItem {
  externalId: string
  name: string
  clusterSerial: string
  days: number
  start: Date
  end: Date | null
  isOpen: boolean
}

/**
 * Detalhamento por trás da média de uma etapa: quem passou por ela e por quanto
 * tempo.
 *
 * Uma entrada por *passagem*, não por terra — é assim que
 * `calculateStageAverageTime` calcula, somando todos os períodos. Uma terra que
 * voltou para a etapa aparece duas vezes, de propósito: só assim a média destas
 * linhas reproduz exatamente o número mostrado no gráfico.
 *
 * Os mesmos filtros da média (dias >= 0) valem aqui, senão a conta não fecha.
 */
export function calculateStageLandSpans(lands: unknown, stageId: string): StageLandSpanItem[] {
  const landArray = toLandArray(lands)
  const now = new Date()
  const items: StageLandSpanItem[] = []

  for (const land of landArray) {
    for (const span of buildStageSpans(land.stage_dates, now)) {
      if (span.stageId !== stageId || span.days < 0) continue
      items.push({
        externalId: land.external_id || land.id || '',
        name: land.name || land.external_id || 'Sem nome',
        clusterSerial: land.cluster_serial || '',
        days: span.days,
        start: span.start,
        end: span.end,
        isOpen: !span.end,
      })
    }
  }

  return items.sort((a, b) => b.days - a.days)
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

    // Terras sem data de entrada informada ficam de fora: exibi-las com "0 dias"
    // ou com a data de criação inventaria um número que ninguém informou.
    const referenceDate = getCurrentStageEntry(land.stage_dates, status)
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
