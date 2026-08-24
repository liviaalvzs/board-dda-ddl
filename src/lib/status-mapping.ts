import { KANBAN_COLUMNS } from '@/lib/kanban-columns'

/**
 * Rótulos das etapas antigas, anteriores à reestruturação do fluxo.
 *
 * Não são mais etapas válidas do board, mas continuam aparecendo no histórico
 * (history_logs registra a etapa que valia na época). Sem estes rótulos, a
 * linha do tempo de uma terra passaria a exibir slugs crus como
 * "analise-interna-preliminar" no lugar do nome.
 */
const LEGACY_STATUS_LABELS: Record<string, string> = {
  'assinatura-carta': 'Assinatura da Carta Proposta',
  'aguardando-doc': 'Aguardando documentação básica',
  'analise-interna-preliminar': 'Análise interna DD preliminar',
  'dd-conclusiva': 'DD conclusiva',
  'analise-interna-conclusiva': 'Análise interna DD conclusiva',
  prospeccao: 'Prospecção',
  'analise-tecnica': 'Análise Técnica',
  'proposta-assinada': 'Assinatura da Carta Proposta',
  'dda-analise': 'DDA em análise',
  aprovado: 'Aprovado',
  reprovado: 'Reprovado',
  'aguardando-documentacao': 'Aguardando Documentação',
  'em-analise': 'Em Análise',
  'aguardando-aprovacao': 'Aguardando Aprovação',
  'aguardando-assinatura': 'Aguardando Assinatura',
  'contrato-assinado': 'Contrato Assinado',
  finalizado: 'Finalizado',
  cancelado: 'Cancelado',
  negociacao: 'Negociação',
  'diligencia-externa': 'Diligência Externa',
  'aguardando-dda': 'Aguardando DDA',
  'dda-aprovada': 'DDA Aprovada',
  'dda-reprovada': 'DDA Reprovada',
  'aguardando-pagamento': 'Aguardando Pagamento',
  'pagamento-realizado': 'Pagamento Realizado',
  registro: 'Registro',
  'aguardando-registro': 'Aguardando Registro',
  'nova-etapa': 'Nova Etapa',
  inicial: 'Inicial',
  'preparar-comite': 'Preparar comitê / Espelho na matriz',
  'alinhamento-juridico-terras': 'Alinhamento jurídico / Terras',
}

/**
 * As etapas vigentes vêm de KANBAN_COLUMNS — a definição do board é a fonte.
 * As antigas ficam por baixo, só como fallback de leitura do histórico.
 */
export const STATUS_LABELS: Record<string, string> = {
  ...LEGACY_STATUS_LABELS,
  ...Object.fromEntries(KANBAN_COLUMNS.map((c) => [c.id, c.title])),
}

export function getStatusLabel(slug: string | null | undefined): string {
  if (!slug) return 'Status Desconhecido'
  return STATUS_LABELS[slug] || slug
}
