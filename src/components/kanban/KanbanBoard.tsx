import { KanbanColumnType, KanbanCardType } from '@/types/kanban'
import { KanbanColumn } from './KanbanColumn'
import { Skeleton } from '@/components/ui/skeleton'
import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { upsertLandMetadata } from '@/services/land-metadata'
import { getDocumentTypes, type DocumentType } from '@/services/app-settings'
import { computeDocumentProgress, type OwnerType } from '@/lib/document-groups'

interface KanbanBoardProps {
  columns: KanbanColumnType[]
  cards: KanbanCardType[]
  isLoading: boolean
  onMoveCard: (cardId: string, targetColumnId: string) => void
  onCreateCard: (columnId: string, title: string) => void
}

export function KanbanBoard({
  columns,
  cards,
  isLoading,
  onMoveCard,
  onCreateCard,
}: KanbanBoardProps) {
  const [metadataMap, setMetadataMap] = useState<Record<string, any>>({})
  const [docChecksMap, setDocChecksMap] = useState<
    Record<
      string,
      {
        completedKeys: string[]
        notApplicableKeys: string[]
        details: Array<{ documentKey: string; userName: string; createdAt: string }>
      }
    >
  >({})
  const [docTypes, setDocTypes] = useState<DocumentType[]>([])
  const [savingCards, setSavingCards] = useState<Set<string>>(new Set())
  const pendingUpdatesRef = useRef<Record<string, string>>({})
  const { toast } = useToast()

  // Auto-scroll horizontal durante o arraste.
  //
  // O drag-and-drop nativo do HTML5 não rola o container sozinho. Com 12 etapas
  // o board é bem mais largo que a tela, e arrastar um card para uma coluna fora
  // do campo de visão era impossível: o ponteiro encostava na borda e parava ali.
  // Enquanto o ponteiro fica na faixa de borda, um loop de rAF rola o container,
  // mais rápido quanto mais perto da beirada.
  const scrollRef = useRef<HTMLDivElement>(null)
  const scrollSpeedRef = useRef(0)
  const scrollFrameRef = useRef(0)
  const lastDragOverRef = useRef(0)

  const stopAutoScroll = useCallback(() => {
    scrollSpeedRef.current = 0
    if (scrollFrameRef.current) {
      cancelAnimationFrame(scrollFrameRef.current)
      scrollFrameRef.current = 0
    }
  }, [])

  const runAutoScroll = useCallback(() => {
    const el = scrollRef.current
    // Se o ponteiro sai do board (passa sobre o cabeçalho, por exemplo), os
    // eventos de dragover param de chegar e a velocidade ficaria congelada — o
    // board rolaria sozinho até o fim. Sem dragover recente, para.
    const stale = Date.now() - lastDragOverRef.current > 200
    if (!el || scrollSpeedRef.current === 0 || stale) {
      scrollSpeedRef.current = 0
      scrollFrameRef.current = 0
      return
    }
    el.scrollLeft += scrollSpeedRef.current
    scrollFrameRef.current = requestAnimationFrame(runAutoScroll)
  }, [])

  const handleBoardDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      const el = scrollRef.current
      if (!el) return

      const EDGE_ZONE = 140 // faixa sensível em cada borda, em px
      const MAX_SPEED = 24 // px por frame quando o ponteiro encosta na beirada

      const rect = el.getBoundingClientRect()
      const fromLeft = e.clientX - rect.left
      const fromRight = rect.right - e.clientX

      let speed = 0
      if (fromLeft < EDGE_ZONE) {
        speed = -MAX_SPEED * ((EDGE_ZONE - Math.max(fromLeft, 0)) / EDGE_ZONE)
      } else if (fromRight < EDGE_ZONE) {
        speed = MAX_SPEED * ((EDGE_ZONE - Math.max(fromRight, 0)) / EDGE_ZONE)
      }

      lastDragOverRef.current = Date.now()
      scrollSpeedRef.current = speed

      if (speed !== 0 && !scrollFrameRef.current) {
        scrollFrameRef.current = requestAnimationFrame(runAutoScroll)
      } else if (speed === 0) {
        stopAutoScroll()
      }
    },
    [runAutoScroll, stopAutoScroll],
  )

  // O arraste pode terminar fora do board — soltando em qualquer lugar da página
  // ou cancelando com ESC — e aí nenhum handler do container dispara.
  useEffect(() => {
    window.addEventListener('dragend', stopAutoScroll)
    window.addEventListener('drop', stopAutoScroll)
    return () => {
      window.removeEventListener('dragend', stopAutoScroll)
      window.removeEventListener('drop', stopAutoScroll)
      stopAutoScroll()
    }
  }, [stopAutoScroll])

  const fetchMetadata = async () => {
    try {
      const records = await pb
        .collection('land_metadata')
        .getFullList({ expand: 'responsible_user,external_offices' })
      const map = records.reduce((acc, r) => ({ ...acc, [r.external_id]: r }), {})
      for (const [cardId, status] of Object.entries(pendingUpdatesRef.current)) {
        if (map[cardId]) {
          map[cardId] = { ...map[cardId], status }
        } else {
          map[cardId] = { external_id: cardId, status }
        }
      }
      setMetadataMap(map)
    } catch (e) {
      console.error(e)
    }
  }

  const fetchDocumentChecks = async () => {
    try {
      // Dois casos interessam: o documento entregue e o dispensado.
      //
      // `document_url` entra no filtro do entregue porque o arquivo vive só no
      // S3 — um check marcado como completo mas sem URL não conta como enviado.
      // É a mesma regra da aba Documentos; sem isso card e detalhe divergiam.
      const records = await pb.collection('document_checks').getFullList({
        filter: '(is_completed = true && document_url != "") || not_applicable = true',
        expand: 'user',
      })
      const map = records.reduce(
        (acc, r) => {
          if (!acc[r.land_id]) {
            acc[r.land_id] = { completedKeys: [], notApplicableKeys: [], details: [] }
          }

          if (r.not_applicable) {
            acc[r.land_id].notApplicableKeys.push(r.document_key)
            return acc
          }

          acc[r.land_id].completedKeys.push(r.document_key)
          const userName =
            r.expand?.user?.name || r.expand?.user?.email?.split('@')[0] || 'Desconhecido'
          acc[r.land_id].details.push({
            documentKey: r.document_key,
            userName,
            createdAt: r.created,
          })
          return acc
        },
        {} as Record<
          string,
          {
            completedKeys: string[]
            notApplicableKeys: string[]
            details: Array<{ documentKey: string; userName: string; createdAt: string }>
          }
        >,
      )
      setDocChecksMap(map)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    fetchMetadata()
    fetchDocumentChecks()
    // Os tipos definem o denominador de cada grupo — sem eles não há como saber
    // quantos documentos são esperados, nem a que grupo cada chave pertence.
    getDocumentTypes()
      .then(setDocTypes)
      .catch(() => setDocTypes([]))
  }, [])

  useRealtime('land_metadata', () => {
    fetchMetadata()
  })

  useRealtime('document_checks', () => {
    fetchDocumentChecks()
  })

  const enrichedCards = useMemo(() => {
    return cards.map((c) => {
      const meta = metadataMap[c.id] || metadataMap[c.clusterSerial || '']
      const checks = docChecksMap[c.id] ||
        docChecksMap[c.clusterSerial || ''] || {
          completedKeys: [],
          notApplicableKeys: [],
          details: [],
        }

      const docProgress = computeDocumentProgress(
        docTypes,
        (meta?.owner_type || '') as OwnerType,
        new Set(checks.completedKeys),
        new Set(checks.notApplicableKeys),
      )

      return {
        ...c,
        stageId: meta?.status || c.stageId,
        isSaving: savingCards.has(c.id),
        responsible: meta?.expand?.responsible_user?.name || 'Unassigned',
        externalOffice: meta?.expand?.external_offices?.name || 'Sem Escritório',
        docProgress,
        documentChecks: checks.details,
        riskLevel: meta?.risk_level || '',
        ddaEstimatedDate: meta?.data_pedido_dda || '',
        ddaReceivedDate: meta?.data_recebimento_dda || '',
        ddlEstimatedDate: meta?.data_estimada_ddl || '',
        ddlReceivedDate: meta?.data_recebimento_ddl || '',
        stageDates: meta?.stage_dates || {},
        createdAt: meta?.created || new Date().toISOString(),
        updatedAt: meta?.updated || new Date().toISOString(),
      }
    })
  }, [cards, metadataMap, docChecksMap, savingCards, docTypes])

  const validStatuses = useMemo(() => columns.map((c) => c.id), [columns])

  const handleMoveCard = async (cardId: string, targetColumnId: string) => {
    if (!validStatuses.includes(targetColumnId)) {
      toast({
        title: 'Status inválido',
        description: 'O status selecionado não é válido.',
        variant: 'destructive',
      })
      return
    }

    const card = enrichedCards.find((c) => c.id === cardId)
    const originalStageId = card?.stageId || ''

    if (originalStageId === targetColumnId) return

    const metaKey = metadataMap[cardId] ? cardId : card?.clusterSerial || cardId

    setSavingCards((prev) => new Set(prev).add(cardId))
    pendingUpdatesRef.current[cardId] = targetColumnId

    setMetadataMap((prev) => {
      if (prev[metaKey]) {
        return { ...prev, [metaKey]: { ...prev[metaKey], status: targetColumnId } }
      }
      return {
        ...prev,
        [cardId]: { external_id: cardId, status: targetColumnId },
      }
    })
    onMoveCard(cardId, targetColumnId)

    try {
      const record = await upsertLandMetadata(cardId, { status: targetColumnId })

      delete pendingUpdatesRef.current[cardId]

      setMetadataMap((prev) => ({
        ...prev,
        [cardId]: record,
      }))

      toast({
        title: 'Status atualizado',
        description: 'A propriedade foi movida com sucesso.',
      })
    } catch (e) {
      delete pendingUpdatesRef.current[cardId]

      setMetadataMap((prev) => {
        if (prev[metaKey]) {
          return { ...prev, [metaKey]: { ...prev[metaKey], status: originalStageId } }
        }
        const next = { ...prev }
        delete next[cardId]
        return next
      })
      if (originalStageId) {
        onMoveCard(cardId, originalStageId)
      }
      toast({
        title: 'Erro ao atualizar status',
        description: 'Não foi possível mover a propriedade. O card retornou à coluna original.',
        variant: 'destructive',
      })
    } finally {
      setSavingCards((prev) => {
        const next = new Set(prev)
        next.delete(cardId)
        return next
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4 sm:p-6 animate-fade-in">
        <div className="flex gap-4 sm:gap-6 h-full w-max">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="w-[280px] sm:w-[320px] flex-shrink-0 flex flex-col gap-4 bg-black/5 rounded-xl p-4"
            >
              <Skeleton className="h-6 w-3/4 bg-black/10" />
              <Skeleton className="h-[140px] w-full rounded-lg bg-black/5" />
              <Skeleton className="h-[140px] w-full rounded-lg bg-black/5" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div
      ref={scrollRef}
      onDragOver={handleBoardDragOver}
      onDrop={stopAutoScroll}
      className="flex-1 overflow-x-auto overflow-y-hidden p-4 sm:p-6 animate-fade-in"
    >
      <div className="flex gap-4 sm:gap-6 h-full w-max items-start">
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            cards={enrichedCards.filter((c) => c.stageId === column.id)}
            onDropCard={handleMoveCard}
            onCreateCard={onCreateCard}
          />
        ))}
      </div>
    </div>
  )
}
