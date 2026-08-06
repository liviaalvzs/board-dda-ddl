import { KANBAN_COLUMNS } from '@/lib/kanban-columns'
import { parseDateValue } from '@/lib/process-dates-helpers'

/**
 * Datas de entrada em cada etapa, guardadas em `land_metadata.stage_dates`
 * como { "<id-da-etapa>": "ISO date" }.
 *
 * É a fonte única da contagem de dias — card do board e dashboard leem daqui.
 * O campo é carimbado automaticamente ao mover o card e pode ser corrigido à
 * mão na tela da terra.
 */
export type StageDates = Record<string, string>

export function parseStageDates(value: unknown): StageDates {
  if (!value) return {}
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return parsed && typeof parsed === 'object' ? (parsed as StageDates) : {}
    } catch {
      return {}
    }
  }
  if (typeof value === 'object') return value as StageDates
  return {}
}

/** Índice da etapa na ordem do board; -1 se não for uma etapa conhecida. */
export function getStageIndex(stageId: string | null | undefined): number {
  if (!stageId) return -1
  return KANBAN_COLUMNS.findIndex((c) => c.id === stageId)
}

/**
 * Etapas liberadas para edição: da primeira até a atual, inclusive.
 * Etapas futuras não são editáveis — a terra ainda não passou por elas.
 */
export function getEditableStages(currentStageId: string | null | undefined) {
  const index = getStageIndex(currentStageId)
  if (index === -1) return []
  return KANBAN_COLUMNS.slice(0, index + 1)
}

/** Momento em que a terra entrou na etapa atual, se registrado. */
export function getCurrentStageEntry(
  stageDates: unknown,
  currentStageId: string | null | undefined,
): Date | undefined {
  if (!currentStageId) return undefined
  return parseDateValue(parseStageDates(stageDates)[currentStageId])
}

export interface StageSpan {
  stageId: string
  start: Date
  end: Date | null
  days: number
}

/**
 * Períodos em cada etapa, derivados das datas informadas.
 *
 * Ordena por data (e não pela posição no board) porque uma terra pode pular
 * etapas ou voltar atrás; o que delimita um período é a entrada seguinte.
 */
export function buildStageSpans(stageDates: unknown, now: Date = new Date()): StageSpan[] {
  const parsed = parseStageDates(stageDates)

  const entries = Object.entries(parsed)
    .map(([stageId, raw]) => ({ stageId, date: parseDateValue(raw) }))
    .filter((entry): entry is { stageId: string; date: Date } => !!entry.date)
    .sort((a, b) => a.date.getTime() - b.date.getTime())

  return entries.map((entry, i) => {
    const end = i < entries.length - 1 ? entries[i + 1].date : null
    const reference = end ?? now
    return {
      stageId: entry.stageId,
      start: entry.date,
      end,
      days: Math.max(0, Math.floor((reference.getTime() - entry.date.getTime()) / 86400000)),
    }
  })
}
