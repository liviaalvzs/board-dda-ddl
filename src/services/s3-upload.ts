import pb from '@/lib/pocketbase/client'

export interface PresignResponse {
  presignedUrl: string
  publicUrl: string
  key: string
}

export async function getPresignedUrl(
  landCode: string,
  filename: string,
): Promise<PresignResponse> {
  return pb.send('/backend/v1/s3-presign', {
    method: 'POST',
    body: JSON.stringify({ land_code: landCode, filename }),
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function uploadToS3(presignedUrl: string, file: File): Promise<void> {
  const response = await fetch(presignedUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
    },
  })
  if (!response.ok) {
    throw new Error(`Falha no upload para S3: ${response.status} ${response.statusText}`)
  }
}

export async function saveDocumentUrl(
  landId: string,
  documentKey: string,
  documentUrl: string,
  existingCheckId?: string,
): Promise<any> {
  const userId = pb.authStore.record?.id || ''
  if (existingCheckId) {
    return pb.collection('document_checks').update(existingCheckId, {
      is_completed: true,
      document_url: documentUrl,
      user: userId,
    })
  }
  try {
    const existing = await pb
      .collection('document_checks')
      .getFirstListItem(`land_id = "${landId}" && document_key = "${documentKey}"`)
    return pb.collection('document_checks').update(existing.id, {
      is_completed: true,
      document_url: documentUrl,
      user: userId,
    })
  } catch {
    return pb.collection('document_checks').create({
      land_id: landId,
      document_key: documentKey,
      is_completed: true,
      document_url: documentUrl,
      user: userId,
    })
  }
}

export async function uploadDocumentToS3(
  landId: string,
  clusterSerial: string,
  documentKey: string,
  file: File,
  existingCheckId?: string,
): Promise<string> {
  if (!clusterSerial) {
    throw new Error('Cluster serial não definido para esta terra.')
  }
  const { presignedUrl, publicUrl } = await getPresignedUrl(clusterSerial, file.name)
  await uploadToS3(presignedUrl, file)
  await saveDocumentUrl(landId, documentKey, publicUrl, existingCheckId)
  return publicUrl
}
