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
} from 'lucide-react'

import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { DocumentChecklist } from '@/components/kanban/DocumentChecklist'

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
          <div className="flex items-center gap-2 bg-brand-primary/5 p-2 rounded-lg w-fit border border-brand-primary/10 animate-fade-in-up">
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
          className="resize-none focus-visible:ring-brand-secondary border-brand-primary/20 rounded-xl min-h-[100px]"
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
            className="flex gap-4 animate-slide-up bg-white p-4 rounded-xl border border-brand-primary/5 shadow-sm"
          >
            <Avatar className="w-10 h-10 border border-brand-primary/10">
              <AvatarImage
                src={
                  c.expand?.user?.avatar ? pb.files.getURL(c.expand.user, c.expand.user.avatar) : ''
                }
              />
              <AvatarFallback className="bg-brand-primary/5 text-brand-primary font-bold">
                {(c.expand?.user?.name || c.expand?.user?.email || 'U').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
              <div className="flex justify-between items-baseline">
                <span className="font-semibold text-brand-primary text-sm">
                  {c.expand?.user?.name || c.expand?.user?.email}
                </span>
                <span className="text-xs text-brand-primary/50 font-medium">
                  {formatDistanceToNow(new Date(c.created), { addSuffix: true, locale: ptBR })}
                </span>
              </div>
              <p className="text-sm text-brand-primary/80 whitespace-pre-wrap leading-relaxed">
                {c.content}
              </p>
              {renderAttachment(c)}
            </div>
          </div>
        ))}
        {comments.length === 0 && (
          <div className="text-center py-10 bg-brand-primary/5 rounded-xl border border-dashed border-brand-primary/20">
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
          .getFirstListItem(query, { expand: 'responsible_user' })
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

  if (loading) {
    return (
      <Sheet open={true} onOpenChange={(open) => !open && navigate('/')}>
        <SheetContent className="sm:max-w-[850px] w-full p-0 flex items-center justify-center bg-brand-background">
          <Loader2 className="w-10 h-10 animate-spin text-brand-secondary" />
        </SheetContent>
      </Sheet>
    )
  }

  if (!land) {
    return (
      <Sheet open={true} onOpenChange={(open) => !open && navigate('/')}>
        <SheetContent className="sm:max-w-[850px] w-full p-6 text-center text-brand-primary/60 flex items-center justify-center bg-brand-background">
          Terra não encontrada.
        </SheetContent>
      </Sheet>
    )
  }

  const updatedDate = new Date(land.updatedAt || land.created || new Date())
  const daysInStatus = differenceInDays(new Date(), updatedDate)
  const urgencyStatus = daysInStatus > 14 ? 'delayed' : daysInStatus > 7 ? 'attention' : 'ontrack'

  const urgencyBg = {
    delayed: 'bg-rose-50 border-rose-100',
    attention: 'bg-amber-50 border-amber-100',
    ontrack: 'bg-emerald-50 border-emerald-100',
  }[urgencyStatus]

  const statusColor = {
    delayed: 'text-rose-700',
    attention: 'text-amber-700',
    ontrack: 'text-emerald-700',
  }[urgencyStatus]

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

  return (
    <Sheet open={true} onOpenChange={(open) => !open && navigate('/')}>
      <SheetContent className="sm:max-w-[850px] w-full p-0 flex flex-col h-full bg-brand-background shadow-2xl overflow-hidden border-l border-brand-primary/10">
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
              className="mb-6 h-8 px-3 text-brand-primary/70 hover:text-brand-primary hover:bg-white/50 bg-white/30 backdrop-blur-sm rounded-full text-xs font-semibold"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Voltar para o Board
            </Button>

            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-label font-bold uppercase tracking-widest text-[10px] text-brand-primary/50 bg-white/50 px-2 py-0.5 rounded-md border border-brand-primary/10">
                    {land.clusterSerial || land.external_id || land.externalId || land.id}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-brand-primary/60">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      {daysInStatus} {daysInStatus === 1 ? 'dia' : 'dias'} na etapa
                    </span>
                  </div>
                </div>

                <h1 className="font-display font-light text-[28px] md:text-[32px] text-brand-primary leading-tight">
                  {land.name || 'Propriedade sem nome'}
                </h1>

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
                    <Ruler className="w-3 h-3 mr-1" /> {(land.area || 0).toLocaleString('pt-BR')} ha
                  </Badge>
                  <Badge
                    variant="outline"
                    className={cn(
                      'bg-white font-bold border-brand-primary/10 shadow-sm',
                      statusColor,
                    )}
                  >
                    <AlertCircle className="w-3 h-3 mr-1" />{' '}
                    {land.currentStatus?.name || land.status || 'Status N/A'}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white/60 backdrop-blur-md p-3 rounded-xl border border-brand-primary/10 shadow-sm shrink-0">
                <Avatar className="w-10 h-10 border border-brand-primary/10">
                  <AvatarFallback className="bg-brand-primary/10 text-brand-primary font-bold">
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
            </div>
          </div>

          {/* Body */}
          <div className="p-6 md:p-8">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="overflow-x-auto pb-2 -mx-6 px-6 md:mx-0 md:px-0 scrollbar-hide">
                <TabsList className="bg-brand-primary/5 h-12 p-1 rounded-xl w-max md:w-full flex">
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
                      {mockHistory.map((item) => (
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
                              {formatDistanceToNow(item.date, { addSuffix: true, locale: ptBR })}
                            </time>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
