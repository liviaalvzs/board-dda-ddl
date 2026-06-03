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
    })
  }
}
