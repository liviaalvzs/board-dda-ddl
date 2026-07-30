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
  console.log('[DocumentUpload] Requesting presigned URL...', {
    land_code: landCode,
    filename,
    content_type: contentType,
  })
  try {
    const result = await pb.send('/backend/v1/s3-presign', {
      method: 'POST',
      body: JSON.stringify({ land_code: landCode, filename, content_type: contentType }),
      headers: { 'Content-Type': 'application/json' },
    })
    console.log('[DocumentUpload] Presigned URL response received', { result })
    return result
  } catch (error) {
    console.log('[DocumentUpload] Presigned URL request failed', { error })
    throw error
  }
}

export async function uploadToS3(presignedUrl: string, file: File): Promise<void> {
  console.log('[DocumentUpload] Uploading to S3...', {
    presignedUrl,
    file: { name: file.name, type: file.type, size: file.size },
  })
  const response = await fetch(presignedUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
    },
  })
  const responseText = await response.text().catch(() => '')
  console.log('[DocumentUpload] S3 upload response', {
    status: response.status,
    statusText: response.statusText,
    ok: response.ok,
    responseText,
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
  console.log('[DocumentUpload] Saving document_url to PocketBase...', {
    landId,
    documentKey,
    documentUrl,
    existingCheckId,
    userId,
  })
  if (existingCheckId) {
    try {
      const result = await pb.collection('document_checks').update(existingCheckId, {
        is_completed: true,
        document_url: documentUrl,
        user: userId,
      })
      console.log('[DocumentUpload] document_url saved (update by id)', { result })
      return result
    } catch (error) {
      console.log('[DocumentUpload] Failed to update document_checks by id', { error })
      throw error
    }
  }
  try {
    const existing = await pb
      .collection('document_checks')
      .getFirstListItem(`land_id = "${landId}" && document_key = "${documentKey}"`)
    console.log('[DocumentUpload] Found existing document_checks record', { id: existing.id })
    const result = await pb.collection('document_checks').update(existing.id, {
      is_completed: true,
      document_url: documentUrl,
      user: userId,
    })
    console.log('[DocumentUpload] document_url saved (update by query)', { result })
    return result
  } catch (error) {
    console.log('[DocumentUpload] No existing record found, creating new', { error: String(error) })
    try {
      const result = await pb.collection('document_checks').create({
        land_id: landId,
        document_key: documentKey,
        is_completed: true,
        document_url: documentUrl,
        user: userId,
      })
      console.log('[DocumentUpload] document_url saved (create new)', { result })
      return result
    } catch (createError) {
      console.log('[DocumentUpload] Failed to create document_checks record', {
        error: createError,
      })
      throw createError
    }
  }
}

export async function uploadDocumentToS3(
  landId: string,
  clusterSerial: string,
  documentKey: string,
  file: File,
  existingCheckId?: string,
): Promise<string> {
  console.log('[DocumentUpload] Starting uploadDocumentToS3', {
    landId,
    clusterSerial,
    documentKey,
    file: { name: file.name, type: file.type, size: file.size },
    existingCheckId,
  })
  if (!clusterSerial) {
    throw new Error('Cluster serial não definido para esta terra.')
  }
  const { presignedUrl, publicUrl } = await getPresignedUrl(
    clusterSerial,
    file.name,
    file.type || 'application/octet-stream',
  )
  await uploadToS3(presignedUrl, file)
  await saveDocumentUrl(landId, documentKey, publicUrl, existingCheckId)
  console.log('[DocumentUpload] uploadDocumentToS3 completed successfully', { publicUrl })
  return publicUrl
}
