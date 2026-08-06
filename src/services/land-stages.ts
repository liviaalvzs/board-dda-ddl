import pb from '@/lib/pocketbase/client'
import { KANBAN_COLUMNS } from '@/lib/kanban-columns'

/** Etapa da API externa que marca a entrada da terra no nosso board. */
const SOURCE_STAGE = 'diligencia em confeccao'

/** Primeira coluna do board — é ela que recebe a data vinda da API. */
export const FIRST_STAGE_ID = KANBAN_COLUMNS[0].id

function normalize(value: unknown): string {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Data de entrada da terra em "Diligência em confecção", conforme a API de
 * status — a mesma que aparece na linha do tempo de diligência externa.
 *
 * Quando a terra passou pela etapa mais de uma vez, vale a ocorrência MAIS
 * RECENTE: é a passagem em andamento. Usar a mais antiga traria a data de um
 * ciclo anterior, às vezes de mais de um ano atrás.
 */
export async function fetchFirstStageEntry(externalId: string): Promise<string | null> {
  if (!externalId) return null

  try {
    const res: any = await pb.send(
      `/backend/v1/land-status?landIds=${encodeURIComponent(externalId)}`,
      { method: 'GET' },
    )
    const items: any[] = res?.data?.items || res?.items || []

    let latest: string | null = null
    for (const item of items) {
      if (normalize(item?.status?.name) !== SOURCE_STAGE) continue
      const when = item.startDate || item.creationDate
      if (!when) continue
      if (!latest || new Date(when).getTime() > new Date(latest).getTime()) {
        latest = when
      }
    }

    return latest ? new Date(latest).toISOString() : null
  } catch (err) {
    console.error('[fetchFirstStageEntry] falha ao consultar status da terra', externalId, err)
    return null
  }
}
