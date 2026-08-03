import pb from '@/lib/pocketbase/client'
import { getDocumentLabel } from '@/lib/document-labels'

export { getDocumentLabel }

export async function searchLands(query: string): Promise<any[]> {
  const trimmed = (query || '').trim()
  if (!trimmed) {
    return pb.collection('land_metadata').getFullList({ sort: 'name' })
  }
  const escaped = trimmed.replace(/"/g, '\\"')
  return pb.collection('land_metadata').getFullList({
    filter: `name ~ "${escaped}" || external_id ~ "${escaped}" || cluster_serial ~ "${escaped}"`,
    sort: 'name',
  })
}

export async function getDocumentChecksForLand(landId: string): Promise<any[]> {
  return pb.collection('document_checks').getFullList({
    filter: `land_id = "${landId}"`,
    sort: '-created',
  })
}

async function ensureDocumentCheck(landId: string, documentKey: string): Promise<void> {
  try {
    await pb
      .collection('document_checks')
      .getFirstListItem(`land_id = "${landId}" && document_key = "${documentKey}"`)
    return
  } catch {
    // Record doesn't exist — create it
  }

  try {
    await pb.collection('document_checks').create({
      land_id: landId,
      document_key: documentKey,
      is_completed: false,
      user: pb.authStore.record?.id || '',
    })
  } catch {
    try {
      await pb
        .collection('document_checks')
        .getFirstListItem(`land_id = "${landId}" && document_key = "${documentKey}"`)
    } catch {
      throw new Error('Não foi possível criar o registro de verificação do documento.')
    }
  }
}

/**
 * Exclui o documento: remove o objeto no S3 e o registro em document_checks.
 * Operação irreversível e restrita a administradores (validado no hook).
 */
export async function deleteDocument(checkId: string): Promise<any> {
  return pb.send('/backend/v1/proxy-delete-document', {
    method: 'POST',
    body: JSON.stringify({ check_id: checkId }),
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function uploadDocument(
  landId: string,
  documentKey: string,
  file: File,
  clusterSerial: string,
): Promise<any> {
  await ensureDocumentCheck(landId, documentKey)

  const formData = new FormData()
  formData.append('file', file)
  formData.append('land_code', clusterSerial || landId)
  formData.append('document_key', documentKey)
  formData.append('land_id', landId)

  return pb.send('/backend/v1/proxy-upload', {
    method: 'POST',
    body: formData,
  })
}
