export const STATUS_LABELS: Record<string, string> = {
  'aguardando-doc': 'Aguardando documentação básica',
  prospeccao: 'Prospecção',
  'analise-tecnica': 'Análise Técnica',
  'proposta-assinada': 'Assinatura da Carta Proposta',
  'dda-analise': 'DDA em análise',
  aprovado: 'Aprovado',
  reprovado: 'Reprovado',
  'assinatura-carta': 'Assinatura da Carta Proposta',
  'emissao-certidoes': 'Emissão das certidões',
  'analise-interna-preliminar': 'Análise interna DD preliminar',
  'dd-conclusiva': 'DD conclusiva',
  'analise-interna-conclusiva': 'Análise interna DD conclusiva',
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
}

export function getStatusLabel(slug: string | null | undefined): string {
  if (!slug) return 'Status Desconhecido'
  return STATUS_LABELS[slug] || slug
}
