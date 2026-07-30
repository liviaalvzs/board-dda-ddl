import pb from '@/lib/pocketbase/client'

export interface PresignResponse {
  presignedUrl: string
  publicUrl: string
  key: string
}

export async function getPresignedUrl(
  landCode: string,
  filename: string,
  contentType: string,
): Promise<PresignResponse> {
  console.log('[DocumentUpload] getPresignedUrl is deprecated, use proxy-upload instead')
  throw new Error('getPresignedUrl is deprecated. Use proxy-upload endpoint instead.')
}

export async function uploadToS3(presignedUrl: string, file: File): Promise<void> {
  console.log('[DocumentUpload] uploadToS3 is deprecated, use proxy-upload instead')
  throw new Error('uploadToS3 is deprecated. Use proxy-upload endpoint instead.')
}

export async function saveDocumentUrl(
  landId: string,
  documentKey: string,
  documentUrl: string,
  existingCheckId?: string,
): Promise<any> {
  console.log('[DocumentUpload] saveDocumentUrl: now handled by proxy-upload hook, skipping')
  return null
}

export async function uploadDocumentToS3(
  landId: string,
  clusterSerial: string,
  documentKey: string,
  file: File,
  existingCheckId?: string,
): Promise<string> {
  console.log('[DocumentUpload] Starting proxy upload', {
    landId,
    clusterSerial,
    documentKey,
    file: { name: file.name, type: file.type, size: file.size },
    existingCheckId,
  })

  if (!clusterSerial) {
    throw new Error('Cluster serial não definido para esta terra.')
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('land_code', clusterSerial)
  formData.append('document_key', documentKey)
  formData.append('land_id', landId)

  const baseUrl = import.meta.env.VITE_POCKETBASE_URL

  console.log('[DocumentUpload] Sending file to proxy-upload endpoint', { baseUrl })

  const response = await fetch(`${baseUrl}/backend/v1/proxy-upload`, {
    method: 'POST',
    headers: {
      Authorization: pb.authStore.token,
    },
    body: formData,
  })

  const result = await response.json().catch(() => ({}))

  if (!response.ok) {
    console.log('[DocumentUpload] Proxy upload failed', {
      status: response.status,
      statusText: response.statusText,
      result,
    })
    throw new Error(result.message || result.error || `Erro ao enviar arquivo: ${response.status}`)
  }

  console.log('[DocumentUpload] Proxy upload succeeded', { result })
  return result.url
}
