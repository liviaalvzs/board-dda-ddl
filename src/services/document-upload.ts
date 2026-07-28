import pb from '@/lib/pocketbase/client'
import { getDocumentLabel } from '@/lib/document-labels'

export { getDocumentLabel }

export async function searchLands(query: string): Promise<any[]> {
  if (!query || query.trim().length < 2) return []
  const trimmed = query.trim()
  const escaped = trimmed.replace(/"/g, '\\"')
  const filter = `cluster_serial ~ "${escaped}" || external_id ~ "${escaped}"`
  try {
    return await pb.collection('land_metadata').getFullList({
      filter,
      sort: '-created',
    })
  } catch {
    return []
  }
}

export async function getDocumentChecksForLand(landId: string): Promise<any[]> {
  return await pb.collection('document_checks').getFullList({
    filter: `land_id = "${landId}"`,
    sort: '-created',
    expand: 'user',
  })
}

export async function uploadDocument(
  landId: string,
  documentKey: string,
  file: File,
): Promise<any> {
  const userId = pb.authStore.record?.id || ''
  return await pb.collection('document_checks').create({
    land_id: landId,
    document_key: documentKey,
    is_completed: true,
    document_file: file,
    user: userId,
  })
}
