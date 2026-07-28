import pb from '@/lib/pocketbase/client'

export async function searchLands(query: string) {
  if (!query.trim() || query.trim().length < 2) return []
  try {
    const escaped = query.replace(/"/g, '\\"')
    const result = await pb.collection('land_metadata').getList(1, 10, {
      filter: `external_id ~ "${escaped}"`,
      sort: 'external_id',
    })
    return result.items
  } catch {
    return []
  }
}

export async function getDocumentChecksForLand(landId: string) {
  return pb.collection('document_checks').getFullList({
    filter: `land_id = "${landId}"`,
  })
}

export async function uploadDocument(landId: string, documentKey: string, file: File) {
  let existing: any = null
  try {
    existing = await pb
      .collection('document_checks')
      .getFirstListItem(`land_id = "${landId}" && document_key = "${documentKey}"`)
  } catch {
    /* intentionally ignored */
  }

  const formData = new FormData()
  formData.append('land_id', landId)
  formData.append('document_key', documentKey)
  formData.append('is_completed', 'true')
  formData.append('document_file', file)

  let record: any
  if (existing) {
    record = await pb.collection('document_checks').update(existing.id, formData)
  } else {
    record = await pb.collection('document_checks').create(formData)
  }

  const fileName = Array.isArray(record.document_file)
    ? record.document_file[0]
    : record.document_file

  if (fileName) {
    try {
      const fileUrl = pb.files.getURL(record, fileName)
      record = await pb.collection('document_checks').update(record.id, {
        document_url: fileUrl,
      })
    } catch (e) {
      console.error('Failed to set document_url:', e)
    }
  }

  return record
}

export function getDocumentLabel(key: string): string {
  const labels: Record<string, string> = {
    cpf: 'CPF',
    rg: 'RG',
    'certidao-nascimento': 'Certidão de Nascimento',
    'comprovante-residencia': 'Comprovante de Residência',
    matricula: 'Matrícula',
    ccir: 'CCIR',
    itr: 'ITR',
    car: 'CAR',
    ibama: 'IBAMA',
  }
  if (labels[key]) return labels[key]
  return key.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
