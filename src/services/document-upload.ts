import pb from '@/lib/pocketbase/client'
import { getDocumentLabel } from '@/lib/document-labels'
import { uploadDocumentToS3 } from '@/services/s3-upload'

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
  clusterSerial: string,
): Promise<any> {
  console.log('[DocumentUpload] uploadDocument called', {
    landId,
    documentKey,
    fileName: file.name,
    clusterSerial,
  })
  try {
    const result = await uploadDocumentToS3(landId, clusterSerial, documentKey, file)
    console.log('[DocumentUpload] uploadDocument succeeded', { result })
    return result
  } catch (error) {
    console.log('[DocumentUpload] uploadDocument failed', { error })
    throw error
  }
}
