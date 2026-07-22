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
}

export function getStatusLabel(slug: string | null | undefined): string {
  if (!slug) return 'Status Desconhecido'
  return STATUS_LABELS[slug] || slug
}
