import { useState, useEffect } from 'react'
import {
  Search,
  FileText,
  Loader2,
  Sparkles,
  Download,
  Bot,
  Scan,
  User,
  CreditCard,
  IdCard,
  MapPin,
  Eye,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  Calendar,
  Building2,
  Heart,
  Users,
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
  ai_analysis?: ExtractedData | null
  replaced_count?: number
  expand?: {
    user?: { name?: string; email?: string }
  }
}

interface ExtractedData {
  is_personal_document?: boolean
  is_certidao_estado_civil?: boolean
  is_comprovante_residencia?: boolean
  document_type_detected?: string
  nome?: string
  cpf?: string
  rg?: string
  estado?: string
  good_visibility?: string
  tipo_certidao?: string
  nomes_mencionados?: string[]
  data_emissao?: string
  cartorio?: string
  estado_civil_resultante?: string
  nome_titular?: string
  endereco_completo?: string
  bairro?: string
  cidade?: string
  cep?: string
  tipo_comprovante?: string
  data_referencia?: string
}

interface AttentionItem {
  docLabel: string
  message: string
  severity: 'error' | 'warning'
}

const ANALYZABLE_KEYS = new Set([
  'pf_documentos_pessoais',
  'pf_documentos_pessoais_conjuge',
  'pf_certidao_estado_civil',
  'pf_comprovante_residencia',
])

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

function WrongDocumentBanner({ detected, expected }: { detected?: string; expected?: string }) {
  const expectedLabel = expected || 'o documento esperado'
  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 flex items-start gap-3">
      <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center shrink-0 mt-0.5">
        <AlertTriangle className="w-4 h-4 text-rose-600" />
      </div>
      <div>
        <p className="text-sm font-semibold text-rose-700">Documento Errado</p>
        <p className="text-xs text-rose-600/80 mt-0.5">
          Este arquivo não corresponde a {expectedLabel}.
          {detected && detected !== 'Não Aplicável' && (
            <>
              {' '}
              A IA identificou como: <strong>{detected}</strong>.
            </>
          )}
        </p>
      </div>
    </div>
  )
}

function StaleAnalysisBanner() {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-center gap-2.5">
      <RefreshCw className="w-4 h-4 text-amber-600 shrink-0" />
      <p className="text-xs text-amber-700 font-medium">
        O documento foi substituído. Reanálise necessária.
      </p>
    </div>
  )
}

function AttentionReport({ items }: { items: AttentionItem[] }) {
  const [open, setOpen] = useState(false)

  if (items.length === 0) return null

  const errorCount = items.filter((i) => i.severity === 'error').length
  const warningCount = items.filter((i) => i.severity === 'warning').length

  return (
    <div className="bg-white rounded-xl border border-brand-primary/10 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-5 py-4 flex items-center gap-3 hover:bg-slate-50/50 transition-colors"
      >
        <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-5 h-5 text-rose-600" />
        </div>
        <div className="flex-1 text-left">
          <h3 className="text-sm font-semibold text-brand-primary">Pontos de Atenção</h3>
          <p className="text-xs text-brand-primary/50 mt-0.5">
            {errorCount > 0 && (
              <span className="text-rose-600 font-semibold">
                {errorCount} {errorCount === 1 ? 'erro' : 'erros'}
              </span>
            )}
            {errorCount > 0 && warningCount > 0 && ' · '}
            {warningCount > 0 && (
              <span className="text-amber-600 font-semibold">
                {warningCount} {warningCount === 1 ? 'aviso' : 'avisos'}
              </span>
            )}
          </p>
        </div>
        <ChevronDown
          className={cn('w-5 h-5 text-brand-primary/40 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="px-5 pb-4 space-y-2 border-t border-brand-primary/5 pt-3">
          {items.map((item, i) => (
            <div
              key={i}
              className={cn(
                'flex items-start gap-2.5 rounded-lg px-3 py-2.5 text-xs',
                item.severity === 'error'
                  ? 'bg-rose-50 border border-rose-200'
                  : 'bg-amber-50 border border-amber-200',
              )}
            >
              {item.severity === 'error' ? (
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div>
                <p
                  className={cn(
                    'font-semibold',
                    item.severity === 'error' ? 'text-rose-700' : 'text-amber-700',
                  )}
                >
                  {item.docLabel}
                </p>
                <p
                  className={cn(
                    'mt-0.5',
                    item.severity === 'error' ? 'text-rose-600/80' : 'text-amber-600/80',
                  )}
                >
                  {item.message}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CertidaoInfo({ data }: { data: ExtractedData }) {
  const fields = [
    { icon: Heart, label: 'Tipo', value: data.tipo_certidao },
    { icon: User, label: 'Estado Civil', value: data.estado_civil_resultante },
    { icon: Calendar, label: 'Data Emissão', value: data.data_emissao },
    { icon: Building2, label: 'Cartório', value: data.cartorio },
  ]

  return (
    <div className="space-y-2.5">
      {data.good_visibility && data.good_visibility !== 'Não Aplicável' && (
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
      {data.nomes_mencionados && data.nomes_mencionados.length > 0 && (
        <div className="bg-white rounded-lg border border-brand-primary/10 px-3 py-2.5">
          <div className="flex items-center gap-2 mb-1.5">
            <Users className="w-4 h-4 text-brand-secondary shrink-0" />
            <p className="text-[10px] font-semibold text-brand-primary/40 uppercase tracking-wider">
              Pessoas mencionadas
            </p>
          </div>
          <div className="space-y-1 ml-6">
            {data.nomes_mencionados.map((nome, i) => (
              <p key={i} className="text-sm font-semibold text-brand-primary">
                {nome}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ComprovanteInfo({ data }: { data: ExtractedData }) {
  const fields = [
    { icon: User, label: 'Titular', value: data.nome_titular },
    { icon: MapPin, label: 'Endereço', value: data.endereco_completo },
    { icon: Building2, label: 'Bairro', value: data.bairro },
    {
      icon: MapPin,
      label: 'Cidade/UF',
      value:
        data.cidade && data.estado ? `${data.cidade} - ${data.estado}` : data.cidade || data.estado,
    },
    { icon: FileText, label: 'CEP', value: data.cep },
    { icon: FileText, label: 'Tipo', value: data.tipo_comprovante },
    { icon: Calendar, label: 'Referência', value: data.data_referencia },
  ]

  return (
    <div className="space-y-2.5">
      {data.good_visibility && data.good_visibility !== 'Não Aplicável' && (
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

function ExtractedInfo({ data, documentKey }: { data: ExtractedData; documentKey: string }) {
  if (documentKey === 'pf_comprovante_residencia') {
    if (data.is_comprovante_residencia === false) {
      return (
        <WrongDocumentBanner
          detected={data.document_type_detected}
          expected="um comprovante de residência"
        />
      )
    }
    if (data.is_comprovante_residencia === true) {
      return <ComprovanteInfo data={data} />
    }
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-center gap-2.5">
        <RefreshCw className="w-4 h-4 text-amber-600 shrink-0" />
        <p className="text-xs text-amber-700 font-medium">
          Análise desatualizada. Clique em <strong>Reanalisar</strong> para usar o novo modelo.
        </p>
      </div>
    )
  }

  if (documentKey === 'pf_certidao_estado_civil') {
    if (data.is_certidao_estado_civil === false) {
      return (
        <WrongDocumentBanner
          detected={data.document_type_detected}
          expected="uma certidão de estado civil"
        />
      )
    }
    if (data.is_certidao_estado_civil === true) {
      return <CertidaoInfo data={data} />
    }
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-center gap-2.5">
        <RefreshCw className="w-4 h-4 text-amber-600 shrink-0" />
        <p className="text-xs text-amber-700 font-medium">
          Análise desatualizada. Clique em <strong>Reanalisar</strong> para usar o novo modelo.
        </p>
      </div>
    )
  }

  if (data.is_personal_document === false) {
    return (
      <WrongDocumentBanner
        detected={data.document_type_detected}
        expected="um documento pessoal (RG ou CNH)"
      />
    )
  }

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

function DocumentPreviewCard({
  doc,
  pessoaisAnalysis,
}: {
  doc: DocumentRecord
  pessoaisAnalysis?: ExtractedData | null
}) {
  const label = getDocumentLabel(doc.document_key)
  const senderName = doc.expand?.user?.name || doc.expand?.user?.email?.split('@')[0] || '—'
  const canAnalyze = ANALYZABLE_KEYS.has(doc.document_key)
  const isStale = canAnalyze && doc.ai_analysis === null && (doc.replaced_count ?? 0) > 0
  const isCertidao = doc.document_key === 'pf_certidao_estado_civil'
  const needsPessoaisFirst =
    isCertidao &&
    (!pessoaisAnalysis || !pessoaisAnalysis.nome || pessoaisAnalysis.is_personal_document === false)

  const [analyzing, setAnalyzing] = useState(false)
  const [extracted, setExtracted] = useState<ExtractedData | null>(doc.ai_analysis ?? null)
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState('')

  useEffect(() => {
    setExtracted(doc.ai_analysis ?? null)
  }, [doc.ai_analysis])

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
    } catch (e: any) {
      const msg =
        e?.response?.message ||
        e?.response?.error ||
        (e instanceof Error ? e.message : 'Erro ao analisar documento.')
      setError(msg)
    } finally {
      setAnalyzing(false)
    }
  }

  const handleDownload = async () => {
    setDownloading(true)
    setDownloadError('')
    try {
      const res = await pb.send('/backend/v1/document-file-url', {
        method: 'POST',
        body: { check_id: doc.id, disposition: 'inline' },
      })
      if (res.url) {
        window.open(res.url, '_blank')
      }
    } catch (e: any) {
      setDownloadError(e?.response?.message || e?.message || 'Erro ao obter link do documento.')
    } finally {
      setDownloading(false)
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
        {extracted?.is_personal_document === false ||
        extracted?.is_certidao_estado_civil === false ||
        extracted?.is_comprovante_residencia === false ? (
          <Badge className="bg-rose-100 text-rose-700 border-none text-[9px] font-bold px-2 py-0.5 shrink-0">
            Documento Errado
          </Badge>
        ) : isStale ? (
          <Badge className="bg-amber-100 text-amber-700 border-none text-[9px] font-bold px-2 py-0.5 shrink-0">
            Reanalisar
          </Badge>
        ) : (
          <Badge className="bg-emerald-100 text-emerald-700 border-none text-[9px] font-bold px-2 py-0.5 shrink-0">
            Enviado
          </Badge>
        )}
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

        {isStale && <StaleAnalysisBanner />}

        {extracted ? (
          <div className="space-y-3">
            <ExtractedInfo data={extracted} documentKey={doc.document_key} />
            {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
            {canAnalyze && (
              <div className="flex items-center gap-2 pt-1">
                <Button
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  variant="outline"
                  className="h-8 text-xs font-semibold gap-1.5 border-brand-primary/15 text-brand-primary/70 hover:bg-slate-100"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Reanalisando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" /> Reanalisar
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        ) : canAnalyze && needsPessoaisFirst ? (
          <div className="rounded-lg border border-dashed border-amber-200 bg-amber-50/50 p-4 flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0" />
            <p className="text-xs text-amber-700 leading-relaxed">
              Analise os <strong>Documentos Pessoais</strong> primeiro para poder analisar a
              Certidão de Estado Civil.
            </p>
          </div>
        ) : canAnalyze ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-dashed border-brand-primary/15 bg-white p-4 flex items-center gap-3">
              <Scan className="w-6 h-6 text-brand-secondary/40 shrink-0" />
              <p className="text-xs text-brand-primary/50 leading-relaxed">
                {isCertidao ? (
                  <>
                    Clique em <strong>Analisar</strong> para extrair tipo de certidão, nomes,
                    cartório e estado civil usando IA.
                  </>
                ) : doc.document_key === 'pf_comprovante_residencia' ? (
                  <>
                    Clique em <strong>Analisar</strong> para extrair titular, endereço completo e
                    tipo de comprovante usando IA.
                  </>
                ) : (
                  <>
                    Clique em <strong>Analisar</strong> para extrair RG, CPF, Nome e Estado deste
                    documento usando IA.
                  </>
                )}
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

      {doc.document_url && (
        <div className="px-5 py-3 border-t border-brand-primary/5 flex items-center gap-2">
          <Button
            onClick={handleDownload}
            disabled={downloading}
            variant="outline"
            className="h-8 text-xs font-semibold gap-1.5 border-brand-primary/15 text-brand-primary/70 hover:bg-slate-100"
          >
            {downloading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Abrindo...
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" /> Ver Documento
              </>
            )}
          </Button>
          {downloadError && <p className="text-xs text-rose-600 font-medium">{downloadError}</p>}
        </div>
      )}
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

  const pessoaisDoc = docs.find((d) => d.document_key === 'pf_documentos_pessoais' && d.ai_analysis)
  const pessoaisAnalysis = pessoaisDoc?.ai_analysis ?? null
  const pessoaisNome = (pessoaisAnalysis?.nome || '').trim().toLowerCase()

  const conjugeDoc = docs.find(
    (d) => d.document_key === 'pf_documentos_pessoais_conjuge' && d.ai_analysis,
  )
  const conjugeAnalysis = conjugeDoc?.ai_analysis ?? null
  const conjugeNome = (conjugeAnalysis?.nome || '').trim().toLowerCase()

  function normalizeName(name: string) {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .trim()
  }

  const attentionItems: AttentionItem[] = docs.flatMap((doc) => {
    const items: AttentionItem[] = []
    const label = getDocumentLabel(doc.document_key)
    const analysis = doc.ai_analysis

    if (analysis && analysis.is_personal_document === false) {
      items.push({
        docLabel: label,
        message: `Não é um RG ou CNH${analysis.document_type_detected ? `. Identificado como: ${analysis.document_type_detected}` : ''}`,
        severity: 'error',
      })
    }

    if (analysis && analysis.is_certidao_estado_civil === false) {
      items.push({
        docLabel: label,
        message: `Não é uma certidão de estado civil${analysis.document_type_detected ? `. Identificado como: ${analysis.document_type_detected}` : ''}`,
        severity: 'error',
      })
    }

    if (
      doc.document_key === 'pf_certidao_estado_civil' &&
      analysis?.is_certidao_estado_civil === true &&
      analysis.nomes_mencionados &&
      analysis.nomes_mencionados.length > 0
    ) {
      if (pessoaisNome && pessoaisNome !== 'não identificado') {
        const normalizedPessoais = normalizeName(pessoaisNome)
        const nameFound = analysis.nomes_mencionados.some(
          (n) => normalizeName(n) === normalizedPessoais,
        )
        if (!nameFound) {
          items.push({
            docLabel: label,
            message: `O nome do proprietário ("${pessoaisAnalysis?.nome}") não foi encontrado entre os nomes da certidão: ${analysis.nomes_mencionados.join(', ')}`,
            severity: 'warning',
          })
        }
      }

      if (conjugeNome && conjugeNome !== 'não identificado') {
        const normalizedConjuge = normalizeName(conjugeNome)
        const conjugeFound = analysis.nomes_mencionados.some(
          (n) => normalizeName(n) === normalizedConjuge,
        )
        if (!conjugeFound) {
          items.push({
            docLabel: label,
            message: `O nome do cônjuge ("${conjugeAnalysis?.nome}") não foi encontrado entre os nomes da certidão: ${analysis.nomes_mencionados.join(', ')}`,
            severity: 'warning',
          })
        }
      }
    }

    if (
      doc.document_key === 'pf_comprovante_residencia' &&
      analysis?.is_comprovante_residencia === true &&
      pessoaisNome &&
      pessoaisNome !== 'não identificado' &&
      analysis.nome_titular &&
      analysis.nome_titular !== 'Não Identificado' &&
      analysis.nome_titular !== 'Não Aplicável'
    ) {
      const normalizedTitular = normalizeName(analysis.nome_titular)
      const normalizedProp = normalizeName(pessoaisNome)
      if (normalizedTitular !== normalizedProp) {
        items.push({
          docLabel: label,
          message: `O titular do comprovante ("${analysis.nome_titular}") não confere com o proprietário ("${pessoaisAnalysis?.nome}")`,
          severity: 'warning',
        })
      }
    }

    if (analysis && analysis.is_comprovante_residencia === false) {
      items.push({
        docLabel: label,
        message: `Não é um comprovante de residência${analysis.document_type_detected ? `. Identificado como: ${analysis.document_type_detected}` : ''}`,
        severity: 'error',
      })
    }

    if (
      ANALYZABLE_KEYS.has(doc.document_key) &&
      analysis === null &&
      (doc.replaced_count ?? 0) > 0
    ) {
      items.push({
        docLabel: label,
        message: 'Documento substituído — reanálise necessária.',
        severity: 'warning',
      })
    }

    return items
  })

  return (
    <div className="space-y-4">
      {attentionItems.length > 0 && <AttentionReport items={attentionItems} />}

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
        <DocumentPreviewCard key={doc.id} doc={doc} pessoaisAnalysis={pessoaisAnalysis} />
      ))}
    </div>
  )
}
