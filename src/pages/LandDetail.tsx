import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { formatDistanceToNow, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  MessageSquare,
  Loader2,
  Info,
  Ruler,
  MapPin,
  User,
  FileText,
  History,
  ChevronLeft,
  Copy,
  Check,
  Paperclip,
  X,
  AlertCircle,
  Clock,
  FileIcon,
  Building2,
  Timer,
} from 'lucide-react'

import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { useDelayedThreshold } from '@/hooks/use-delayed-threshold'
import { DocumentChecklist } from '@/components/kanban/DocumentChecklist'
import { LawFirmSelector } from '@/components/kanban/LawFirmSelector'
import { StageTimeline } from '@/components/kanban/StageTimeline'

const VisuallyHidden = ({ children }: { children: React.ReactNode }) => (
  <span className="sr-only">{children}</span>
)

const CopyableField = ({ label, value, icon: Icon }: any) => {
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  const handleCopy = () => {
    if (!value) return
    navigator.clipboard.writeText(value.toString())
    setCopied(true)
    toast({ title: 'Copiado!', description: `${label} copiado para a área de transferência.` })
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col group">
      <span className="text-[11px] text-brand-primary/60 font-semibold mb-1 uppercase tracking-wider">
        {label}
      </span>
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-brand-primary/40 shrink-0" />}
        <span className="text-sm font-medium text-brand-primary truncate" title={value}>
          {value || 'N/A'}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          onClick={handleCopy}
        >
          {copied ? (
            <Check className="w-3 h-3 text-emerald-500" />
          ) : (
            <Copy className="w-3 h-3 text-brand-primary/40" />
          )}
        </Button>
      </div>
    </div>
  )
}

function CommentsSection({ landId }: { landId: string }) {
  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()
  const { toast } = useToast()

  const fetchComments = () => {
    pb.collection('comments')
      .getFullList({ filter: `land_id="${landId}"`, expand: 'user', sort: '-created' })
      .then(setComments)
      .catch(() => {})
  }

  useEffect(() => {
    fetchComments()
  }, [landId])

  useRealtime('comments', (e) => {
    if (e.record.land_id === landId) {
      fetchComments()
    }
  })

  const handleAdd = async () => {
    if (!newComment.trim() && !selectedFile) return
    if (!user) return

    try {
      const formData = new FormData()
      formData.append('land_id', landId)
      formData.append('user', user.id)
      formData.append('content', newComment.trim())
      if (selectedFile) {
        formData.append('attachments', selectedFile)
      }

      const record = await pb.collection('comments').create(formData)
      const expanded = await pb.collection('comments').getOne(record.id, { expand: 'user' })
      setComments([expanded, ...comments])
      setNewComment('')
      setSelectedFile(null)
    } catch (e) {
      toast({ title: 'Erro ao enviar comentário', variant: 'destructive' })
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este comentário?')) return
    try {
      await pb.collection('comments').delete(id)
      toast({ title: 'Comentário excluído com sucesso' })
    } catch (e) {
      toast({ title: 'Erro ao excluir comentário', variant: 'destructive' })
    }
  }

  const handleEditSave = async (id: string) => {
    if (!editingContent.trim()) return
    try {
      await pb.collection('comments').update(id, { content: editingContent.trim() })
      setEditingCommentId(null)
      setEditingContent('')
      toast({ title: 'Comentário atualizado com sucesso' })
    } catch (e) {
      toast({ title: 'Erro ao atualizar comentário', variant: 'destructive' })
    }
  }

  const renderAttachment = (c: any) => {
    if (!c.attachments) return null
    const attachment = Array.isArray(c.attachments) ? c.attachments[0] : c.attachments
    if (typeof attachment !== 'string') return null

    const fileUrl = pb.files.getURL(c, attachment)
    const isImage = attachment.match(/\.(jpeg|jpg|gif|png|webp)$/i)

    if (isImage) {
      return (
        <Dialog>
          <DialogTrigger asChild>
            <button className="block mt-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-secondary rounded-lg">
              <img
                src={fileUrl}
                alt="attachment"
                className="max-w-[200px] max-h-[200px] rounded-lg border border-brand-primary/10 object-cover shadow-sm hover:opacity-90 transition-opacity"
              />
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl bg-transparent border-none shadow-none p-0 flex justify-center [&>button]:bg-white/50 [&>button]:hover:bg-white/80 [&>button]:rounded-full [&>button]:p-2">
            <VisuallyHidden>
              <DialogTitle>Visualização de anexo</DialogTitle>
            </VisuallyHidden>
            <img
              src={fileUrl}
              alt="attachment preview"
              className="max-w-full max-h-[85vh] rounded-lg object-contain"
            />
          </DialogContent>
        </Dialog>
      )
    }
    return (
      <a
        href={fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 mt-3 p-2.5 bg-white rounded-lg border border-brand-primary/10 hover:border-brand-secondary/50 transition-colors w-fit shadow-sm"
      >
        <FileIcon className="w-4 h-4 text-brand-secondary" />
        <span className="text-xs text-brand-primary font-medium truncate max-w-[200px]">
          {attachment}
        </span>
      </a>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-5 shadow-sm border border-brand-primary/10 flex flex-col gap-3">
        {selectedFile && (
          <div className="flex items-center gap-2 bg-white p-2 rounded-lg w-fit border border-brand-primary/10 animate-fade-in-up">
            <FileIcon className="w-4 h-4 text-brand-secondary" />
            <span className="text-xs text-brand-primary font-medium max-w-[150px] truncate">
              {selectedFile.name}
            </span>
            <button
              onClick={() => setSelectedFile(null)}
              className="text-brand-primary/50 hover:text-brand-critical transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <Textarea
          placeholder="Escreva um comentário..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="resize-none bg-white focus-visible:ring-brand-secondary border-brand-primary/20 rounded-xl min-h-[100px]"
        />
        <div className="flex justify-between items-center">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="text-brand-primary/60 hover:text-brand-primary gap-2 rounded-lg"
          >
            <Paperclip className="w-4 h-4" /> Anexar arquivo
          </Button>
          <Button
            onClick={handleAdd}
            className="bg-brand-primary hover:bg-brand-primary/90 text-white rounded-lg px-6"
            disabled={!newComment.trim() && !selectedFile}
          >
            Enviar
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {comments.map((c) => (
          <div
            key={c.id}
            className="group flex gap-4 animate-slide-up bg-white p-4 rounded-xl border border-brand-primary/5 shadow-sm"
          >
            <Avatar className="w-10 h-10 border border-brand-primary/10 mt-1">
              <AvatarImage
                src={
                  c.expand?.user?.avatar ? pb.files.getURL(c.expand.user, c.expand.user.avatar) : ''
                }
              />
              <AvatarFallback className="bg-slate-100 text-brand-primary font-bold">
                {(c.expand?.user?.name || c.expand?.user?.email || 'U').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1 overflow-hidden">
              <div className="flex justify-between items-baseline">
                <span className="font-semibold text-brand-primary text-sm">
                  {c.expand?.user?.name || c.expand?.user?.email}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-brand-primary/50 font-medium">
                    {formatDistanceToNow(new Date(c.created), { addSuffix: true, locale: ptBR })}
                    {c.updated !== c.created && ' (editado)'}
                  </span>
                  {user?.id === c.user && editingCommentId !== c.id && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setEditingCommentId(c.id)
                          setEditingContent(c.content)
                        }}
                        className="text-brand-primary/40 hover:text-brand-primary p-1.5 rounded transition-colors"
                        title="Editar"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="text-brand-primary/40 hover:text-brand-critical p-1.5 rounded transition-colors"
                        title="Excluir"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M3 6h18" />
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                          <line x1="10" x2="10" y1="11" y2="17" />
                          <line x1="14" x2="14" y1="11" y2="17" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {editingCommentId === c.id ? (
                <div className="pt-2 pb-1 space-y-3">
                  <Textarea
                    value={editingContent}
                    onChange={(e) => setEditingContent(e.target.value)}
                    className="min-h-[80px] bg-white resize-none text-sm focus-visible:ring-brand-secondary"
                    autoFocus
                  />
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingCommentId(null)
                        setEditingContent('')
                      }}
                      className="h-8 text-xs font-medium"
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleEditSave(c.id)}
                      className="h-8 text-xs font-medium bg-brand-primary hover:bg-brand-primary/90 text-white"
                      disabled={!editingContent.trim() || editingContent === c.content}
                    >
                      Salvar
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-brand-primary/80 whitespace-pre-wrap leading-relaxed break-words">
                  {c.content}
                </p>
              )}
              {renderAttachment(c)}
            </div>
          </div>
        ))}
        {comments.length === 0 && (
          <div className="text-center py-10 bg-white rounded-xl border border-dashed border-brand-primary/20">
            <MessageSquare className="w-8 h-8 text-brand-primary/30 mx-auto mb-2" />
            <p className="text-sm text-brand-primary/60">
              Nenhum comentário ainda. Seja o primeiro a comentar!
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function LandDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [land, setLand] = useState<any>(null)
  const [metadata, setMetadata] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('info')

  const fetchData = async () => {
    if (!id) return
    try {
      const data = await pb.send(`/backend/v1/lands/${id}`, { method: 'GET' })
      const landData = data.data || data
      setLand(landData)

      try {
        const clusterSerial =
          landData?.clusterSerial || landData?.external_id || landData?.externalId
        const query = clusterSerial
          ? `external_id="${id}" || external_id="${clusterSerial}"`
          : `external_id="${id}"`
        const meta = await pb
          .collection('land_metadata')
          .getFirstListItem(query, { expand: 'responsible_user,external_offices' })
        setMetadata(meta)
      } catch (e) {
        // ignore if metadata doesn't exist
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [id])

  useRealtime('land_metadata', (e) => {
    if (e.record.external_id === id || (land && e.record.external_id === land.clusterSerial)) {
      fetchData()
    }
  })

  const [historyLogs, setHistoryLogs] = useState<any[]>([])

  const fetchHistoryLogs = async () => {
    const clusterSerial = land?.clusterSerial || land?.external_id || land?.externalId || id
    if (!clusterSerial && !id) return

    try {
      const queryId = clusterSerial
        ? `land_id="${id}" || land_id="${clusterSerial}"`
        : `land_id="${id}"`
      const records = await pb.collection('history_logs').getFullList({
        filter: queryId,
        expand: 'user_id',
        sort: '-created',
      })
      setHistoryLogs(records)
    } catch (err) {
      console.error('Error fetching history logs', err)
    }
  }

  useEffect(() => {
    if (land) {
      fetchHistoryLogs()
    }
  }, [land, id])

  useRealtime('history_logs', (e) => {
    const clusterSerial = land?.clusterSerial || land?.external_id || land?.externalId || id
    if (e.record.land_id === id || e.record.land_id === clusterSerial) {
      fetchHistoryLogs()
    }
  })

  const [apiDaysInStage, setApiDaysInStage] = useState<number | null>(null)
  const [statusFetchError, setStatusFetchError] = useState(false)
  const { threshold: delayedThreshold } = useDelayedThreshold()
  const attentionThreshold = Math.max(1, Math.floor(delayedThreshold / 2))

  useEffect(() => {
    let isMounted = true

    const code = land?.clusterSerial || land?.external_id || land?.externalId || land?.code || id
    if (!code) {
      setStatusFetchError(true)
      return
    }

    setStatusFetchError(false)

    pb.send(`/backend/v1/land-status?landCodes=${encodeURIComponent(code)}`, {
      method: 'GET',
    })
      .then((res) => {
        if (!isMounted) return
        const items = res?.data?.items || res?.items || []
        if (items.length > 0) {
          const sortedItems = [...items].sort(
            (a, b) => new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime(),
          )
          const latest = sortedItems[0]
          if (latest.creationDate) {
            const diff = differenceInDays(new Date(), new Date(latest.creationDate))
            setApiDaysInStage(diff)
          }
        }
      })
      .catch((err) => {
        console.error('Status API error:', err)
        if (isMounted) setStatusFetchError(true)
      })

    return () => {
      isMounted = false
    }
  }, [land, id])

  if (loading) {
    return (
      <Sheet open={true} onOpenChange={(open) => !open && navigate('/')}>
        <SheetContent className="sm:max-w-[850px] w-full p-0 flex items-center justify-center bg-white">
          <Loader2 className="w-10 h-10 animate-spin text-brand-secondary" />
        </SheetContent>
      </Sheet>
    )
  }

  if (!land) {
    return (
      <Sheet open={true} onOpenChange={(open) => !open && navigate('/')}>
        <SheetContent className="sm:max-w-[850px] w-full p-6 text-center text-brand-primary/60 flex items-center justify-center bg-white">
          Terra não encontrada.
        </SheetContent>
      </Sheet>
    )
  }

  const updatedDate = new Date(land.updatedAt || land.created || new Date())
  const daysInStatus =
    apiDaysInStage !== null
      ? apiDaysInStage
      : statusFetchError
        ? null
        : differenceInDays(new Date(), updatedDate)
  const urgencyStatus =
    daysInStatus === null
      ? 'unknown'
      : daysInStatus > delayedThreshold
        ? 'delayed'
        : daysInStatus > attentionThreshold
          ? 'attention'
          : 'ontrack'

  const urgencyBg = 'bg-white border-brand-primary/10'

  const statusColor = 'text-slate-700'

  const mockHistory = [
    {
      id: 1,
      action: `Movido para "${land.currentStatus?.name || land.status || 'Nova Etapa'}"`,
      date: updatedDate,
    },
    {
      id: 2,
      action: 'Propriedade importada do sistema',
      date: new Date(new Date(updatedDate).getTime() - 86400000),
    },
  ]

  const responsibleName =
    land.providerEmployee?.name || metadata?.expand?.responsible_user?.name || 'Não atribuído'
  const locationStr = `${land.geomCityName || land.city || 'N/A'}, ${land.geomAcronymState || land.state || 'N/A'}`
  const officeName = metadata?.expand?.external_offices?.name

  return (
    <Sheet open={true} onOpenChange={(open) => !open && navigate('/')}>
      <SheetContent className="sm:max-w-[850px] w-full p-0 flex flex-col h-full bg-white shadow-2xl overflow-hidden border-l border-brand-primary/10">
        <VisuallyHidden>
          <DialogTitle>Detalhes da Terra</DialogTitle>
        </VisuallyHidden>

        <div className="flex-1 overflow-y-auto overflow-x-hidden relative scrollbar-hide">
          {/* Header */}
          <div
            className={cn('p-6 md:p-8 border-b transition-colors duration-300 relative', urgencyBg)}
          >
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="mb-6 h-8 px-3 text-brand-primary/70 hover:text-brand-primary hover:bg-slate-100 bg-white rounded-full text-xs font-semibold shadow-sm border border-brand-primary/10"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Voltar para o Board
            </Button>
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-label font-bold uppercase tracking-widest text-[10px] text-brand-primary/50 bg-white px-2 py-0.5 rounded-md border border-brand-primary/10 shadow-sm">
                    {land.clusterSerial || land.external_id || land.externalId || land.id}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-brand-primary/60">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      {daysInStatus === null
                        ? 'Dados indisponíveis'
                        : `${daysInStatus} ${daysInStatus === 1 ? 'dia' : 'dias'} na etapa`}
                    </span>
                  </div>
                </div>

                <h1 className="font-display font-light text-[28px] md:text-[32px] text-brand-primary leading-tight">
                  {land.name || 'Propriedade sem nome'}
                </h1>

                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex flex-wrap gap-2 items-center">
                    <Badge
                      variant="outline"
                      className="bg-white border-brand-primary/10 text-brand-primary font-semibold shadow-sm"
                    >
                      <MapPin className="w-3 h-3 mr-1" /> {locationStr}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="bg-white border-brand-primary/10 text-brand-primary font-semibold shadow-sm"
                    >
                      <Ruler className="w-3 h-3 mr-1" /> {(land.area || 0).toLocaleString('pt-BR')}{' '}
                      ha
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn(
                        'bg-white font-bold border-brand-primary/10 shadow-sm',
                        statusColor,
                      )}
                    >
                      <AlertCircle className="w-3 h-3 mr-1" />{' '}
                      {statusFetchError
                        ? 'Dados indisponíveis'
                        : land.currentStatus?.name || land.status || 'Status N/A'}
                    </Badge>
                    {officeName && (
                      <Badge
                        variant="outline"
                        className="bg-white border-brand-primary/10 text-brand-primary font-semibold shadow-sm"
                      >
                        <Building2 className="w-3 h-3 mr-1" /> {officeName}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 shrink-0 w-full md:w-auto">
                <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-brand-primary/10 shadow-sm">
                  <Avatar className="w-10 h-10 border border-brand-primary/10">
                    <AvatarFallback className="bg-slate-100 text-brand-primary font-bold">
                      {responsibleName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-brand-primary/60 font-bold uppercase tracking-wider">
                      Responsável
                    </span>
                    <span className="text-sm font-semibold text-brand-primary">
                      {responsibleName}
                    </span>
                  </div>
                </div>
                <LawFirmSelector
                  metadata={metadata}
                  externalId={
                    land?.clusterSerial || land?.external_id || land?.externalId || id || ''
                  }
                  onUpdated={fetchData}
                />
              </div>
            </div>{' '}
          </div>

          {/* Body */}
          <div className="p-6 md:p-8">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="overflow-x-auto pb-2 -mx-6 px-6 md:mx-0 md:px-0 scrollbar-hide">
                <TabsList className="bg-white shadow-sm h-12 p-1 rounded-xl w-max md:w-full flex border border-brand-primary/5">
                  <TabsTrigger
                    value="info"
                    className="flex-1 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-brand-secondary text-brand-primary/60 font-semibold text-sm h-10 px-4 transition-all"
                  >
                    <Info className="w-4 h-4 mr-2" /> Informações
                  </TabsTrigger>
                  <TabsTrigger
                    value="docs"
                    className="flex-1 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-brand-secondary text-brand-primary/60 font-semibold text-sm h-10 px-4 transition-all"
                  >
                    <FileText className="w-4 h-4 mr-2" /> Documentos
                  </TabsTrigger>
                  <TabsTrigger
                    value="comments"
                    className="flex-1 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-brand-secondary text-brand-primary/60 font-semibold text-sm h-10 px-4 transition-all"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" /> Comentários
                  </TabsTrigger>
                  <TabsTrigger
                    value="history"
                    className="flex-1 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-brand-secondary text-brand-primary/60 font-semibold text-sm h-10 px-4 transition-all"
                  >
                    <History className="w-4 h-4 mr-2" /> Histórico
                  </TabsTrigger>
                  <TabsTrigger
                    value="deadlines"
                    className="flex-1 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-brand-secondary text-brand-primary/60 font-semibold text-sm h-10 px-4 transition-all"
                  >
                    <Timer className="w-4 h-4 mr-2" /> Prazos e Etapas
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="mt-6">
                <TabsContent
                  value="info"
                  className="space-y-4 animate-fade-in-up mt-0 outline-none"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Identificação */}
                    <div className="bg-white p-5 rounded-xl border border-brand-primary/10 shadow-sm space-y-4">
                      <h3 className="font-display text-lg text-brand-primary flex items-center gap-2 border-b border-brand-primary/5 pb-3">
                        <Info className="w-5 h-5 text-brand-secondary" /> Identificação
                      </h3>
                      <div className="space-y-3">
                        <CopyableField label="Nome da Propriedade" value={land.name} icon={Info} />
                        <CopyableField
                          label="Serial / Código"
                          value={land.clusterSerial || land.id}
                          icon={Info}
                        />
                        <CopyableField label="Agrotools" value={land.agrotoolsCode} icon={Info} />
                      </div>
                    </div>

                    {/* Localização */}
                    <div className="bg-white p-5 rounded-xl border border-brand-primary/10 shadow-sm space-y-4">
                      <h3 className="font-display text-lg text-brand-primary flex items-center gap-2 border-b border-brand-primary/5 pb-3">
                        <MapPin className="w-5 h-5 text-brand-secondary" /> Localização
                      </h3>
                      <div className="space-y-3">
                        <CopyableField
                          label="Município"
                          value={land.geomCityName || land.city}
                          icon={MapPin}
                        />
                        <CopyableField
                          label="Estado"
                          value={land.geomAcronymState || land.state}
                          icon={MapPin}
                        />
                        <CopyableField label="Bioma" value={land.biome} icon={MapPin} />
                      </div>
                    </div>

                    {/* Proprietário */}
                    <div className="bg-white p-5 rounded-xl border border-brand-primary/10 shadow-sm space-y-4">
                      <h3 className="font-display text-lg text-brand-primary flex items-center gap-2 border-b border-brand-primary/5 pb-3">
                        <User className="w-5 h-5 text-brand-secondary" /> Proprietário
                      </h3>
                      <div className="space-y-3">
                        <CopyableField
                          label="Nome do Proprietário"
                          value={land.owner}
                          icon={User}
                        />
                        <CopyableField
                          label="Estado Civil"
                          value={metadata?.owner_marital_status || 'Não informado'}
                          icon={User}
                        />
                      </div>
                    </div>

                    {/* Área */}
                    <div className="bg-white p-5 rounded-xl border border-brand-primary/10 shadow-sm space-y-4">
                      <h3 className="font-display text-lg text-brand-primary flex items-center gap-2 border-b border-brand-primary/5 pb-3">
                        <Ruler className="w-5 h-5 text-brand-secondary" /> Área
                      </h3>
                      <div className="space-y-3">
                        <CopyableField
                          label="Área Total (ha)"
                          value={(land.area || 0).toLocaleString('pt-BR')}
                          icon={Ruler}
                        />
                        <CopyableField
                          label="Versão Shape"
                          value={land.shapeVersion}
                          icon={Ruler}
                        />
                      </div>
                    </div>

                    {/* DDA Status */}
                    <div className="bg-white p-5 rounded-xl border border-brand-primary/10 shadow-sm space-y-4 md:col-span-2">
                      <h3 className="font-display text-lg text-brand-primary flex items-center gap-2 border-b border-brand-primary/5 pb-3">
                        <AlertCircle className="w-5 h-5 text-brand-secondary" /> Status DDA e
                        Operação
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <CopyableField
                          label="Status da Operação"
                          value={land.currentStatus?.name || land.status}
                          icon={AlertCircle}
                        />
                        <CopyableField
                          label="Tipo de Negociação"
                          value={land.landNegotiationType?.description}
                          icon={Info}
                        />
                        <CopyableField
                          label="Probabilidade"
                          value={land.closingProbability}
                          icon={Info}
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="docs" className="animate-fade-in-up mt-0 outline-none">
                  <DocumentChecklist landId={id!} metadata={metadata} />
                </TabsContent>

                <TabsContent value="comments" className="animate-fade-in-up mt-0 outline-none">
                  <CommentsSection landId={id!} />
                </TabsContent>

                <TabsContent value="history" className="animate-fade-in-up mt-0 outline-none">
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-brand-primary/10">
                    <h3 className="font-display text-lg text-brand-primary mb-6 flex items-center gap-2">
                      <History className="w-5 h-5 text-brand-secondary" /> Histórico de Alterações
                    </h3>
                    <div className="space-y-6 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-brand-primary/10 before:to-transparent">
                      {historyLogs.length > 0
                        ? historyLogs.map((item) => {
                            const userName =
                              item.expand?.user_id?.name || item.expand?.user_id?.email || 'Sistema'
                            const fieldNameMap: any = {
                              status: 'Status',
                              responsible_user: 'Responsável',
                              external_offices: 'Escritório Externo',
                              owner_marital_status: 'Estado Civil',
                              risk_level: 'Nível de Risco',
                              dda_status: 'Status DDA',
                            }
                            const field =
                              fieldNameMap[item.change_details?.field] ||
                              item.change_details?.field ||
                              'Campo'
                            const actionDesc = `${userName} alterou ${field}`

                            return (
                              <div
                                key={item.id}
                                className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
                              >
                                <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-white bg-brand-secondary shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2"></div>
                                <div className="w-[calc(100%-3rem)] md:w-[calc(50%-1.5rem)] bg-white p-4 rounded-xl border border-brand-primary/10 shadow-sm">
                                  <div className="flex flex-col mb-1">
                                    <span className="font-bold text-sm text-brand-primary">
                                      {actionDesc}
                                    </span>
                                    <span className="text-xs text-brand-primary/70 mt-1">
                                      De:{' '}
                                      <span className="font-semibold">
                                        {item.change_details?.old || 'N/A'}
                                      </span>{' '}
                                      <br />
                                      Para:{' '}
                                      <span className="font-semibold">
                                        {item.change_details?.new || 'N/A'}
                                      </span>
                                    </span>
                                  </div>
                                  <time className="text-xs font-medium text-brand-primary/50 block mt-2">
                                    {formatDistanceToNow(new Date(item.created), {
                                      addSuffix: true,
                                      locale: ptBR,
                                    })}
                                  </time>
                                </div>
                              </div>
                            )
                          })
                        : mockHistory.map((item) => (
                            <div
                              key={item.id}
                              className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
                            >
                              <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-white bg-brand-secondary shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2"></div>
                              <div className="w-[calc(100%-3rem)] md:w-[calc(50%-1.5rem)] bg-white p-4 rounded-xl border border-brand-primary/10 shadow-sm">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-bold text-sm text-brand-primary">
                                    {item.action}
                                  </span>
                                </div>
                                <time className="text-xs font-medium text-brand-primary/50">
                                  {formatDistanceToNow(item.date, {
                                    addSuffix: true,
                                    locale: ptBR,
                                  })}
                                </time>
                              </div>
                            </div>
                          ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="deadlines" className="animate-fade-in-up mt-0 outline-none">
                  <StageTimeline
                    historyLogs={historyLogs}
                    metadata={metadata}
                    land={land}
                    landId={id!}
                  />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
