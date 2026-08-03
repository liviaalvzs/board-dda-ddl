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

/**
 * Envia o documento. O registro em document_checks é criado pelo próprio hook,
 * dentro da mesma operação do upload — criá-lo aqui antes deixava linhas órfãs
 * (sem arquivo e sem autor) sempre que o envio falhava no meio do caminho.
 */
export async function uploadDocument(
  landId: string,
  documentKey: string,
  file: File,
  clusterSerial: string,
): Promise<any> {
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
