import { useState, useEffect, useMemo } from 'react'
import {
  Search,
  FileText,
  Eye,
  EyeOff,
  ChevronRight,
  Loader2,
  Sparkles,
  FileQuestion,
  Bot,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { getDocumentLabel } from '@/lib/document-labels'
import { format } from 'date-fns'

interface DocumentRecord {
  id: string
  document_key: string
  document_url: string
  land_id: string
  subject_id: string
  is_completed: boolean
  not_applicable: boolean
  file_ext: string
  created: string
  updated: string
  expand?: {
    user?: { name?: string; email?: string }
  }
}

function DocumentPreviewCard({ doc }: { doc: DocumentRecord }) {
  const [previewOpen, setPreviewOpen] = useState(false)
  const label = getDocumentLabel(doc.document_key)
  const isPdf = doc.file_ext === '.pdf' || doc.document_url?.toLowerCase().endsWith('.pdf')
  const isImage =
    ['.jpg', '.jpeg', '.png'].includes(doc.file_ext || '') ||
    /\.(jpe?g|png)$/i.test(doc.document_url || '')

  const senderName = doc.expand?.user?.name || doc.expand?.user?.email?.split('@')[0] || '—'

  return (
    <div className="bg-white rounded-xl border border-brand-primary/10 shadow-sm overflow-hidden">
      <div className="px-5 py-4 flex items-center gap-3">
        <FileText className="w-5 h-5 text-brand-secondary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-brand-primary truncate">{label}</p>
          <p className="text-[11px] text-brand-primary/50 mt-0.5">
            Enviado por {senderName} em {format(new Date(doc.updated), 'dd/MM/yyyy')}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setPreviewOpen(!previewOpen)}
          className="shrink-0 h-8 text-xs font-semibold text-brand-primary/60 hover:text-brand-primary gap-1.5"
        >
          {previewOpen ? (
            <>
              <EyeOff className="w-3.5 h-3.5" /> Ocultar
            </>
          ) : (
            <>
              <Eye className="w-3.5 h-3.5" /> Preview
            </>
          )}
        </Button>
      </div>

      {previewOpen && (
        <div className="border-t border-brand-primary/5">
          {isPdf ? (
            <iframe src={doc.document_url} className="w-full h-[400px] bg-slate-50" title={label} />
          ) : isImage ? (
            <div className="p-4 bg-slate-50 flex justify-center">
              <img
                src={doc.document_url}
                alt={label}
                className="max-h-[400px] max-w-full object-contain rounded-lg border border-slate-200"
              />
            </div>
          ) : (
            <div className="p-6 bg-slate-50 flex flex-col items-center gap-2 text-brand-primary/40">
              <FileQuestion className="w-8 h-8" />
              <p className="text-xs font-medium">Preview não disponível para este formato</p>
              <a
                href={doc.document_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-brand-secondary hover:underline font-semibold"
              >
                Abrir em nova aba
              </a>
            </div>
          )}
        </div>
      )}

      <div className="px-5 py-4 bg-slate-50/50 border-t border-brand-primary/5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-bold text-brand-primary/70 uppercase tracking-wider">
            Informações extraídas
          </span>
          <Badge className="bg-amber-100 text-amber-700 border-none text-[9px] font-bold px-1.5 py-0">
            Em breve
          </Badge>
        </div>
        <div className="rounded-lg border border-dashed border-brand-primary/15 bg-white p-4 flex items-center gap-3">
          <Bot className="w-6 h-6 text-brand-primary/20 shrink-0" />
          <p className="text-xs text-brand-primary/40 leading-relaxed">
            A IA analisará este documento e extrairá automaticamente as informações relevantes —
            nomes, CPF/CNPJ, datas, valores, endereços e cláusulas importantes.
          </p>
        </div>
      </div>
    </div>
  )
}

export function DocumentInspector({ landId }: { landId: string }) {
  const [docs, setDocs] = useState<DocumentRecord[]>([])
  const [loading, setLoading] = useState(true)

  const fetchDocs = async () => {
    try {
      const records = await pb.collection('document_checks').getFullList({
        filter: `land_id="${landId}" && is_completed=true && document_url!=""`,
        expand: 'user',
        sort: '-updated',
      })
      setDocs(records as unknown as DocumentRecord[])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDocs()
  }, [landId])

  useRealtime('document_checks', (e) => {
    if (e.record.land_id === landId) fetchDocs()
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-brand-secondary" />
      </div>
    )
  }

  if (docs.length === 0) {
    return (
      <div className="bg-white p-10 rounded-xl border border-dashed border-brand-primary/20 text-center">
        <Search className="w-10 h-10 text-brand-primary/20 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-brand-primary/60 mb-1">
          Nenhum documento enviado
        </h3>
        <p className="text-sm text-brand-primary/40">
          Envie documentos na aba "Envio de Documentos" para inspecioná-los aqui.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-brand-primary/10 shadow-sm p-5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-brand-primary">Inspetor de Documentos</h3>
          <p className="text-xs text-brand-primary/50 mt-0.5">
            {docs.length} {docs.length === 1 ? 'documento enviado' : 'documentos enviados'} — ative
            o preview para visualizar e confira as informações extraídas pela IA.
          </p>
        </div>
      </div>

      {docs.map((doc) => (
        <DocumentPreviewCard key={doc.id} doc={doc} />
      ))}
    </div>
  )
}
