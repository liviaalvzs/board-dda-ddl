import pb from '@/lib/pocketbase/client'

export async function getSetting(key: string): Promise<string | null> {
  try {
    const record = await pb.collection('app_settings').getFirstListItem(`key="${key}"`)
    return record.value
  } catch {
    return null
  }
}

export async function updateSetting(key: string, value: string): Promise<void> {
  try {
    const record = await pb.collection('app_settings').getFirstListItem(`key="${key}"`)
    await pb.collection('app_settings').update(record.id, { value })
  } catch {
    await pb.collection('app_settings').create({ key, value })
  }
}

export interface StageThreshold {
  attention: number
  delayed: number
}

export async function getStageThresholds(): Promise<Record<string, StageThreshold>> {
  try {
    const value = await getSetting('stage_thresholds')
    if (!value) return {}
    const parsed = JSON.parse(value)
    return typeof parsed === 'object' && parsed !== null ? parsed : {}
  } catch {
    return {}
  }
}

export async function updateStageThresholds(
  thresholds: Record<string, StageThreshold>,
): Promise<void> {
  await updateSetting('stage_thresholds', JSON.stringify(thresholds))
}

export async function getDelayedThresholdDays(): Promise<number> {
  const value = await getSetting('delayed_threshold_days')
  const parsed = parseInt(value || '7', 10)
  return isNaN(parsed) || parsed <= 0 ? 7 : parsed
}

export async function getRequiredDocumentTypes(): Promise<string[]> {
  try {
    const value = await getSetting('required_document_types')
    const parsed = JSON.parse(value || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return ['cpf', 'rg', 'certidao-nascimento']
  }
}

export async function updateRequiredDocumentTypes(types: string[]): Promise<void> {
  await updateSetting('required_document_types', JSON.stringify(types))
}

export interface DocumentType {
  key: string
  label: string
  category?: string
  description?: string
  sortOrder?: number
}

export async function getDocumentTypes(): Promise<DocumentType[]> {
  try {
    const records = await pb.collection('document_types').getFullList({ sort: 'sort_order,name' })
    if (records.length > 0) {
      return records.map((r: any) => ({
        key: r.key,
        label: r.name,
        category: r.category,
        description: r.description || '',
        sortOrder: typeof r.sort_order === 'number' ? r.sort_order : undefined,
      }))
    }
  } catch {
    // fall through to app_settings
  }
  try {
    const value = await getSetting('document_types')
    const parsed = JSON.parse(value || '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item: any) => item && typeof item.key === 'string' && typeof item.label === 'string',
    )
  } catch {
    return []
  }
}

export async function updateDocumentTypes(types: DocumentType[]): Promise<void> {
  await updateSetting('document_types', JSON.stringify(types))
}
