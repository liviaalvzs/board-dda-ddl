import pb from '@/lib/pocketbase/client'

export async function getDocumentChecks(landId: string) {
  return pb.collection('document_checks').getFullList({
    filter: `land_id = "${landId}"`,
  })
}

export async function toggleDocumentCheck(
  landId: string,
  documentKey: string,
  isCompleted: boolean,
) {
  try {
    const existing = await pb
      .collection('document_checks')
      .getFirstListItem(`land_id = "${landId}" && document_key = "${documentKey}"`)
    return await pb.collection('document_checks').update(existing.id, { is_completed: isCompleted })
  } catch (e) {
    return await pb.collection('document_checks').create({
      land_id: landId,
      document_key: documentKey,
      is_completed: isCompleted,
      user: pb.authStore.record?.id || '',
    })
  }
}

/**
 * Dispensa (ou volta a exigir) um documento específico desta terra.
 *
 * Grava no mesmo registro do envio, então marcar como não aplicável preserva um
 * arquivo já enviado — desmarcar devolve o documento à contagem com o envio
 * intacto.
 */
export async function setDocumentNotApplicable(
  landId: string,
  documentKey: string,
  notApplicable: boolean,
) {
  try {
    const existing = await pb
      .collection('document_checks')
      .getFirstListItem(`land_id = "${landId}" && document_key = "${documentKey}"`)
    return await pb
      .collection('document_checks')
      .update(existing.id, { not_applicable: notApplicable })
  } catch (e) {
    return await pb.collection('document_checks').create({
      land_id: landId,
      document_key: documentKey,
      not_applicable: notApplicable,
      is_completed: false,
      user: pb.authStore.record?.id || '',
    })
  }
}

export async function setDocumentUrl(landId: string, documentKey: string, documentUrl: string) {
  try {
    const existing = await pb
      .collection('document_checks')
      .getFirstListItem(`land_id = "${landId}" && document_key = "${documentKey}"`)
    return await pb.collection('document_checks').update(existing.id, { document_url: documentUrl })
  } catch (e) {
    return await pb.collection('document_checks').create({
      land_id: landId,
      document_key: documentKey,
      document_url: documentUrl,
      is_completed: false,
      user: pb.authStore.record?.id || '',
    })
  }
}
