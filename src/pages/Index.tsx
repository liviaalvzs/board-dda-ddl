import { useState, useEffect, useMemo } from 'react'
import { KanbanBoard } from '@/components/kanban/KanbanBoard'
import { KanbanCardType, KanbanColumnType } from '@/types/kanban'
import { useToast } from '@/hooks/use-toast'
import { AlertCircle, RefreshCcw, Leaf, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useRealtime } from '@/hooks/use-realtime'
import pb from '@/lib/pocketbase/client'

const KANBAN_COLUMNS: KanbanColumnType[] = [
  { id: 'assinatura-carta', title: 'Assinatura da carta proposta', color: 'bg-brand-warning' },
  { id: 'aguardando-doc', title: 'Aguardando documentação básica', color: 'bg-brand-warning' },
  { id: 'emissao-certidoes', title: 'Emissão das certidões', color: 'bg-brand-info' },
  {
    id: 'distribuida-escritorio',
    title: 'Distribuída ao escritório externo',
    color: 'bg-brand-info',
  },
  { id: 'dda', title: 'DDA', color: 'bg-brand-alternative' },
  {
    id: 'analise-interna-preliminar',
    title: 'Análise interna DD preliminar',
    color: 'bg-brand-alternative',
  },
  { id: 'dd-conclusiva', title: 'DD conclusiva', color: 'bg-brand-secondary' },
  {
    id: 'analise-interna-conclusiva',
    title: 'Análise interna DD conclusiva',
    color: 'bg-brand-primary',
  },
]

export default function Index() {
  const [cards, setCards] = useState<KanbanCardType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const { toast } = useToast()

  // Filters State
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedResponsible, setSelectedResponsible] = useState('all')
  const [selectedCluster, setSelectedCluster] = useState('all')
  const [selectedState, setSelectedState] = useState('all')

  // Data State
  const [users, setUsers] = useState<any[]>([])
  const [metadata, setMetadata] = useState<Record<string, any>>({})

  useEffect(() => {
    pb.collection('users').getFullList().then(setUsers).catch(console.error)
  }, [])

  const fetchData = async (silent = false) => {
    if (!silent) setIsLoading(true)
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
      setMetadata(Object.fromEntries(metadataMap))

      const newMetadataPromises: Promise<any>[] = []

      const mappedCards: KanbanCardType[] = list.map((item: any) => {
        let stageId = KANBAN_COLUMNS[0].id
        const displaySerial = item.clusterSerial || item.external_id || item.externalId || item.id
        const meta = metadataMap.get(displaySerial) || metadataMap.get(item.id)

        if (meta && meta.status) {
          stageId = meta.status
        } else if (!meta) {
          newMetadataPromises.push(
            pb
              .collection('land_metadata')
              .create({
                external_id: displaySerial,
                status: stageId,
              })
              .catch((e) => console.error('Failed to init land_metadata', e)),
          )
        }

        const baseName = item.name || 'Propriedade sem nome'
        const title = displaySerial ? `${baseName} - ${displaySerial}` : baseName

        const responsibleName =
          meta?.expand?.responsible_user?.name ||
          meta?.expand?.responsible_user?.email ||
          'Sem responsável'

        return {
          id: displaySerial,
          title,
          name: item.name,
          clusterSerial: displaySerial,
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
      if (!silent) setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Real-time synchronization
  useRealtime('land_metadata', () => {
    fetchData(true)
  })

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

  // Derived options for filters
  const uniqueClusters = useMemo(() => {
    const prefixes = cards
      .map((c) => c.clusterSerial || c.id)
      .filter((id) => typeof id === 'string' && id.includes('-'))
      .map((id) => id.substring(0, 3).toUpperCase())
    return Array.from(new Set(prefixes)).sort()
  }, [cards])

  const uniqueStates = useMemo(() => {
    const states = cards.map((c) => c.location.state).filter((s) => s && s !== 'NA')
    return Array.from(new Set(states)).sort()
  }, [cards])

  // Filtered Cards
  const filteredCards = useMemo(() => {
    return cards.filter((c) => {
      const meta =
        metadata[c.id] || Object.values(metadata).find((m: any) => m.external_id === c.id)
      const displayId = c.clusterSerial || c.id

      const matchSearch =
        !searchQuery ||
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.code && c.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.name && c.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        displayId.toLowerCase().includes(searchQuery.toLowerCase())

      const matchResponsible =
        selectedResponsible === 'all' || meta?.responsible_user === selectedResponsible

      const matchCluster =
        selectedCluster === 'all' ||
        displayId.toUpperCase().startsWith(`${selectedCluster.toUpperCase()}-`)

      const matchState = selectedState === 'all' || c.location.state === selectedState

      return matchSearch && matchResponsible && matchCluster && matchState
    })
  }, [cards, metadata, searchQuery, selectedResponsible, selectedCluster, selectedState])

  const resetFilters = () => {
    setSearchQuery('')
    setSelectedResponsible('all')
    setSelectedCluster('all')
    setSelectedState('all')
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-brand-background">
      {/* Filter Bar */}
      <div className="flex flex-col lg:flex-row gap-4 p-4 border-b bg-white shrink-0 lg:items-center">
        <div className="relative w-full lg:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por nome ou cluster serial..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
          <Select value={selectedResponsible} onValueChange={setSelectedResponsible}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Responsáveis</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name || u.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedCluster} onValueChange={setSelectedCluster}>
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue placeholder="Cluster" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos (Cluster)</SelectItem>
              {uniqueClusters.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedState} onValueChange={setSelectedState}>
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos (Estado)</SelectItem>
              {uniqueStates.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            onClick={resetFilters}
            className="w-full sm:w-auto flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Limpar
          </Button>
        </div>
      </div>

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
              onClick={() => fetchData()}
              className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white flex items-center gap-2"
            >
              <RefreshCcw className="w-4 h-4" />
              Recarregar
            </Button>
          </div>
        </div>
      ) : filteredCards.length === 0 && !isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-fade-in bg-gray-50/50">
          <Leaf className="w-12 h-12 text-muted-foreground mb-4 opacity-20" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Nenhuma terra encontrada</h2>
          <p className="text-muted-foreground mb-6">
            Não encontramos nenhum registro com os filtros aplicados.
          </p>
          <Button variant="outline" onClick={resetFilters}>
            Limpar Filtros
          </Button>
        </div>
      ) : (
        <KanbanBoard
          columns={KANBAN_COLUMNS}
          cards={filteredCards}
          isLoading={isLoading}
          onMoveCard={handleMoveCard}
        />
      )}
    </div>
  )
}
