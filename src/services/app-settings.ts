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

export async function getDelayedThresholdDays(): Promise<number> {
  const value = await getSetting('delayed_threshold_days')
  const parsed = parseInt(value || '7', 10)
  return isNaN(parsed) || parsed <= 0 ? 7 : parsed
}
