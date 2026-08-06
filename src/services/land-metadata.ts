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
  clusterSerial?: string | null
  name?: string | null
  dataAssinaturaCartaProposta?: string | null
  dataPedidoInicioDdl?: string | null
  dataRecebimentoPreliminarDdm?: string | null
  dataEstimadaRecebimentoDdlConclusiva?: string | null
  dataRecebimentoDdConclusiva?: string | null
  dataPedidoDda?: string | null
  dataRecebimentoDda?: string | null
  prestadorDda?: string | null
  /** Mapa { idDaEtapa: dataISO } com a entrada em cada etapa. */
  stageDates?: Record<string, string> | null
}

function normalizeRelationValue(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value === '') return null
  if (Array.isArray(value)) return value[0] || null
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
  if (data.clusterSerial !== undefined) {
    payload.cluster_serial = data.clusterSerial || null
  }
  if (data.name !== undefined) {
    payload.name = data.name || null
  }
  if (data.dataAssinaturaCartaProposta !== undefined) {
    payload.data_assinatura_carta_proposta = data.dataAssinaturaCartaProposta || null
  }
  if (data.dataPedidoInicioDdl !== undefined) {
    payload.data_pedido_inicio_ddl = data.dataPedidoInicioDdl || null
  }
  if (data.dataRecebimentoPreliminarDdm !== undefined) {
    payload.data_recebimento_preliminar_ddm = data.dataRecebimentoPreliminarDdm || null
  }
  if (data.dataEstimadaRecebimentoDdlConclusiva !== undefined) {
    payload.data_estimada_recebimento_ddl_conclusiva =
      data.dataEstimadaRecebimentoDdlConclusiva || null
  }
  if (data.dataRecebimentoDdConclusiva !== undefined) {
    payload.data_recebimento_dd_conclusiva = data.dataRecebimentoDdConclusiva || null
  }
  if (data.dataPedidoDda !== undefined) {
    payload.data_pedido_dda = data.dataPedidoDda || null
  }
  if (data.dataRecebimentoDda !== undefined) {
    payload.data_recebimento_dda = data.dataRecebimentoDda || null
  }
  if (data.prestadorDda !== undefined) {
    payload.prestador_dda = normalizeRelationValue(data.prestadorDda)
  }
  if (data.stageDates !== undefined) {
    payload.stage_dates = data.stageDates || {}
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
    existing = await pb.collection('land_metadata').getFirstListItem(query)
    previousStatus = existing.status || null
  } catch (err) {
    if (err instanceof ClientResponseError && err.status === 404) {
      // Record not found — will create below
    } else {
      throw err
    }
  }

  const payload = buildPayload(data)

  let record: any

  const EXPAND_RELATIONS = 'responsible_user,external_offices,prestador_dda'

  if (existing) {
    try {
      record = await pb.collection('land_metadata').update(existing.id, payload, {
        expand: EXPAND_RELATIONS,
      })
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
      const createPayload: Record<string, any> = {
        external_id: externalId,
        ...payload,
      }
      if (!('cluster_serial' in createPayload)) {
        createPayload.cluster_serial = ''
      }
      record = await pb.collection('land_metadata').create(createPayload, {
        expand: EXPAND_RELATIONS,
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
