/**
 * Rótulos dos documentos dos Anexos I e II da Carta Proposta.
 * Usado como fallback (ex.: histórico de envios) quando só temos a chave.
 * A fonte de verdade é a collection `document_types`.
 */
const DOCUMENT_LABELS: Record<string, string> = {
  // Pessoa Física (proprietário e cônjuge)
  pf_documentos_pessoais: 'Documentos Pessoais',
  pf_certidao_estado_civil: 'Certidão de Estado Civil',
  pf_documentos_pessoais_conjuge: 'Documentos pessoais do cônjuge (se casado)',
  pf_comprovante_residencia: 'Comprovante de residência',

  // Pessoa Jurídica
  pj_contrato_social: 'Contrato Social',
  pj_cartao_cnpj: 'Cartão CNPJ',
  pj_inscricao_estadual_municipal: 'Inscrição Estadual e Municipal',
  pj_comprovante_endereco: 'Comprovante de endereço da PJ',
  pj_documentos_representante_socios:
    'Documentos Pessoais do representante legal e sócios da empresa',

  // Imóvel
  imovel_certidao_matricula: 'Certidão da Matrícula',
  imovel_ccir: 'CCIR',
  imovel_ditr: 'DITR',
  imovel_car: 'CAR',
  imovel_shapefile_kml_kmz: 'Shapefile/KML ou KMZ',

  // Certidões Ambientais
  cnd_ambiental_estadual: 'Certidão Ambiental Estadual de Débitos (CND Ambiental Estadual)',
  cni_ambiental_estadual: 'Certidão Ambiental Estadual de Infrações (CNI Ambiental Estadual)',
  certidao_ambiental_municipal: 'Certidão Ambiental Municipal',

  // Certidões Fiscais
  cnd_federal: 'Certidão Negativa Federal (CND Federal)',
  cnd_estadual: 'Certidão Negativa Fiscal Estadual (CND Estadual)',
  cnd_municipal: 'Certidão Negativa Fiscal Municipal (CND Municipal)',
}

export const ALL_DOCUMENT_KEYS = Object.keys(DOCUMENT_LABELS)

export const OWNER_PF_KEYS = [
  'pf_documentos_pessoais',
  'pf_certidao_estado_civil',
  'pf_documentos_pessoais_conjuge',
  'pf_comprovante_residencia',
]

export const OWNER_PJ_KEYS = [
  'pj_contrato_social',
  'pj_cartao_cnpj',
  'pj_inscricao_estadual_municipal',
  'pj_comprovante_endereco',
  'pj_documentos_representante_socios',
]

export const MATRICULA_KEYS = [
  'imovel_certidao_matricula',
  'imovel_ccir',
  'imovel_ditr',
  'imovel_car',
  'imovel_shapefile_kml_kmz',
]

export const CERTIDAO_AMBIENTAL_KEYS = [
  'cnd_ambiental_estadual',
  'cni_ambiental_estadual',
  'certidao_ambiental_municipal',
]

export const CERTIDAO_FISCAL_KEYS = ['cnd_federal', 'cnd_estadual', 'cnd_municipal']

export function getDocumentLabel(key: string): string {
  if (DOCUMENT_LABELS[key]) return DOCUMENT_LABELS[key]
  return key.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
