import { KanbanColumnType, KanbanCardType } from '@/types/kanban'
import { KanbanColumn } from './KanbanColumn'
import { Skeleton } from '@/components/ui/skeleton'
import { useState, useEffect, useMemo } from 'react'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'

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
  const [docChecksMap, setDocChecksMap] = useState<Record<string, { docs: number; dda: number }>>(
    {},
  )
  const { toast } = useToast()

  const fetchMetadata = async () => {
    try {
      const records = await pb
        .collection('land_metadata')
        .getFullList({ expand: 'responsible_user' })
      const map = records.reduce((acc, r) => ({ ...acc, [r.external_id]: r }), {})
      setMetadataMap(map)
    } catch (e) {
      console.error(e)
    }
  }

  const fetchDocumentChecks = async () => {
    try {
      const records = await pb.collection('document_checks').getFullList({
        filter: 'is_completed = true',
      })
      const map = records.reduce(
        (acc, r) => {
          if (!acc[r.land_id]) acc[r.land_id] = { docs: 0, dda: 0 }
          if (r.document_key === 'dda_existente' || r.document_key === 'dda_distribuida') {
            acc[r.land_id].dda += 1
          } else {
            acc[r.land_id].docs += 1
          }
          return acc
        },
        {} as Record<string, { docs: number; dda: number }>,
      )
      setDocChecksMap(map)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    fetchMetadata()
    fetchDocumentChecks()
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
        docChecksMap[c.clusterSerial || ''] || { docs: 0, dda: 0 }
      return {
        ...c,
        stageId: meta?.status || c.stageId,
        responsible: meta?.expand?.responsible_user?.name || 'Unassigned',
        completedDocs: checks.docs,
        completedDda: checks.dda,
        riskLevel: meta?.risk_level || '',
        ddaStatusLabel: meta?.dda_status || '',
        createdAt: meta?.created || new Date().toISOString(),
        updatedAt: meta?.updated || new Date().toISOString(),
      }
    })
  }, [cards, metadataMap, docChecksMap])

  const handleMoveCard = async (cardId: string, targetColumnId: string) => {
    onMoveCard(cardId, targetColumnId)
    try {
      const record = await pb
        .collection('land_metadata')
        .getFirstListItem(`external_id="${cardId}"`)
      await pb.collection('land_metadata').update(record.id, { status: targetColumnId })
    } catch (e) {
      try {
        await pb.collection('land_metadata').create({ external_id: cardId, status: targetColumnId })
      } catch (err) {
        console.error('Failed to update status', err)
        toast({
          title: 'Erro de conexão',
          description: 'Não foi possível salvar o novo status.',
          variant: 'destructive',
        })
      }
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
    <div className="flex-1 overflow-x-auto overflow-y-hidden p-4 sm:p-6 animate-fade-in">
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
