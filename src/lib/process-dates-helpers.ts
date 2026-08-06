import { differenceInDays, parseISO } from 'date-fns'

export interface DateFieldConfig {
  key: string
  param: string
  label: string
}

export interface MilestoneConfig {
  title: string
  planned: DateFieldConfig
  actual: DateFieldConfig
}

export const MARCO_INICIAL: DateFieldConfig = {
  key: 'data_assinatura_carta_proposta',
  param: 'dataAssinaturaCartaProposta',
  label: 'Assinatura da carta proposta',
}

export const MILESTONES: MilestoneConfig[] = [
  {
    title: 'DDL preliminar',
    planned: { key: 'data_pedido_inicio_ddl', param: 'dataPedidoInicioDdl', label: 'Previsto' },
    actual: {
      key: 'data_recebimento_preliminar_ddm',
      param: 'dataRecebimentoPreliminarDdm',
      label: 'Realizado',
    },
  },
  {
    title: 'DDL conclusiva',
    planned: {
      key: 'data_estimada_recebimento_ddl_conclusiva',
      param: 'dataEstimadaRecebimentoDdlConclusiva',
      label: 'Previsto',
    },
    actual: {
      key: 'data_recebimento_dd_conclusiva',
      param: 'dataRecebimentoDdConclusiva',
      label: 'Realizado',
    },
  },
]

/**
 * Diligência Ambiental. Fica fora de MILESTONES porque tem bloco próprio na
 * tela da terra, com prestador e sinalização de prazo.
 *
 * Nota sobre o nome da coluna: `data_pedido_dda` é hoje a *data estimada* de
 * recebimento, não a data do pedido. O nome no banco é legado; o rótulo aqui
 * reflete o que o campo realmente significa.
 */
export const DDA_MILESTONE: MilestoneConfig = {
  title: 'Diligência Ambiental (DDA)',
  planned: { key: 'data_pedido_dda', param: 'dataPedidoDda', label: 'Data estimada' },
  actual: {
    key: 'data_recebimento_dda',
    param: 'dataRecebimentoDda',
    label: 'Data de recebimento',
  },
}

export interface DdaFlag {
  text: string
  className: string
  badgeClassName: string
}

/** Dias até a data estimada. Negativo = já venceu. Compara por dia, não por hora. */
function daysUntilPlanned(planned: Date): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const plannedDate = new Date(planned)
  plannedDate.setHours(0, 0, 0, 0)
  return differenceInDays(plannedDate, today)
}

/** DDA solicitada = existe data estimada de recebimento. */
export function isDdaRequested(planned: Date | undefined): boolean {
  return !!planned
}

/** DDA atrasada = tinha data estimada, venceu e ainda não foi recebida. */
export function isDdaOverdue(planned: Date | undefined, actual: Date | undefined): boolean {
  if (actual || !planned) return false
  return daysUntilPlanned(planned) < 0
}

/**
 * Sinalização de DDA usada no card do board e no bloco da terra.
 * Sem data estimada, a DDA é considerada não solicitada.
 */
export function calculateDdaFlag(planned: Date | undefined, actual: Date | undefined): DdaFlag {
  if (actual) {
    return {
      text: 'DDA recebida',
      className: 'bg-emerald-100 text-emerald-800',
      badgeClassName: 'bg-emerald-100 text-emerald-700',
    }
  }

  if (!planned) {
    return {
      text: 'DDA não solicitada',
      className: 'bg-slate-100 text-slate-700',
      badgeClassName: 'bg-slate-100 text-slate-600',
    }
  }

  const diff = daysUntilPlanned(planned)

  if (diff > 0) {
    return {
      text: `DDA em ${diff} ${diff === 1 ? 'dia' : 'dias'}`,
      className: diff <= 3 ? 'bg-amber-100 text-amber-800' : 'bg-sky-100 text-sky-800',
      badgeClassName: diff <= 3 ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700',
    }
  }

  if (diff === 0) {
    return {
      text: 'DDA vence hoje',
      className: 'bg-amber-100 text-amber-800',
      badgeClassName: 'bg-amber-100 text-amber-700',
    }
  }

  const overdue = Math.abs(diff)
  return {
    text: `DDA atrasada ${overdue} ${overdue === 1 ? 'dia' : 'dias'}`,
    className: 'bg-rose-100 text-rose-800',
    badgeClassName: 'bg-rose-100 text-rose-700',
  }
}

export interface ChipStatus {
  text: string
  className: string
}

export function parseDateValue(value: any): Date | undefined {
  if (!value) return undefined
  try {
    const parsed = parseISO(typeof value === 'string' ? value : new Date(value).toISOString())
    return isNaN(parsed.getTime()) ? undefined : parsed
  } catch {
    return undefined
  }
}

export function calculateChipStatus(
  planned: Date | undefined,
  actual: Date | undefined,
): ChipStatus | null {
  if (!planned && !actual) return null
  if (!planned && actual) return null

  if (actual && planned) {
    const diff = differenceInDays(actual, planned)
    if (diff <= 0) {
      return { text: 'no prazo', className: 'bg-green-100 text-green-800' }
    }
    return {
      text: `${diff} ${diff === 1 ? 'dia' : 'dias'} de atraso`,
      className: 'bg-amber-100 text-amber-800',
    }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const plannedDate = new Date(planned!)
  plannedDate.setHours(0, 0, 0, 0)
  const diff = differenceInDays(plannedDate, today)

  if (diff > 0) {
    return {
      text: `aguardando · faltam ${diff} ${diff === 1 ? 'dia' : 'dias'}`,
      className: 'bg-gray-100 text-gray-800',
    }
  }
  if (diff === 0) {
    return {
      text: 'aguardando · vence hoje',
      className: 'bg-gray-100 text-gray-800',
    }
  }

  const overdue = Math.abs(diff)
  return {
    text: `${overdue} ${overdue === 1 ? 'dia' : 'dias'} em atraso`,
    className: 'bg-red-100 text-red-800',
  }
}
