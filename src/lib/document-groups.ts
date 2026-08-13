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

/** Categorias que dependem do tipo de proprietário — nunca valem as duas. */
const PF_CATEGORY = 'Pessoa Física (proprietário e cônjuge)'
const PJ_CATEGORY = 'Pessoa Jurídica'

/** Vazio = não informado; nesse caso as duas listas continuam sendo exigidas. */
export type OwnerType = 'pf' | 'pj' | ''

export const OWNER_TYPE_LABEL: Record<'pf' | 'pj', string> = {
  pf: 'Pessoa Física',
  pj: 'Pessoa Jurídica',
}

/**
 * Por que um documento não conta — ou `null` se ele conta.
 *
 * `owner-type` vem antes de `manual` de propósito: quando a categoria inteira
 * já não se aplica, a dispensa avulsa é redundante e a tela esconde o botão.
 */
export type ExclusionReason = 'owner-type' | 'manual'

export function getExclusionReason(
  category: string | undefined,
  ownerType: OwnerType,
  isMarkedNotApplicable: boolean,
): ExclusionReason | null {
  if (ownerType === 'pf' && category === PJ_CATEGORY) return 'owner-type'
  if (ownerType === 'pj' && category === PF_CATEGORY) return 'owner-type'
  if (isMarkedNotApplicable) return 'manual'
  return null
}

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

/**
 * Progresso por grupo, contando só o que é exigido daquela terra.
 *
 * Fonte única do cálculo: card do board e aba Documentos chamam esta função,
 * então os dois números nunca divergem.
 */
export function computeDocumentProgress(
  docTypes: DocumentType[],
  ownerType: OwnerType,
  completedKeys: ReadonlySet<string>,
  notApplicableKeys: ReadonlySet<string>,
): DocumentProgress {
  const progress = emptyDocumentProgress()

  for (const type of docTypes) {
    const excluded = getExclusionReason(type.category, ownerType, notApplicableKeys.has(type.key))
    if (excluded) continue

    const group = getDocumentGroup(type.category)
    progress[group].total++
    if (completedKeys.has(type.key)) progress[group].completed++
  }

  return progress
}

export function progressPercent(group: DocumentGroupProgress): number {
  if (group.total <= 0) return 0
  return Math.min(100, Math.max(0, (group.completed / group.total) * 100))
}
