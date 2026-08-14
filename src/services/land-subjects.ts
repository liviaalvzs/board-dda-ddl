import pb from '@/lib/pocketbase/client'
import { DEFAULT_OWNER_TYPE } from '@/lib/document-groups'
import type { LandSubject, OwnerType, SubjectKind } from '@/lib/document-groups'

const AUTO_LABEL_PREFIX: Record<SubjectKind, string> = {
  owner: 'Proprietário',
  matricula: 'Matrícula',
}

/**
 * Próximo nome automático da sequência: "Proprietário 1", "Proprietário 2"...
 *
 * Continua de onde a numeração parou em vez de contar quantos existem — apagar
 * o 2 de [1,2,3] e adicionar de novo daria "Proprietário 3", repetido. E o nome
 * repetido não é cosmético: o rótulo entra na chave do arquivo no S3, então dois
 * iguais fariam um envio sobrescrever o outro.
 */
export function nextSubjectLabel(subjects: LandSubject[], kind: SubjectKind): string {
  const prefix = AUTO_LABEL_PREFIX[kind]
  const siblings = subjects.filter((s) => s.kind === kind)
  const used = new Set(siblings.map((s) => s.label.trim().toLowerCase()))

  let highest = 0
  for (const subject of siblings) {
    const match = subject.label.trim().match(/^(.*?)\s+(\d+)$/)
    if (match && match[1].toLowerCase() === prefix.toLowerCase()) {
      highest = Math.max(highest, Number(match[2]))
    }
  }

  // Pula números que alguém já ocupou renomeando à mão.
  let next = highest + 1
  while (used.has(`${prefix} ${next}`.toLowerCase())) next++
  return `${prefix} ${next}`
}

/**
 * Proprietários e matrículas de uma terra.
 *
 * `land_id` guarda o external_id da terra, igual a `document_checks.land_id` —
 * as duas collections são cruzadas por esse campo.
 */
export async function getLandSubjects(landId: string): Promise<LandSubject[]> {
  const records = await pb.collection('land_subjects').getFullList({
    filter: `land_id = "${landId}"`,
    sort: 'sort_order,created',
  })
  return records as unknown as LandSubject[]
}

/** Todos os sujeitos, agrupados por terra — usado pelo board, que carrega tudo de uma vez. */
export async function getAllLandSubjects(): Promise<Record<string, LandSubject[]>> {
  const records = await pb.collection('land_subjects').getFullList({ sort: 'sort_order,created' })
  const map: Record<string, LandSubject[]> = {}
  for (const record of records as unknown as LandSubject[]) {
    if (!map[record.land_id]) map[record.land_id] = []
    map[record.land_id].push(record)
  }
  return map
}

/**
 * Cria o próximo da sequência. O nome sai automático; renomear depois é
 * opcional, na tela de Informações.
 */
export async function createLandSubject(
  landId: string,
  kind: SubjectKind,
  ownerType: OwnerType = DEFAULT_OWNER_TYPE,
): Promise<LandSubject> {
  const existing = await getLandSubjects(landId)
  // sort_order salta de 10 em 10 para caber uma reordenação entre dois itens
  // sem renumerar a lista inteira.
  const maxOrder = existing.reduce((max, s) => Math.max(max, s.sort_order ?? 0), 0)

  const record = await pb.collection('land_subjects').create({
    land_id: landId,
    kind,
    label: nextSubjectLabel(existing, kind),
    owner_type: kind === 'owner' ? ownerType || null : null,
    sort_order: maxOrder + 10,
  })
  return record as unknown as LandSubject
}

/**
 * Garante o mínimo de um proprietário e uma matrícula.
 *
 * Cria o que faltar e devolve a lista final. Chamado ao abrir as telas de
 * documentos, para toda terra ter sujeitos reais em vez de depender do
 * implícito — que fica só como rede de segurança para quem não tem permissão
 * de escrita.
 */
export async function ensureMinimumSubjects(landId: string): Promise<LandSubject[]> {
  let subjects = await getLandSubjects(landId)

  const missing: SubjectKind[] = []
  if (!subjects.some((s) => s.kind === 'owner')) missing.push('owner')
  if (!subjects.some((s) => s.kind === 'matricula')) missing.push('matricula')
  if (missing.length === 0) return subjects

  try {
    for (const kind of missing) {
      await createLandSubject(landId, kind)
    }
    subjects = await getLandSubjects(landId)
  } catch (err) {
    // Sem permissão de escrita (perfil não-admin), segue com o que existe: as
    // telas caem no sujeito implícito e nada quebra.
    console.warn('[land-subjects] não foi possível criar o mínimo obrigatório', err)
  }

  return subjects
}

export async function updateLandSubject(
  subjectId: string,
  data: { label?: string; ownerType?: OwnerType },
): Promise<LandSubject> {
  const payload: Record<string, any> = {}

  if (data.label !== undefined) {
    const label = data.label.trim()
    if (!label) throw new Error('O nome não pode ficar vazio.')

    // Nome repetido faria os dois apontarem para a mesma chave no S3, e um
    // envio arquivaria o do outro como versão anterior.
    const current = await pb.collection('land_subjects').getOne(subjectId)
    const siblings = await getLandSubjects(current.land_id)
    const clash = siblings.some(
      (s) =>
        s.id !== subjectId &&
        s.kind === current.kind &&
        s.label.trim().toLowerCase() === label.toLowerCase(),
    )
    if (clash) {
      throw new Error(
        'Já existe outro item com esse nome. Nomes iguais fariam os arquivos se sobrescreverem.',
      )
    }
    payload.label = label
  }

  if (data.ownerType !== undefined) payload.owner_type = data.ownerType || null

  const record = await pb.collection('land_subjects').update(subjectId, payload)
  return record as unknown as LandSubject
}

/**
 * Remove o sujeito e os registros de documento dele.
 *
 * Nunca remove o último do seu tipo: toda terra tem pelo menos um proprietário
 * e uma matrícula, então zerar deixaria a lista de documentos daquele escopo
 * sem dono e o progresso sem denominador.
 *
 * Os arquivos já enviados permanecem no S3: o bucket não dá permissão de
 * exclusão (ver o hook proxy-upload). Some da contagem, fica no data lake — a
 * tela avisa isso antes de confirmar.
 */
export async function deleteLandSubject(landId: string, subjectId: string): Promise<void> {
  const all = await getLandSubjects(landId)
  const target = all.find((s) => s.id === subjectId)
  if (!target) throw new Error('Item não encontrado.')

  if (all.filter((s) => s.kind === target.kind).length <= 1) {
    throw new Error(
      target.kind === 'owner'
        ? 'A terra precisa de pelo menos um proprietário.'
        : 'A terra precisa de pelo menos uma matrícula.',
    )
  }

  const checks = await pb.collection('document_checks').getFullList({
    filter: `land_id = "${landId}" && subject_id = "${subjectId}"`,
  })
  for (const check of checks) {
    await pb.collection('document_checks').delete(check.id)
  }
  await pb.collection('land_subjects').delete(subjectId)
}

/** Quantos documentos enviados o sujeito tem — para avisar antes de remover. */
export async function countSubjectUploads(landId: string, subjectId: string): Promise<number> {
  const checks = await pb.collection('document_checks').getFullList({
    filter: `land_id = "${landId}" && subject_id = "${subjectId}" && is_completed = true && document_url != ""`,
  })
  return checks.length
}
