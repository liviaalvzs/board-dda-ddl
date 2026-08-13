import pb from '@/lib/pocketbase/client'
import type { LandSubject, OwnerType, SubjectKind } from '@/lib/document-groups'

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

export async function createLandSubject(
  landId: string,
  kind: SubjectKind,
  label: string,
  ownerType: OwnerType = '',
): Promise<LandSubject> {
  // Entra no fim da lista: o sort_order é o maior atual + 10, deixando espaço
  // para reordenar entre dois itens sem renumerar todo mundo.
  const existing = await getLandSubjects(landId)
  const maxOrder = existing.reduce((max, s) => Math.max(max, s.sort_order ?? 0), 0)

  const record = await pb.collection('land_subjects').create({
    land_id: landId,
    kind,
    label: label.trim(),
    owner_type: kind === 'owner' ? ownerType || null : null,
    sort_order: maxOrder + 10,
  })
  return record as unknown as LandSubject
}

export async function updateLandSubject(
  subjectId: string,
  data: { label?: string; ownerType?: OwnerType },
): Promise<LandSubject> {
  const payload: Record<string, any> = {}
  if (data.label !== undefined) payload.label = data.label.trim()
  if (data.ownerType !== undefined) payload.owner_type = data.ownerType || null

  const record = await pb.collection('land_subjects').update(subjectId, payload)
  return record as unknown as LandSubject
}

/**
 * Remove o sujeito e os registros de documento dele.
 *
 * Os arquivos já enviados permanecem no S3: o bucket não dá permissão de
 * exclusão (ver o hook proxy-upload). Some da contagem, fica no data lake — a
 * tela avisa isso antes de confirmar.
 */
export async function deleteLandSubject(landId: string, subjectId: string): Promise<void> {
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
