import pb from '@/lib/pocketbase/client'
import { uploadDocument } from '@/services/document-upload'

export interface PresignResponse {
  presignedUrl: string
  publicUrl: string
  key: string
}

export async function getPresignedUrl(
  _landCode: string,
  _filename: string,
  _contentType: string,
): Promise<PresignResponse> {
  throw new Error('getPresignedUrl is deprecated. Use proxy-upload endpoint instead.')
}

export async function uploadToS3(_presignedUrl: string, _file: File): Promise<void> {
  throw new Error('uploadToS3 is deprecated. Use proxy-upload endpoint instead.')
}

export async function saveDocumentUrl(
  _landId: string,
  _documentKey: string,
  _documentUrl: string,
  _existingCheckId?: string,
): Promise<any> {
  return null
}

export async function uploadDocumentToS3(
  landId: string,
  clusterSerial: string,
  documentKey: string,
  file: File,
  _existingCheckId?: string,
): Promise<string> {
  const result = await uploadDocument(landId, documentKey, file, clusterSerial)
  return result.url
}
