import pb from '@/lib/pocketbase/client'

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
    sort: 'document_key',
  })
}

export async function uploadDocument(
  landId: string,
  documentKey: string,
  data: { isCompleted?: boolean; documentUrl?: string; documentFile?: File },
): Promise<any> {
  try {
    const existing = await pb
      .collection('document_checks')
      .getFirstListItem(`land_id = "${landId}" && document_key = "${documentKey}"`)

    const payload: Record<string, any> = {}
    if (data.isCompleted !== undefined) payload.is_completed = data.isCompleted
    if (data.documentUrl !== undefined) payload.document_url = data.documentUrl
    if (data.documentFile) payload.document_file = data.documentFile
    return await pb.collection('document_checks').update(existing.id, payload)
  } catch {
    return await pb.collection('document_checks').create({
      land_id: landId,
      document_key: documentKey,
      is_completed: data.isCompleted || false,
      document_url: data.documentUrl || '',
      document_file: data.documentFile || null,
    })
  }
}

const DOCUMENT_LABELS: Record<string, string> = {
  cpf: 'CPF',
  rg: 'RG',
  'certidao-nascimento': 'Certidão de Nascimento',
  'certidao-casamento': 'Certidão de Casamento',
  'certidao-obitos': 'Certidão de Óbito',
  iptu: 'IPTU',
  'registro-imovel': 'Registro do Imóvel',
  matricula: 'Matrícula',
  escritura: 'Escritura',
  'contrato-compra-venda': 'Contrato de Compra e Venda',
  procuracao: 'Procuração',
  'estatuto-casamento': 'Estatuto de Casamento',
  'pacto-antinupcial': 'Pacto Antinupcial',
  'certidao-conjuge': 'Certidão de Casamento do Cônjuge',
  'comprovante-residencia': 'Comprovante de Residência',
  cnh: 'CNH',
}

export function getDocumentLabel(key: string): string {
  if (DOCUMENT_LABELS[key]) return DOCUMENT_LABELS[key]
  return key.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
