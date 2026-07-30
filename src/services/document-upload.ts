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

export async function uploadDocument(
  landId: string,
  documentKey: string,
  file: File,
  clusterSerial: string,
): Promise<any> {
  console.log('[DocumentUpload] Starting proxy upload', {
    landId,
    documentKey,
    fileName: file.name,
    clusterSerial,
  })

  const formData = new FormData()
  formData.append('file', file)
  formData.append('land_code', clusterSerial)
  formData.append('document_key', documentKey)
  formData.append('land_id', landId)

  const result = await pb.send('/backend/v1/proxy-upload', {
    method: 'POST',
    body: formData,
  })

  console.log('[DocumentUpload] Proxy upload completed', { result })
  return result
}
