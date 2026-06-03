import { useState, useEffect } from 'react'
import { KanbanBoard } from '@/components/kanban/KanbanBoard'
import { KanbanCardType, KanbanColumnType } from '@/types/kanban'
import { useToast } from '@/hooks/use-toast'
import { AlertCircle, RefreshCcw, Leaf } from 'lucide-react'
import { Button } from '@/components/ui/button'
import pb from '@/lib/pocketbase/client'

const KANBAN_COLUMNS: KanbanColumnType[] = [
  { id: 'assinatura-carta', title: 'Assinatura da carta proposta', color: 'bg-brand-warning' },
  { id: 'aguardando-doc', title: 'Aguardando documentacao basica', color: 'bg-brand-warning' },
  { id: 'emissao-certidoes', title: 'Emissao das certidoes', color: 'bg-brand-info' },
  {
    id: 'distribuida-escritorio',
    title: 'Distribuida ao escritorio externo',
    color: 'bg-brand-info',
  },
  { id: 'dda', title: 'DDA', color: 'bg-brand-alternative' },
  {
    id: 'analise-interna-preliminar',
    title: 'Analise interna DD preliminar',
    color: 'bg-brand-alternative',
  },
  { id: 'dd-conclusiva', title: 'DD conclusiva', color: 'bg-brand-secondary' },
  {
    id: 'analise-interna-conclusiva',
    title: 'Analise interna DD conclusiva',
    color: 'bg-brand-primary',
  },
]

export default function Index() {
  const [cards, setCards] = useState<KanbanCardType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const { toast } = useToast()

  const fetchData = async () => {
    setIsLoading(true)
    setHasError(false)

    try {
      const data = await pb.send(
        '/backend/v1/lands?limit=25&offset=0&statusGroupNames=Due+Diligence',
        {
          method: 'GET',
        },
      )

      const list: any[] = Array.isArray(data)
        ? data
        : (data.data?.items ?? data.items ?? data.data ?? [])

      const metadataRecords = await pb
        .collection('land_metadata')
        .getFullList({ expand: 'responsible_user' })
      const metadataMap = new Map(metadataRecords.map((r: any) => [r.external_id, r]))

      const newMetadataPromises: Promise<any>[] = []

      const mappedCards: KanbanCardType[] = list.map((item: any) => {
        let stageId = KANBAN_COLUMNS[0].id
        const meta = metadataMap.get(item.id)

        if (meta && meta.status) {
          stageId = meta.status
        } else if (!meta) {
          newMetadataPromises.push(
            pb
              .collection('land_metadata')
              .create({
                external_id: item.id,
                status: stageId,
              })
              .catch((e) => console.error('Failed to init land_metadata', e)),
          )
        }

        const baseName = item.name || 'Propriedade sem nome'
        const title = item.clusterSerial ? `${baseName} - ${item.clusterSerial}` : baseName

        const responsibleName = meta?.expand?.responsible_user?.name || 'Sem responsável'

        return {
          id: item.id,
          title,
          name: item.name,
          clusterSerial: item.clusterSerial,
          code: item.code || item.sicarCode || item.agrotoolsCode,
          location: {
            city: item.city || item.geomCityName || 'Desconhecido',
            state: item.geomAcronymState || item.state || 'NA',
          },
          owner: item.owner || 'Desconhecido',
          area: item.area || 0,
          ddaStatus: item.statusGroup?.name || item.status || 'N/A',
          statusType: 'info',
          responsible: responsibleName,
          stageId,
        }
      })

      if (newMetadataPromises.length > 0) {
        await Promise.allSettled(newMetadataPromises)
      }

      setCards(mappedCards)
    } catch (err) {
      console.error('Error fetching cards:', err)
      setHasError(true)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleMoveCard = (cardId: string, targetStageId: string) => {
    const card = cards.find((c) => c.id === cardId)
    if (!card || card.stageId === targetStageId) return

    setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, stageId: targetStageId } : c)))

    toast({
      title: 'Card movido com sucesso!',
      description: `O card foi movido para a nova etapa.`,
      duration: 3000,
      className: 'bg-brand-primary text-white border-none',
    })
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-brand-background">
      {hasError ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
          <div className="bg-white p-8 rounded-2xl shadow-elevation max-w-md w-full flex flex-col items-center">
            <div className="w-16 h-16 bg-brand-red/10 rounded-full flex items-center justify-center mb-6">
              <AlertCircle className="w-8 h-8 text-brand-red" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              Erro ao carregar dados. Por favor, tente novamente.
            </h2>
            <p className="text-muted-foreground mb-8">
              Não foi possível carregar as informações do board. Por favor, tente novamente.
            </p>
            <Button
              onClick={fetchData}
              className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white flex items-center gap-2"
            >
              <RefreshCcw className="w-4 h-4" />
              Recarregar
            </Button>
          </div>
        </div>
      ) : (
        <KanbanBoard
          columns={KANBAN_COLUMNS}
          cards={cards}
          isLoading={isLoading}
          onMoveCard={handleMoveCard}
        />
      )}
    </div>
  )
}
