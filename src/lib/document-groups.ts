import type { DocumentType } from '@/services/app-settings'

/**
 * Os documentos se dividem em dois blocos de acompanhamento: o que o
 * proprietário entrega (documentos básicos) e o que é emitido por órgão
 * (certidões).
 *
 * São ritmos diferentes — cobrar o proprietário é uma coisa, esperar cartório
 * ou secretaria é outra —, então os contadores andam separados. Um número só
 * escondia qual dos dois lados estava travando.
 *
 * O agrupamento é por categoria de `document_types`. Categoria desconhecida cai
 * em "básicos": é o bloco de cobrança do proprietário, então um tipo novo
 * aparece na conta em vez de sumir silenciosamente dela.
 */
export type DocumentGroupId = 'basicos' | 'certidoes'

const CERTIDAO_CATEGORIES = new Set(['Certidões Ambientais', 'Certidões Fiscais'])

export const DOCUMENT_GROUP_LABEL: Record<DocumentGroupId, string> = {
  basicos: 'Documentos básicos',
  certidoes: 'Certidões',
}

/** Rótulo curto para o card do board, onde não cabe o nome inteiro. */
export const DOCUMENT_GROUP_SHORT_LABEL: Record<DocumentGroupId, string> = {
  basicos: 'Básicos',
  certidoes: 'Certidões',
}

export const DOCUMENT_GROUP_IDS: DocumentGroupId[] = ['basicos', 'certidoes']

export function getDocumentGroup(category: string | undefined): DocumentGroupId {
  return category && CERTIDAO_CATEGORIES.has(category) ? 'certidoes' : 'basicos'
}

export interface DocumentGroupProgress {
  completed: number
  total: number
}

export type DocumentProgress = Record<DocumentGroupId, DocumentGroupProgress>

/** Fábrica, e não constante: cada consumidor incrementa o seu próprio objeto. */
export function emptyDocumentProgress(): DocumentProgress {
  return {
    basicos: { completed: 0, total: 0 },
    certidoes: { completed: 0, total: 0 },
  }
}

/** Chave do documento → grupo, a partir dos tipos configurados. */
export function buildDocumentGroupMap(docTypes: DocumentType[]): Record<string, DocumentGroupId> {
  const map: Record<string, DocumentGroupId> = {}
  for (const type of docTypes) {
    map[type.key] = getDocumentGroup(type.category)
  }
  return map
}

/** Quantos tipos existem em cada grupo — o denominador dos contadores. */
export function countGroupTotals(docTypes: DocumentType[]): Record<DocumentGroupId, number> {
  const totals: Record<DocumentGroupId, number> = { basicos: 0, certidoes: 0 }
  for (const type of docTypes) {
    totals[getDocumentGroup(type.category)]++
  }
  return totals
}

export function progressPercent(group: DocumentGroupProgress): number {
  if (group.total <= 0) return 0
  return Math.min(100, Math.max(0, (group.completed / group.total) * 100))
}
