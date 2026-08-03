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
 * Devolve uma URL temporária (5 min) para ler o arquivo no S3. O bucket é
 * privado, então não existe link direto: o backend assina o acesso a um único
 * objeto, sob demanda, para a sessão autenticada.
 */
export async function getDocumentFileUrl(
  checkId: string,
  disposition: 'inline' | 'attachment',
): Promise<string> {
  const res: any = await pb.send('/backend/v1/document-file-url', {
    method: 'POST',
    body: JSON.stringify({ check_id: checkId, disposition }),
    headers: { 'Content-Type': 'application/json' },
  })
  return res.url
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
