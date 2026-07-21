import pb from '@/lib/pocketbase/client'

export interface LandMetadataUpsertParams {
  externalId: string
  externalOffices?: string | null
  responsibleUser?: string | null
  ownerMaritalStatus?: string | null
  riskLevel?: string | null
  ddaStatus?: string | null
  status?: string | null
}

export async function upsertLandMetadata(
  externalId: string,
  data: Partial<LandMetadataUpsertParams>,
): Promise<any> {
  const query = `external_id="${externalId}"`
  let existing: any = null

  try {
    existing = await pb
      .collection('land_metadata')
      .getFirstListItem(query, { expand: 'responsible_user,external_offices' })
  } catch (_) {
    // Record doesn't exist — will create
  }

  if (existing) {
    const updateData: Record<string, any> = {}
    if (data.externalOffices !== undefined) {
      updateData.external_offices = data.externalOffices
    }
    if (data.responsibleUser !== undefined) {
      updateData.responsible_user = data.responsibleUser
    }
    if (data.ownerMaritalStatus !== undefined) {
      updateData.owner_marital_status = data.ownerMaritalStatus
    }
    if (data.riskLevel !== undefined) {
      updateData.risk_level = data.riskLevel
    }
    if (data.ddaStatus !== undefined) {
      updateData.dda_status = data.ddaStatus
    }
    if (data.status !== undefined) {
      updateData.status = data.status
    }
    return await pb.collection('land_metadata').update(existing.id, updateData)
  }

  const createData: Record<string, any> = {
    external_id: externalId,
  }
  if (data.externalOffices !== undefined) {
    createData.external_offices = data.externalOffices
  }
  if (data.responsibleUser !== undefined) {
    createData.responsible_user = data.responsibleUser
  }
  if (data.ownerMaritalStatus !== undefined) {
    createData.owner_marital_status = data.ownerMaritalStatus
  }
  if (data.riskLevel !== undefined) {
    createData.risk_level = data.riskLevel
  }
  if (data.ddaStatus !== undefined) {
    createData.dda_status = data.ddaStatus
  }
  if (data.status !== undefined) {
    createData.status = data.status
  }
  return await pb.collection('land_metadata').create(createData)
}
