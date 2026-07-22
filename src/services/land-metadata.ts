import pb from '@/lib/pocketbase/client'
import { ClientResponseError } from 'pocketbase'

export interface LandMetadataUpsertParams {
  externalId: string
  externalOffices?: string | null
  responsibleUser?: string | null
  ownerMaritalStatus?: string | null
  riskLevel?: string | null
  ddaStatus?: string | null
  status?: string | null
}

function normalizeRelationValue(value: string | null | undefined): string {
  if (value === null || value === undefined || value === '') return ''
  if (Array.isArray(value)) return value[0] || ''
  return String(value)
}

function buildPayload(data: Partial<LandMetadataUpsertParams>): Record<string, any> {
  const payload: Record<string, any> = {}
  if (data.externalOffices !== undefined) {
    payload.external_offices = normalizeRelationValue(data.externalOffices)
  }
  if (data.responsibleUser !== undefined) {
    payload.responsible_user = normalizeRelationValue(data.responsibleUser)
  }
  if (data.ownerMaritalStatus !== undefined) {
    payload.owner_marital_status = data.ownerMaritalStatus || null
  }
  if (data.riskLevel !== undefined) {
    payload.risk_level = data.riskLevel || null
  }
  if (data.ddaStatus !== undefined) {
    payload.dda_status = data.ddaStatus || null
  }
  if (data.status !== undefined) {
    payload.status = data.status || null
  }
  return payload
}

async function createStatusHistoryLog(
  externalId: string,
  previousStatus: string | null,
  newStatus: string,
): Promise<void> {
  const userId = pb.authStore.record?.id
  if (!userId) return

  try {
    await pb.collection('history_logs').create({
      land_id: externalId,
      user_id: userId,
      action_description: `Status alterado de ${previousStatus || 'N/A'} para ${newStatus}`,
      change_details: {
        field: 'status',
        old: previousStatus || 'N/A',
        new: newStatus,
      },
    })
  } catch (e) {
    console.error('[upsertLandMetadata] Failed to create history log:', e)
  }
}

export async function upsertLandMetadata(
  externalId: string,
  data: Partial<LandMetadataUpsertParams>,
): Promise<any> {
  const query = `external_id="${externalId}"`
  let existing: any = null
  let previousStatus: string | null = null

  try {
    existing = await pb
      .collection('land_metadata')
      .getFirstListItem(query, { expand: 'responsible_user,external_offices' })
    previousStatus = existing.status || null
  } catch (err) {
    if (err instanceof ClientResponseError && err.status !== 404) {
      throw err
    }
  }

  const payload = buildPayload(data)

  let record: any

  if (existing) {
    try {
      record = await pb.collection('land_metadata').update(existing.id, payload)
    } catch (err) {
      console.error('[upsertLandMetadata] Update failed:', {
        id: existing.id,
        payload,
        error: err instanceof ClientResponseError ? err.response : err,
      })
      throw err
    }
  } else {
    try {
      record = await pb.collection('land_metadata').create({
        external_id: externalId,
        ...payload,
      })
    } catch (err) {
      console.error('[upsertLandMetadata] Create failed:', {
        externalId,
        payload,
        error: err instanceof ClientResponseError ? err.response : err,
      })
      throw err
    }
  }

  if (data.status !== undefined && previousStatus !== data.status) {
    await createStatusHistoryLog(externalId, previousStatus, data.status)
  }

  return record
}
