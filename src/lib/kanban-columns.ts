export interface KanbanColumnConfig {
  id: string
  title: string
  color: string
}

export const KANBAN_COLUMNS: KanbanColumnConfig[] = [
  { id: 'aguardando-doc', title: 'Aguardando documentação básica', color: '#2563eb' },
  { id: 'prospeccao', title: 'Prospecção', color: '#16a34a' },
  { id: 'analise-tecnica', title: 'Análise Técnica', color: '#9333ea' },
  { id: 'proposta-assinada', title: 'Assinatura da Carta Proposta', color: '#ea580c' },
  { id: 'dda-analise', title: 'DDA em análise', color: '#0891b2' },
  { id: 'aprovado', title: 'Aprovado', color: '#db2777' },
  { id: 'reprovado', title: 'Reprovado', color: '#ca8a04' },
  { id: 'emissao-certidoes', title: 'Emissão das certidões', color: '#4f46e5' },
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
