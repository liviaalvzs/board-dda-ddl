import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  MessageSquare,
  Loader2,
  Info,
  Ruler,
  Activity,
  Leaf,
  Folder,
  ChevronDown,
  Paperclip,
  X,
  FileIcon,
} from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { DocumentChecklist } from '@/components/kanban/DocumentChecklist'
import { useToast } from '@/hooks/use-toast'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

const VisuallyHidden = ({ children }: { children: React.ReactNode }) => (
  <span className="sr-only">{children}</span>
)

function SectionCollapsible({ title, icon: Icon, children, defaultOpen = true }: any) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="bg-white rounded-rg shadow-rg-card border border-brand-primary/5"
    >
      <CollapsibleTrigger
        className={cn(
          'flex items-center justify-between w-full p-5 group hover:bg-brand-primary/[0.02] transition-colors',
          isOpen ? 'rounded-t-rg' : 'rounded-rg',
        )}
      >
        <h3 className="font-display text-[1.2rem] text-brand-primary font-light flex items-center gap-2">
          <Icon className="w-5 h-5 text-brand-primary" strokeWidth={1.5} /> {title}
        </h3>
        <ChevronDown
          className={cn(
            'w-5 h-5 text-brand-primary/50 transition-transform duration-200',
            isOpen && 'rotate-180',
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-5 pb-5 space-y-4">
        <div className="h-px w-full bg-brand-primary/5 mb-4 -mt-2" />
        {children}
      </CollapsibleContent>
    </Collapsible>
  )
}

function CommentsSection({ landId }: { landId: string }) {
  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    pb.collection('comments')
      .getFullList({ filter: `land_id="${landId}"`, expand: 'user', sort: '-created' })
      .then(setComments)
      .catch(() => {})
  }, [landId])

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
            <button
              type="button"
              className="block mt-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-secondary rounded-lg"
            >
              <img
                src={fileUrl}
                alt="attachment"
                className="max-w-[200px] max-h-[200px] rounded-lg border border-brand-primary/10 object-cover shadow-subtle hover:opacity-90 transition-opacity"
              />
            </button>
          </DialogTrigger>
          <DialogContent
            aria-describedby="attachment-preview-description"
            className="max-w-3xl bg-transparent border-none shadow-none p-0 flex justify-center [&>button]:bg-white/50 [&>button]:hover:bg-white/80 [&>button]:rounded-full [&>button]:p-2"
          >
            <VisuallyHidden>
              <DialogTitle>Visualização de anexo</DialogTitle>
            </VisuallyHidden>
            <VisuallyHidden>
              <DialogDescription id="attachment-preview-description">
                Visualização em tela cheia da imagem anexada
              </DialogDescription>
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
        className="flex items-center gap-2 mt-3 p-2.5 bg-white rounded-lg border border-brand-primary/10 hover:border-brand-secondary/50 transition-colors w-fit shadow-subtle"
      >
        <FileIcon className="w-4 h-4 text-brand-secondary" />
        <span className="text-xs text-brand-primary font-medium truncate max-w-[200px]">
          {attachment}
        </span>
      </a>
    )
  }

  return (
    <div className="bg-white rounded-rg p-5 shadow-rg-card border border-brand-primary/5 space-y-5">
      <h3 className="font-display text-[1.2rem] text-brand-primary font-light flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-brand-primary" strokeWidth={1.5} /> Comentários
      </h3>
      <div className="flex flex-col gap-2 relative">
        {selectedFile && (
          <div className="flex items-center gap-2 bg-brand-primary/5 p-2 rounded-lg w-fit border border-brand-primary/10 mb-2">
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
          placeholder="Adicione um comentário..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="resize-none focus-visible:ring-brand-secondary border-brand-primary/20 rounded-xl"
        />
        <div className="flex justify-between items-center mt-1">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            className="text-brand-primary/60 hover:text-brand-primary hover:bg-brand-primary/5 rounded-full"
            title="Anexar arquivo"
          >
            <Paperclip className="w-5 h-5" />
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
      <div className="space-y-4 mt-6">
        {comments.map((c) => (
          <div
            key={c.id}
            className="bg-brand-primary/5 border border-brand-primary/10 p-4 rounded-xl text-sm space-y-2 animate-slide-up"
          >
            <div className="flex justify-between items-center text-xs text-brand-primary/60">
              <span className="font-semibold text-brand-primary text-sm">
                {c.expand?.user?.name || c.expand?.user?.email}
              </span>
              <span>{new Date(c.created).toLocaleDateString('pt-BR')}</span>
            </div>
            <p className="text-brand-primary whitespace-pre-wrap leading-relaxed">{c.content}</p>
            {renderAttachment(c)}
          </div>
        ))}
        {comments.length === 0 && (
          <p className="text-sm text-brand-primary/60 text-center py-6 bg-brand-primary/5 rounded-xl border border-dashed border-brand-primary/20">
            Nenhum comentário ainda. Seja o primeiro a comentar!
          </p>
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

  const fetchData = async () => {
    if (!id) return
    try {
      const data = await pb.send(`/backend/v1/lands/${id}`, { method: 'GET' })
      setLand(data.data || data)

      try {
        const meta = await pb
          .collection('land_metadata')
          .getFirstListItem(`external_id="${id}"`, { expand: 'responsible_user' })
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
    if (e.record.external_id === id) {
      fetchData()
    }
  })

  return (
    <Sheet open={true} onOpenChange={(open) => !open && navigate('/')}>
      <SheetContent
        aria-describedby="land-detail-description"
        className="sm:max-w-[800px] w-full p-0 flex flex-col h-full bg-brand-background shadow-2xl overflow-hidden border-l-0 sm:border-l border-brand-primary/10"
      >
        <VisuallyHidden>
          <SheetDescription id="land-detail-description">
            Detalhes da terra e informações gerais
          </SheetDescription>
        </VisuallyHidden>
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <VisuallyHidden>
              <SheetTitle>Carregando terra</SheetTitle>
            </VisuallyHidden>
            <Loader2 className="w-10 h-10 animate-spin text-brand-secondary" />
          </div>
        ) : !land ? (
          <div className="p-6 text-center text-brand-primary/60 font-medium">
            <VisuallyHidden>
              <SheetTitle>Terra não encontrada</SheetTitle>
            </VisuallyHidden>
            Terra não encontrada.
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto overflow-x-hidden relative scrollbar-hide">
            {/* Header */}
            <div className="p-8 pb-6 border-b border-brand-primary/10 bg-white z-10 sticky top-0">
              <SheetHeader className="mb-4">
                <div className="space-y-1.5">
                  <span className="font-label font-semibold uppercase tracking-rg text-[11px] text-brand-primary/60 block">
                    {land.code || 'S/ CÓDIGO'}
                  </span>
                  <SheetTitle className="font-display font-light text-[26px] text-brand-primary leading-tight text-left">
                    {land.name || 'Propriedade sem nome'}
                  </SheetTitle>
                </div>
                <div className="flex flex-wrap gap-3 mt-4 items-center">
                  <Badge
                    variant="outline"
                    className="bg-brand-secondary text-white border-none font-bold text-sm px-3 py-1 rounded-md"
                  >
                    {(land.area || 0).toLocaleString('pt-BR')} ha
                  </Badge>
                  {land.closingProbability && (
                    <Badge
                      variant="outline"
                      className={cn(
                        'border-none font-bold text-sm px-3 py-1 rounded-md',
                        land.closingProbability.toLowerCase() === 'alta'
                          ? 'bg-brand-secondary text-white'
                          : land.closingProbability.toLowerCase() === 'média' ||
                              land.closingProbability.toLowerCase() === 'media'
                            ? 'bg-brand-warning text-brand-primary'
                            : 'bg-brand-primary/10 text-brand-primary',
                      )}
                    >
                      {land.closingProbability}
                    </Badge>
                  )}
                </div>
              </SheetHeader>
            </div>

            {/* Body */}
            <div className="p-6 md:p-8 space-y-6">
              {/* Visão Geral */}
              <SectionCollapsible title="Visão Geral" icon={Info}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-4">
                  <div className="col-span-2 md:col-span-4">
                    <span className="rg-label text-brand-primary/60 block mb-1">
                      Nome da Propriedade
                    </span>
                    <span className="font-medium text-brand-primary text-[15px]">
                      {land.name || 'N/A'}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="rg-label text-brand-primary/60 block mb-1">Proprietário</span>
                    <span className="font-medium text-brand-primary text-[15px]">
                      {land.owner || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="rg-label text-brand-primary/60 block mb-1">Estado</span>
                    <span className="font-medium text-brand-primary text-[15px]">
                      {land.geomAcronymState || land.state || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="rg-label text-brand-primary/60 block mb-1">Município</span>
                    <span className="font-medium text-brand-primary text-[15px]">
                      {land.geomCityName || land.city || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="rg-label text-brand-primary/60 block mb-1">Bioma</span>
                    <span className="font-medium text-brand-primary text-[15px]">
                      {land.biome || 'N/A'}
                    </span>
                  </div>
                </div>
                {land.description && (
                  <div className="mt-6 pt-5 border-t border-brand-primary/10">
                    <span className="rg-label text-brand-primary/60 block mb-2">Descrição</span>
                    <p className="text-[15px] text-brand-primary leading-relaxed">
                      {land.description}
                    </p>
                  </div>
                )}
              </SectionCollapsible>

              {/* Detalhes Técnicos */}
              <SectionCollapsible title="Detalhes Técnicos" icon={Ruler}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-4">
                  <div>
                    <span className="rg-label text-brand-primary/60 block mb-1">Área (ha)</span>
                    <span className="font-bold text-brand-secondary text-[16px]">
                      {(land.area || 0).toLocaleString('pt-BR')} ha
                    </span>
                  </div>
                  <div>
                    <span className="rg-label text-brand-primary/60 block mb-1">Código SICAR</span>
                    <span className="font-medium text-brand-primary text-[15px] break-all">
                      {land.sicarCode || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="rg-label text-brand-primary/60 block mb-1">
                      Código Agrotools
                    </span>
                    <span className="font-medium text-brand-primary text-[15px] break-all">
                      {land.agrotoolsCode || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="rg-label text-brand-primary/60 block mb-1">Versão Shape</span>
                    <span className="font-medium text-brand-primary text-[15px]">
                      {land.shapeVersion || 'N/A'}
                    </span>
                  </div>
                </div>
              </SectionCollapsible>

              {/* Status e Operação */}
              <SectionCollapsible title="Status e Operação" icon={Activity}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-4">
                  <div>
                    <span className="rg-label text-brand-primary/60 block mb-1">Status</span>
                    <span className="font-medium text-brand-primary text-[15px]">
                      {land.currentStatus?.name || land.status || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="rg-label text-brand-primary/60 block mb-1">
                      Tipo de Negociação
                    </span>
                    <span className="font-medium text-brand-primary text-[15px]">
                      {land.landNegotiationType?.description || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="rg-label text-brand-primary/60 block mb-1">Probabilidade</span>
                    <span className="font-medium text-brand-primary text-[15px]">
                      {land.closingProbability || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="rg-label text-brand-primary/60 block mb-1">
                      Captador / Responsável
                    </span>
                    <span className="font-medium text-brand-primary text-[15px]">
                      {land.providerEmployee?.name || 'N/A'}
                    </span>
                  </div>
                </div>
              </SectionCollapsible>

              <div className="pt-2">
                <DocumentChecklist landId={id!} metadata={metadata} />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1 bg-white border-brand-primary/20 text-brand-primary hover:bg-brand-primary/5 hover:border-brand-primary/40 rounded-xl h-12 text-[15px] shadow-sm font-semibold"
                  onClick={() => window.open('#', '_blank')}
                >
                  <Folder className="w-5 h-5 mr-2 text-brand-secondary" />
                  Sharepoint da Terra
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 bg-white border-brand-primary/20 text-brand-primary hover:bg-brand-secondary/10 hover:text-brand-primary hover:border-brand-secondary rounded-xl h-12 text-[15px] shadow-sm font-semibold"
                  onClick={() =>
                    window.open(`https://panel.re.green/#/land-detail/${id}`, '_blank')
                  }
                >
                  <Leaf className="w-5 h-5 mr-2 text-brand-secondary" />
                  Visualizar no rg-panel
                </Button>
              </div>

              <div className="pt-2">
                <CommentsSection landId={id!} />
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
