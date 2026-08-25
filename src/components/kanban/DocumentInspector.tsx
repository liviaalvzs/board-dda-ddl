import { useState, useEffect } from 'react'
import {
  Search,
  FileText,
  Loader2,
  Sparkles,
  Bot,
  Scan,
  User,
  CreditCard,
  IdCard,
  MapPin,
  Eye,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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

interface ExtractedData {
  nome?: string
  cpf?: string
  rg?: string
  estado?: string
  good_visibility?: string
}

const ANALYZABLE_KEYS = new Set(['pf_documentos_pessoais'])

function VisibilityBadge({ level }: { level: string }) {
  const normalized = level.toLowerCase().trim()
  const config =
    normalized === 'alta'
      ? { bg: 'bg-emerald-100', text: 'text-emerald-700' }
      : normalized === 'média' || normalized === 'media'
        ? { bg: 'bg-amber-100', text: 'text-amber-700' }
        : { bg: 'bg-rose-100', text: 'text-rose-700' }
  return (
    <Badge className={cn(config.bg, config.text, 'border-none text-[9px] font-bold px-1.5 py-0')}>
      <Eye className="w-2.5 h-2.5 mr-0.5" /> {level}
    </Badge>
  )
}

function ExtractedInfo({ data }: { data: ExtractedData }) {
  const fields = [
    { icon: User, label: 'Nome', value: data.nome },
    { icon: CreditCard, label: 'CPF', value: data.cpf },
    { icon: IdCard, label: 'RG', value: data.rg },
    { icon: MapPin, label: 'Estado', value: data.estado },
  ]

  return (
    <div className="space-y-2.5">
      {data.good_visibility && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold text-brand-primary/50 uppercase tracking-wider">
            Qualidade do documento:
          </span>
          <VisibilityBadge level={data.good_visibility} />
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {fields.map(({ icon: Icon, label, value }) => (
          <div
            key={label}
            className="flex items-center gap-2.5 bg-white rounded-lg border border-brand-primary/10 px-3 py-2.5"
          >
            <Icon className="w-4 h-4 text-brand-secondary shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-brand-primary/40 uppercase tracking-wider">
                {label}
              </p>
              <p className="text-sm font-semibold text-brand-primary truncate">
                {value || 'Não Identificado'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function DocumentPreviewCard({ doc }: { doc: DocumentRecord }) {
  const label = getDocumentLabel(doc.document_key)
  const senderName = doc.expand?.user?.name || doc.expand?.user?.email?.split('@')[0] || '—'
  const canAnalyze = ANALYZABLE_KEYS.has(doc.document_key)

  const [analyzing, setAnalyzing] = useState(false)
  const [extracted, setExtracted] = useState<ExtractedData | null>(null)
  const [error, setError] = useState('')

  const handleAnalyze = async () => {
    setAnalyzing(true)
    setError('')
    try {
      const res = await pb.send('/backend/v1/analyze-document', {
        method: 'POST',
        body: { check_id: doc.id },
      })
      if (res.extracted) {
        setExtracted(res.extracted)
      } else if (res.raw) {
        setError('A IA retornou um formato inesperado. Tente novamente.')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao analisar documento.')
    } finally {
      setAnalyzing(false)
    }
  }

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
        <Badge className="bg-emerald-100 text-emerald-700 border-none text-[9px] font-bold px-2 py-0.5 shrink-0">
          Enviado
        </Badge>
      </div>

      <div className="px-5 py-4 bg-slate-50/50 border-t border-brand-primary/5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-bold text-brand-primary/70 uppercase tracking-wider">
            Informações extraídas
          </span>
          {!canAnalyze && (
            <Badge className="bg-amber-100 text-amber-700 border-none text-[9px] font-bold px-1.5 py-0">
              Em breve
            </Badge>
          )}
        </div>

        {extracted ? (
          <ExtractedInfo data={extracted} />
        ) : canAnalyze ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-dashed border-brand-primary/15 bg-white p-4 flex items-center gap-3">
              <Scan className="w-6 h-6 text-brand-secondary/40 shrink-0" />
              <p className="text-xs text-brand-primary/50 leading-relaxed">
                Clique em <strong>Analisar</strong> para extrair RG, CPF, Nome e Estado deste
                documento usando IA.
              </p>
            </div>
            {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
            <Button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="bg-brand-secondary hover:bg-brand-secondary/90 text-white h-9 text-xs font-semibold gap-1.5"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Analisando...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" /> Analisar com IA
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-brand-primary/15 bg-white p-4 flex items-center gap-3">
            <Bot className="w-6 h-6 text-brand-primary/20 shrink-0" />
            <p className="text-xs text-brand-primary/40 leading-relaxed">
              A IA analisará este documento e extrairá automaticamente as informações relevantes —
              nomes, CPF/CNPJ, datas, valores, endereços e cláusulas importantes.
            </p>
          </div>
        )}
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
            {docs.length} {docs.length === 1 ? 'documento enviado' : 'documentos enviados'} —
            analise documentos pessoais para extrair informações com IA.
          </p>
        </div>
      </div>

      {docs.map((doc) => (
        <DocumentPreviewCard key={doc.id} doc={doc} />
      ))}
    </div>
  )
}
