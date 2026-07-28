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

function extractLands(res: any): LandItem[] {
  if (!res) return []
  const data = res.data || res.items || res
  const items = Array.isArray(data) ? data : Array.isArray(res) ? res : []
  return items
}

export async function fetchAllLands(): Promise<LandItem[]> {
  const res = await pb.send('/backend/v1/lands?includesShapeWgs84=true', { method: 'GET' })
  return extractLands(res)
}

export async function fetchLandIds(): Promise<string[]> {
  const res = await pb.send('/backend/v1/lands', { method: 'GET' })
  return extractLands(res)
    .map((item: any) => item.id || item.external_id || '')
    .filter(Boolean)
}

export async function fetchLandGeometries(): Promise<LandItem[]> {
  return fetchAllLands()
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
