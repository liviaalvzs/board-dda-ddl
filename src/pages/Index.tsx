import { useState, useEffect, useMemo } from 'react'
import { KanbanBoard } from '@/components/kanban/KanbanBoard'
import { KanbanCardType, KanbanColumnType } from '@/types/kanban'
import { useToast } from '@/hooks/use-toast'
import { AlertCircle, RefreshCcw, Leaf, Search, X, Filter, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { useRealtime } from '@/hooks/use-realtime'
import pb from '@/lib/pocketbase/client'
import { Badge } from '@/components/ui/badge'
import { getStatusLabel } from '@/lib/status-mapping'
import { useAuth } from '@/hooks/use-auth'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Trash2, Loader2, FileX2 } from 'lucide-react'

const KANBAN_COLUMNS: KanbanColumnType[] = [
  { id: 'assinatura-carta', title: getStatusLabel('assinatura-carta'), color: 'bg-slate-400' },
  { id: 'aguardando-doc', title: getStatusLabel('aguardando-doc'), color: 'bg-amber-400' },
  { id: 'emissao-certidoes', title: getStatusLabel('emissao-certidoes'), color: 'bg-sky-400' },
  {
    id: 'analise-interna-preliminar',
    title: getStatusLabel('analise-interna-preliminar'),
    color: 'bg-indigo-400',
  },
  { id: 'dd-conclusiva', title: getStatusLabel('dd-conclusiva'), color: 'bg-fuchsia-400' },
  {
    id: 'analise-interna-conclusiva',
    title: getStatusLabel('analise-interna-conclusiva'),
    color: 'bg-emerald-500',
  },
]

export default function Index() {
  const [cards, setCards] = useState<KanbanCardType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const { toast } = useToast()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedResponsible, setSelectedResponsible] = useState('all')
  const [selectedCluster, setSelectedCluster] = useState('all')
  const [selectedState, setSelectedState] = useState('all')
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  const [users, setUsers] = useState<any[]>([])
  const [metadata, setMetadata] = useState<Record<string, any>>({})
  const { isAdmin } = useAuth()
  const [isResetting, setIsResetting] = useState(false)
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)
  const [resetError, setResetError] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deleteError, setDeleteError] = useState(false)

  const handleResetAllLands = async () => {
    setIsResetting(true)
    setResetError(false)
    try {
      const result = await pb.send('/backend/v1/reset-all-lands', { method: 'POST' })
      const c = result.counts || {}
      console.log(
        `[Admin] All lands reset. Deleted ${c.land_metadata || 0} lands, ${c.comments || 0} comments, ${c.document_checks || 0} documents, ${c.history_logs || 0} history logs. Re-import triggered.`,
      )
      setIsResetDialogOpen(false)
      toast({
        title: 'Reset concluído',
        description: 'Todos os dados foram resetados. Reimportando terras...',
        duration: 3000,
      })
      await fetchData()
    } catch (err) {
      console.error('[Admin] Reset failed:', err)
      setResetError(true)
    } finally {
      setIsResetting(false)
    }
  }

  const handleDeleteAllLandMetadata = async () => {
    setIsDeleting(true)
    setDeleteError(false)
    try {
      const result = await pb.send('/backend/v1/delete-all-land-metadata', { method: 'POST' })
      const c = result.counts || {}
      const deletedCount = c.land_metadata || 0
      console.log(
        `[Admin] All land metadata deleted (no reimport). Deleted ${deletedCount} lands, ${c.comments || 0} comments, ${c.document_checks || 0} documents, ${c.history_logs || 0} history logs.`,
      )
      setIsDeleteDialogOpen(false)
      toast({
        title: 'Exclusão concluída',
        description: `${deletedCount} ${deletedCount === 1 ? 'propriedade excluída' : 'propriedades excluídas'} com sucesso.`,
        duration: 4000,
      })
      setCards([])
      setMetadata({})
    } catch (err) {
      console.error('[Admin] Delete all land metadata failed:', err)
      setDeleteError(true)
    } finally {
      setIsDeleting(false)
    }
  }

  useEffect(() => {
    pb.collection('users').getFullList().then(setUsers).catch(console.error)
  }, [])

  const fetchData = async (silent = false) => {
    if (!silent) setIsLoading(true)
    setHasError(false)

    try {
      const data = await pb.send(
        '/backend/v1/lands?limit=25&offset=0&statusGroupNames=Due+Diligence',
        { method: 'GET' },
      )

      const list: any[] = Array.isArray(data)
        ? data
        : (data.data?.items ?? data.items ?? data.data ?? [])

      const metadataRecords = await pb
        .collection('land_metadata')
        .getFullList({ expand: 'responsible_user,external_offices' })
      const metadataMap = new Map(metadataRecords.map((r: any) => [r.external_id, r]))
      setMetadata(Object.fromEntries(metadataMap))

      const newMetadataPromises: Promise<any>[] = []

      const mappedCards: KanbanCardType[] = list.map((item: any) => {
        let stageId = KANBAN_COLUMNS[0].id
        const displaySerial = item.clusterSerial || item.external_id || item.externalId || item.id
        const meta = metadataMap.get(item.id) || metadataMap.get(displaySerial)

        if (meta && meta.status) {
          stageId = meta.status
        } else if (!meta) {
          newMetadataPromises.push(
            pb
              .collection('land_metadata')
              .create({ external_id: item.id, status: stageId })
              .catch((e) => console.error('Failed to init land_metadata', e)),
          )
        }

        const baseName = item.name || 'Propriedade sem nome'
        const title = displaySerial ? `${baseName} - ${displaySerial}` : baseName

        const responsibleName =
          meta?.expand?.responsible_user?.name ||
          meta?.expand?.responsible_user?.email ||
          'Sem responsável'

        const externalOfficeName = meta?.expand?.external_offices?.name || 'Sem Escritório'

        return {
          id: item.id,
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
          externalOffice: externalOfficeName,
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

  useRealtime('land_metadata', () => {
    fetchData(true)
  })

  const handleMoveCard = (cardId: string, targetStageId: string) => {
    const card = cards.find((c) => c.id === cardId)
    if (!card || card.stageId === targetStageId) return

    setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, stageId: targetStageId } : c)))

    toast({
      title: 'Propriedade movida',
      description: `A propriedade foi movida para a nova etapa.`,
      duration: 3000,
    })
  }

  const allCards = useMemo(() => cards, [cards])

  const uniqueClusters = useMemo(() => {
    const prefixes = allCards
      .map((c) => c.clusterSerial || c.id)
      .filter((id) => typeof id === 'string' && id.includes('-'))
      .map((id) => id.substring(0, 3).toUpperCase())
    return Array.from(new Set(prefixes)).sort()
  }, [allCards])

  const uniqueStates = useMemo(() => {
    const states = allCards.map((c) => c.location.state).filter((s) => s && s !== 'NA')
    return Array.from(new Set(states)).sort()
  }, [allCards])

  const filteredCards = useMemo(() => {
    return allCards.filter((c) => {
      const meta =
        metadata[c.id] ||
        Object.values(metadata).find(
          (m: any) => m.external_id === c.id || m.external_id === c.clusterSerial,
        )
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
  }, [allCards, metadata, searchQuery, selectedResponsible, selectedCluster, selectedState])

  const resetFilters = () => {
    setSearchQuery('')
    setSelectedResponsible('all')
    setSelectedCluster('all')
    setSelectedState('all')
  }

  const activeFilterCount =
    (searchQuery ? 1 : 0) +
    (selectedResponsible !== 'all' ? 1 : 0) +
    (selectedCluster !== 'all' ? 1 : 0) +
    (selectedState !== 'all' ? 1 : 0)

  const FilterPanel = () => (
    <div className="flex flex-col gap-6 pt-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">Pesquisar</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Nome, código, serial..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white"
          />
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-slate-900 border-b pb-2">Localização</h4>
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-600">Estado</label>
          <Select value={selectedState} onValueChange={setSelectedState}>
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Estados</SelectItem>
              {uniqueStates.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-600">Cluster</label>
          <Select value={selectedCluster} onValueChange={setSelectedCluster}>
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Clusters</SelectItem>
              {uniqueClusters.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-slate-900 border-b pb-2">Equipe</h4>
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-600">Responsável</label>
          <Select value={selectedResponsible} onValueChange={setSelectedResponsible}>
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="Selecione..." />
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
        </div>
      </div>

      {activeFilterCount > 0 && (
        <Button
          variant="outline"
          onClick={resetFilters}
          className="w-full mt-4 flex items-center gap-2 border-slate-200 text-slate-600"
        >
          <X className="w-4 h-4" />
          Limpar Filtros
        </Button>
      )}
    </div>
  )

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-white relative">
      <div className="px-4 sm:px-6 py-4 bg-white border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 z-10">
        <div>
          <Breadcrumb className="mb-2">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/" className="text-slate-500">
                  Home
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="font-semibold text-brand-primary">
                  Terras (Due Diligence)
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Controle DDL</h1>
            <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-medium">
              {filteredCards.length} {filteredCards.length === 1 ? 'propriedade' : 'propriedades'}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <>
              <AlertDialog
                open={isDeleteDialogOpen}
                onOpenChange={(open) => {
                  setIsDeleteDialogOpen(open)
                  setDeleteError(false)
                }}
              >
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex items-center gap-2 border-amber-200 text-amber-700 hover:bg-amber-50"
                  >
                    <FileX2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Delete All Land Metadata</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete All Land Metadata?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete <strong>all</strong> land metadata records?
                      This will also delete all associated comments, document checks, and history
                      logs. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  {deleteError && (
                    <p className="text-sm text-rose-600 font-medium">
                      Delete failed. Data may be in an inconsistent state. Please try again.
                    </p>
                  )}
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={(e) => {
                        e.preventDefault()
                        handleDeleteAllLandMetadata()
                      }}
                      disabled={isDeleting}
                      className="bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        'Delete All'
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <AlertDialog
                open={isResetDialogOpen}
                onOpenChange={(open) => {
                  setIsResetDialogOpen(open)
                  setResetError(false)
                }}
              >
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex items-center gap-2 border-rose-200 text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Reset All Lands</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset All Lands?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all land records, including comments, documents,
                      and history logs. Land data will be re-imported from the API on the next
                      fetch. Are you sure?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  {resetError && (
                    <p className="text-sm text-rose-600 font-medium">
                      Reset failed. Please try again.
                    </p>
                  )}
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isResetting}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={(e) => {
                        e.preventDefault()
                        handleResetAllLands()
                      }}
                      disabled={isResetting}
                      className="bg-rose-600 hover:bg-rose-700 text-white"
                    >
                      {isResetting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Resetting...
                        </>
                      ) : (
                        'Confirm'
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
          <div className="hidden lg:flex items-center">
            <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2 border-slate-200">
                  <SlidersHorizontal className="w-4 h-4" />
                  Filtros
                  {activeFilterCount > 0 && (
                    <span className="ml-1 bg-brand-primary text-white w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[320px] sm:w-[400px] bg-white overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Filtros</SheetTitle>
                  <SheetDescription>
                    Refine a visualização das propriedades no board.
                  </SheetDescription>
                </SheetHeader>
                <FilterPanel />
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden flex flex-col">
        {hasError ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 max-w-md w-full flex flex-col items-center">
              <div className="w-16 h-16 bg-white border border-rose-100 rounded-full flex items-center justify-center mb-6 shadow-sm">
                <AlertCircle className="w-8 h-8 text-rose-500" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Erro ao carregar dados</h2>
              <p className="text-slate-500 mb-8">
                Não foi possível conectar ao servidor. Tente novamente.
              </p>
              <Button onClick={() => fetchData()} className="w-full">
                <RefreshCcw className="w-4 h-4 mr-2" />
                Recarregar
              </Button>
            </div>
          </div>
        ) : filteredCards.length === 0 && !isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
            <Leaf className="w-12 h-12 text-slate-300 mb-4" />
            <h2 className="text-xl font-semibold text-slate-800 mb-2">
              Nenhuma propriedade encontrada
            </h2>
            <p className="text-slate-500 mb-6">Não há registros com os filtros atuais.</p>
            {activeFilterCount > 0 && (
              <Button variant="outline" onClick={resetFilters}>
                Limpar Filtros
              </Button>
            )}
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

      <div className="fixed bottom-6 right-6 lg:hidden z-50">
        <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <SheetTrigger asChild>
            <Button
              size="icon"
              className="h-14 w-14 rounded-full shadow-xl bg-brand-primary hover:bg-brand-primary/90 text-white relative"
            >
              <Filter className="w-6 h-6" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-400 text-amber-950 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shadow-sm">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[85vh] bg-white rounded-t-3xl px-6">
            <SheetHeader className="text-left mb-2 mt-2">
              <SheetTitle>Filtros</SheetTitle>
              <SheetDescription>Refine a lista de propriedades.</SheetDescription>
            </SheetHeader>
            <div className="overflow-y-auto pb-8 h-full">
              <FilterPanel />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  )
}
