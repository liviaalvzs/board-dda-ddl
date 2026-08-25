/**
 * Fonte única das etapas do Kanban.
 *
 * Antes existiam três listas divergentes (uma local no Index.tsx, esta, e os
 * rótulos em status-mapping.ts). Tudo passa a derivar daqui.
 *
 * Cada coluna carrega duas cores porque os consumidores exigem formatos
 * diferentes: `color` (hex) alimenta gráficos e mapa; `dotClass` (classe
 * Tailwind) alimenta o marcador no cabeçalho da coluna do board.
 */
export interface KanbanColumnConfig {
  id: string
  title: string
  color: string
  dotClass: string
  collapsible?: boolean
  excludeFromMetrics?: boolean
}

export const ON_HOLD_STAGE_ID = 'on-hold'

export const KANBAN_COLUMNS: KanbanColumnConfig[] = [
  {
    id: 'triagem-documentos-basicos',
    title: '1. Triagem documentos básicos',
    color: '#94a3b8',
    dotClass: 'bg-slate-400',
  },
  {
    id: 'aguardando-documentos-basicos',
    title: '2. Aguardando documentos básicos',
    color: '#f59e0b',
    dotClass: 'bg-amber-500',
  },
  {
    id: 'emissao-certidoes',
    title: '3. Emissão de certidões (Docket/ONR/escritório)',
    color: '#0ea5e9',
    dotClass: 'bg-sky-500',
  },
  {
    id: 'auditoria-escritorio-externo',
    title: '4. Em auditoria / Escritório externo',
    color: '#6366f1',
    dotClass: 'bg-indigo-500',
  },
  {
    id: 'recebimento-ddl-preliminar',
    title: '5. Recebimento DDL preliminar / Análise interna',
    color: '#8b5cf6',
    dotClass: 'bg-violet-500',
  },
  {
    id: 'on-hold',
    title: 'On Hold',
    color: '#9ca3af',
    dotClass: 'bg-gray-400',
    collapsible: true,
    excludeFromMetrics: true,
  },
  {
    id: 'levantamento-documentos-complementares',
    title: '6. Levantamento de documentos complementares',
    color: '#d946ef',
    dotClass: 'bg-fuchsia-500',
  },

  {
    id: 'recebimento-ddl-conclusiva',
    title: '7. Recebimento DDL conclusiva / Análise interna',
    color: '#14b8a6',
    dotClass: 'bg-teal-500',
  },
  {
    id: 'elaboracao-contrato',
    title: '8. Em elaboração de contrato',
    color: '#eab308',
    dotClass: 'bg-yellow-500',
  },
  {
    id: 'assinado-acompanhamento-cp',
    title: '9. Assinado / Acompanhamento das CP',
    color: '#16a34a',
    dotClass: 'bg-green-600',
  },
]

export const KANBAN_COLUMN_IDS = new Set(KANBAN_COLUMNS.map((c) => c.id))

export function getKanbanColumn(statusId: string | null | undefined): KanbanColumnConfig | null {
  if (!statusId) return null
  return KANBAN_COLUMNS.find((c) => c.id === statusId) ?? null
}

export function getKanbanColumnColor(statusId: string | null | undefined): string | null {
  return getKanbanColumn(statusId)?.color ?? null
}

export function getKanbanColumnTitle(statusId: string | null | undefined): string {
  if (!statusId) return 'Status Desconhecido'
  return getKanbanColumn(statusId)?.title ?? statusId
}

export function buildKanbanColorMap(): Record<string, string> {
  const map: Record<string, string> = {}
  for (const col of KANBAN_COLUMNS) {
    map[col.id] = col.color
  }
  return map
}
