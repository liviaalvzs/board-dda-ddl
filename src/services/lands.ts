import pb from '@/lib/pocketbase/client'

interface LandItem {
  id: string
  external_id?: string
  clusterSerial?: string
  name?: string
  owner?: string
  area?: number
  geomCityName?: string
  geomAcronymState?: string
  currentStatus?: {
    etapa?: string
    name?: string
  }
  shapeWgs84?: any
}

export async function fetchLandIds(): Promise<string[]> {
  const res = await pb.send('/backend/v1/lands', { method: 'GET' })
  const data = res?.data || res?.items || res || []
  const items = Array.isArray(data) ? data : []
  return items.map((item: any) => item.id || item.external_id || '').filter(Boolean)
}

export async function fetchLandGeometries(ids: string[]): Promise<LandItem[]> {
  if (ids.length === 0) return []

  const batchSize = 25
  const batches: string[][] = []

  for (let i = 0; i < ids.length; i += batchSize) {
    batches.push(ids.slice(i, i + batchSize))
  }

  const results = await Promise.allSettled(
    batches.map((batch) => {
      const idsParam = batch.join(',')
      return pb.send(
        `/backend/v1/lands?limit=25&ids=${encodeURIComponent(idsParam)}&includesShapeWgs84=true`,
        { method: 'GET' },
      )
    }),
  )

  const allLands: LandItem[] = []

  for (const result of results) {
    if (result.status === 'fulfilled') {
      const res = result.value
      const data = res?.data || res?.items || res || []
      const items = Array.isArray(data) ? data : []
      for (const item of items) {
        allLands.push(item)
      }
    }
  }

  return allLands
}

export async function fetchLandDetail(id: string): Promise<any> {
  return pb.send(`/backend/v1/lands/${id}`, { method: 'GET' })
}

export async function fetchAllLandMetadata(): Promise<Map<string, any>> {
  const records = await pb
    .collection('land_metadata')
    .getFullList({ expand: 'responsible_user,external_offices' })

  const map = new Map<string, any>()
  for (const record of records) {
    map.set(record.external_id, record)
  }
  return map
}

export async function fetchOpportunitiesByFilter(filter: {
  opportunityId?: string
  companyId?: string
  primaryOwner?: string
}): Promise<string[]> {
  const filters: string[] = []
  if (filter.opportunityId) {
    filters.push(`external_id="${filter.opportunityId}"`)
  }
  if (filter.companyId) {
    filters.push(`company_id="${filter.companyId}"`)
  }
  if (filter.primaryOwner) {
    filters.push(`primary_owner="${filter.primaryOwner}"`)
  }

  if (filters.length === 0) return []

  const filterStr = filters.join(' && ')
  const opportunities = await pb.collection('opportunities').getFullList({ filter: filterStr })

  if (opportunities.length === 0) return []

  const opportunityIds = opportunities.map((o) => o.id)
  const opportunityLands = await pb.collection('opportunity_lands').getFullList({
    filter: opportunityIds.map((id) => `opportunity_id="${id}"`).join(' || '),
  })

  return opportunityLands.map((ol) => ol.external_land_id).filter(Boolean)
}
