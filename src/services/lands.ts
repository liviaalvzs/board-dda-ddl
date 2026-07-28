import pb from '@/lib/pocketbase/client'
import { KANBAN_COLUMN_IDS } from '@/lib/kanban-columns'

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
  if (Array.isArray(res)) return res
  if (Array.isArray(res.data)) return res.data
  if (Array.isArray(res.items)) return res.items
  if (res.data && typeof res.data === 'object' && Array.isArray(res.data.items)) {
    return res.data.items
  }
  return []
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

export async function fetchKanbanLands(): Promise<{
  lands: LandItem[]
  metadataMap: Map<string, any>
}> {
  const [allLands, metaMap] = await Promise.all([fetchAllLands(), fetchAllLandMetadata()])

  const filteredLands = allLands.filter((land) => {
    const key1 = land.id || ''
    const key2 = land.external_id || ''
    const meta = metaMap.get(key1) || metaMap.get(key2)
    return meta && typeof meta.status === 'string' && KANBAN_COLUMN_IDS.has(meta.status)
  })

  return { lands: filteredLands, metadataMap: metaMap }
}
