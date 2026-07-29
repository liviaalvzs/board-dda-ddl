export interface KanbanColumnConfig {
  id: string
  title: string
  color: string
}

export const KANBAN_COLUMNS: KanbanColumnConfig[] = [
  { id: 'assinatura-carta', title: 'Assinatura da Carta Proposta', color: '#94a3b8' },
  { id: 'aguardando-doc', title: 'Aguardando documentação básica', color: '#2563eb' },
  { id: 'emissao-certidoes', title: 'Emissão das certidões', color: '#4f46e5' },
  { id: 'analise-interna-preliminar', title: 'Análise interna DD preliminar', color: '#6366f1' },
  { id: 'dd-conclusiva', title: 'DD conclusiva', color: '#d946ef' },
  { id: 'analise-interna-conclusiva', title: 'Análise interna DD conclusiva', color: '#10b981' },
  { id: 'prospeccao', title: 'Prospecção', color: '#16a34a' },
  { id: 'analise-tecnica', title: 'Análise Técnica', color: '#9333ea' },
  { id: 'proposta-assinada', title: 'Assinatura da Carta Proposta', color: '#ea580c' },
  { id: 'dda-analise', title: 'DDA em análise', color: '#0891b2' },
  { id: 'aprovado', title: 'Aprovado', color: '#db2777' },
  { id: 'reprovado', title: 'Reprovado', color: '#ca8a04' },
]

export const KANBAN_COLUMN_IDS = new Set(KANBAN_COLUMNS.map((c) => c.id))

export function getKanbanColumnColor(statusId: string | null | undefined): string | null {
  if (!statusId) return null
  const column = KANBAN_COLUMNS.find((c) => c.id === statusId)
  return column?.color ?? null
}

export function getKanbanColumnTitle(statusId: string | null | undefined): string {
  if (!statusId) return 'Status Desconhecido'
  const column = KANBAN_COLUMNS.find((c) => c.id === statusId)
  return column?.title ?? statusId
}

export function buildKanbanColorMap(): Record<string, string> {
  const map: Record<string, string> = {}
  for (const col of KANBAN_COLUMNS) {
    map[col.id] = col.color
  }
  return map
}
