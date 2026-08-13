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

// ── Sujeitos ────────────────────────────────────────────────────────────────

/**
 * Proprietário ou matrícula. Uma terra tem N de cada, e cada um exige a sua
 * própria via dos documentos do seu escopo.
 */
export type SubjectKind = 'owner' | 'matricula'

export interface LandSubject {
  id: string
  land_id: string
  kind: SubjectKind
  label: string
  owner_type?: OwnerType
  sort_order?: number
}

export const SUBJECT_KIND_LABEL: Record<SubjectKind, string> = {
  owner: 'Proprietário',
  matricula: 'Matrícula',
}

/**
 * De quem é o documento: das pessoas ou do imóvel.
 *
 * Fixo por categoria, por decisão de produto. PF e PJ são do proprietário; o
 * resto (Imóvel, Certidões Ambientais e Fiscais) acompanha a matrícula.
 */
export function getSubjectKindForCategory(category: string | undefined): SubjectKind {
  return category === PF_CATEGORY || category === PJ_CATEGORY ? 'owner' : 'matricula'
}

/**
 * Sujeitos de um tipo, já ordenados. Terra sem nenhum cadastrado devolve um
 * sujeito implícito de id vazio, que reproduz exatamente o comportamento
 * anterior à multiplicação — sem isso todo card do board zeraria no deploy.
 */
export function subjectsOfKind(
  subjects: LandSubject[],
  kind: SubjectKind,
  fallbackOwnerType: OwnerType = '',
): LandSubject[] {
  const matching = subjects
    .filter((s) => s.kind === kind)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.label.localeCompare(b.label))

  if (matching.length > 0) return matching

  return [
    {
      id: '',
      land_id: '',
      kind,
      label: kind === 'owner' ? 'Proprietário' : 'Matrícula',
      owner_type: kind === 'owner' ? fallbackOwnerType : '',
    },
  ]
}

/** Chave de uma instância de documento: o tipo dentro de um sujeito. */
export function instanceKey(documentKey: string, subjectId: string): string {
  return `${documentKey}::${subjectId}`
}

// ── Exclusões ───────────────────────────────────────────────────────────────

/**
 * Por que um documento não conta — ou `null` se ele conta.
 *
 * `owner-type` vem antes de `manual` de propósito: quando a categoria inteira
 * já não se aplica, a dispensa avulsa é redundante e a tela esconde o botão.
 */
export type ExclusionReason = 'owner-type' | 'manual'

/**
 * O tipo de proprietário agora é de cada um, não da terra: um co-proprietário
 * pessoa física e outro empresa recebem listas diferentes na mesma terra.
 */
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

/** Texto do chip que explica por que o documento não é exigido. */
export function getExclusionLabel(
  reason: ExclusionReason | null,
  ownerType: OwnerType,
): string | null {
  if (!reason) return null
  if (reason === 'owner-type') {
    return `Não se aplica · proprietário ${ownerType === 'pf' ? 'PF' : 'PJ'}`
  }
  return 'Dispensado'
}

// ── Grupos de progresso ─────────────────────────────────────────────────────

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
 * Progresso por grupo, contando **instâncias** — cada tipo de documento vezes
 * cada sujeito do seu escopo.
 *
 * Fonte única do cálculo: card do board, aba Documentos da terra e página
 * /documents chamam esta função, então os três números nunca divergem.
 *
 * As chaves de `completedKeys` e `notApplicableKeys` são compostas por
 * `instanceKey(documentKey, subjectId)`.
 */
export function computeDocumentProgress(
  docTypes: DocumentType[],
  subjects: LandSubject[],
  fallbackOwnerType: OwnerType,
  completedKeys: ReadonlySet<string>,
  notApplicableKeys: ReadonlySet<string>,
): DocumentProgress {
  const progress = emptyDocumentProgress()

  for (const type of docTypes) {
    const kind = getSubjectKindForCategory(type.category)
    for (const subject of subjectsOfKind(subjects, kind, fallbackOwnerType)) {
      const key = instanceKey(type.key, subject.id)
      const ownerType = (subject.owner_type || fallbackOwnerType) as OwnerType
      if (getExclusionReason(type.category, ownerType, notApplicableKeys.has(key))) continue

      const group = getDocumentGroup(type.category)
      progress[group].total++
      if (completedKeys.has(key)) progress[group].completed++
    }
  }

  return progress
}

export function progressPercent(group: DocumentGroupProgress): number {
  if (group.total <= 0) return 0
  return Math.min(100, Math.max(0, (group.completed / group.total) * 100))
}
