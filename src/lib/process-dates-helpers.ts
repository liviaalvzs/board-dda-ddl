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
  {
    title: 'DDA',
    planned: { key: 'data_pedido_dda', param: 'dataPedidoDda', label: 'Previsto' },
    actual: { key: 'data_recebimento_dda', param: 'dataRecebimentoDda', label: 'Realizado' },
  },
]

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
