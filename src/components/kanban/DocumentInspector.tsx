import { useState, useEffect, useMemo } from 'react'
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
  FileStack,
  Shield,
  Landmark,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import {
  getDocumentLabel,
  OWNER_PF_KEYS,
  OWNER_PJ_KEYS,
  MATRICULA_KEYS,
  CERTIDAO_AMBIENTAL_KEYS,
  CERTIDAO_FISCAL_KEYS,
} from '@/lib/document-labels'
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
  is_car?: boolean
  is_certidao_matricula?: boolean
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
  nome_imovel?: string
  numero_matricula?: string
  numero_car?: string
  area_hectares?: string
  municipio?: string
}

interface LandSubject {
  id: string
  land_id: string
  kind: 'owner' | 'matricula'
  label: string
  owner_type?: string
  sort_order?: number
}

interface AttentionItem {
  docLabel: string
  message: string
  severity: 'error' | 'warning'
  subjectLabel?: string
}

const ANALYZABLE_KEYS = new Set([
  'pf_documentos_pessoais',
  'pf_documentos_pessoais_conjuge',
  'pf_certidao_estado_civil',
  'pf_comprovante_residencia',
])

const OWNER_KEYS_SET = new Set([...OWNER_PF_KEYS, ...OWNER_PJ_KEYS])
const MATRICULA_KEYS_SET = new Set(MATRICULA_KEYS)
const CERTIDAO_AMBIENTAL_SET = new Set(CERTIDAO_AMBIENTAL_KEYS)
const CERTIDAO_FISCAL_SET = new Set(CERTIDAO_FISCAL_KEYS)

function normalizeName(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
}

function VisibilityBadge({ level }: { level: string }) {
  if (!level || typeof level !== 'string') return null
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

function StatusBadge({ doc, extracted }: { doc: DocumentRecord; extracted: ExtractedData | null }) {
  if (
    extracted?.is_personal_document === false ||
    extracted?.is_certidao_estado_civil === false ||
    extracted?.is_comprovante_residencia === false
  ) {
    return (
      <Badge className="bg-rose-100 text-rose-700 border-none text-[9px] font-bold px-2 py-0.5">
        Documento Errado
      </Badge>
    )
  }
  const canAnalyze = ANALYZABLE_KEYS.has(doc.document_key)
  const isStale = canAnalyze && doc.ai_analysis === null && (doc.replaced_count ?? 0) > 0
  if (isStale) {
    return (
      <Badge className="bg-amber-100 text-amber-700 border-none text-[9px] font-bold px-2 py-0.5">
        Reanalisar
      </Badge>
    )
  }
  if (extracted) {
    return (
      <Badge className="bg-emerald-100 text-emerald-700 border-none text-[9px] font-bold px-2 py-0.5">
        Analisado
      </Badge>
    )
  }
  return (
    <Badge className="bg-slate-100 text-slate-600 border-none text-[9px] font-bold px-2 py-0.5">
      Enviado
    </Badge>
  )
}

function extractedSummary(data: ExtractedData, documentKey: string): string {
  if (documentKey === 'pf_comprovante_residencia') {
    if (data.is_comprovante_residencia === false) return 'Documento errado'
    if (data.is_comprovante_residencia === true) {
      return [data.nome_titular, data.cidade ? `${data.cidade}/${data.estado}` : '']
        .filter(Boolean)
        .join(' · ')
    }
    return 'Análise desatualizada'
  }
  if (documentKey === 'pf_certidao_estado_civil') {
    if (data.is_certidao_estado_civil === false) return 'Documento errado'
    if (data.is_certidao_estado_civil === true) {
      return [data.tipo_certidao, data.estado_civil_resultante].filter(Boolean).join(' · ')
    }
    return 'Análise desatualizada'
  }
  if (data.is_personal_document === false) return 'Documento errado'
  return [data.nome, data.cpf].filter(Boolean).join(' · ')
}

function DetailGrid({ items }: { items: { icon: any; label: string; value?: string }[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
      {items.map(({ icon: Icon, label, value }) => (
        <div key={label} className="flex items-center gap-2.5 bg-slate-50 rounded-lg px-3 py-2">
          <Icon className="w-3.5 h-3.5 text-brand-secondary shrink-0" />
          <div className="min-w-0">
            <p className="text-[9px] font-semibold text-brand-primary/40 uppercase tracking-wider">
              {label}
            </p>
            <p className="text-xs font-semibold text-brand-primary truncate">
              {value || 'Não Identificado'}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

function ExpandedDetails({ data, documentKey }: { data: ExtractedData; documentKey: string }) {
  if (documentKey === 'pf_comprovante_residencia') {
    if (data.is_comprovante_residencia === false) {
      return (
        <p className="text-xs text-rose-600">
          Não é um comprovante de residência.
          {data.document_type_detected && ` Identificado como: ${data.document_type_detected}`}
        </p>
      )
    }
    if (data.is_comprovante_residencia !== true) {
      return (
        <p className="text-xs text-amber-600">
          Análise desatualizada — reanalisar para usar o novo modelo.
        </p>
      )
    }
    return (
      <div className="space-y-2">
        {data.good_visibility && data.good_visibility !== 'Não Aplicável' && (
          <VisibilityBadge level={data.good_visibility} />
        )}
        <DetailGrid
          items={[
            { icon: User, label: 'Titular', value: data.nome_titular },
            { icon: MapPin, label: 'Endereço', value: data.endereco_completo },
            { icon: Building2, label: 'Bairro', value: data.bairro },
            {
              icon: MapPin,
              label: 'Cidade/UF',
              value:
                data.cidade && data.estado
                  ? `${data.cidade} - ${data.estado}`
                  : data.cidade || data.estado,
            },
            { icon: FileText, label: 'CEP', value: data.cep },
            { icon: FileText, label: 'Tipo', value: data.tipo_comprovante },
            { icon: Calendar, label: 'Referência', value: data.data_referencia },
          ]}
        />
      </div>
    )
  }

  if (documentKey === 'pf_certidao_estado_civil') {
    if (data.is_certidao_estado_civil === false) {
      return (
        <p className="text-xs text-rose-600">
          Não é uma certidão de estado civil.
          {data.document_type_detected && ` Identificado como: ${data.document_type_detected}`}
        </p>
      )
    }
    if (data.is_certidao_estado_civil !== true) {
      return (
        <p className="text-xs text-amber-600">
          Análise desatualizada — reanalisar para usar o novo modelo.
        </p>
      )
    }
    return (
      <div className="space-y-2">
        {data.good_visibility && data.good_visibility !== 'Não Aplicável' && (
          <VisibilityBadge level={data.good_visibility} />
        )}
        <DetailGrid
          items={[
            { icon: Heart, label: 'Tipo', value: data.tipo_certidao },
            { icon: User, label: 'Estado Civil', value: data.estado_civil_resultante },
            { icon: Calendar, label: 'Data Emissão', value: data.data_emissao },
            { icon: Building2, label: 'Cartório', value: data.cartorio },
          ]}
        />
        {data.nomes_mencionados && data.nomes_mencionados.length > 0 && (
          <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
            <Users className="w-3.5 h-3.5 text-brand-secondary shrink-0" />
            <div>
              <p className="text-[9px] font-semibold text-brand-primary/40 uppercase tracking-wider">
                Pessoas mencionadas
              </p>
              <p className="text-xs font-semibold text-brand-primary">
                {data.nomes_mencionados.join(', ')}
              </p>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (data.is_personal_document === false) {
    return (
      <p className="text-xs text-rose-600">
        Não é um documento pessoal (RG ou CNH).
        {data.document_type_detected && ` Identificado como: ${data.document_type_detected}`}
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {data.good_visibility && <VisibilityBadge level={data.good_visibility} />}
      <DetailGrid
        items={[
          { icon: User, label: 'Nome', value: data.nome },
          { icon: CreditCard, label: 'CPF', value: data.cpf },
          { icon: IdCard, label: 'RG', value: data.rg },
          { icon: MapPin, label: 'Estado', value: data.estado },
        ]}
      />
    </div>
  )
}

function DocumentRow({
  doc,
  pessoaisAnalysis,
}: {
  doc: DocumentRecord
  pessoaisAnalysis?: ExtractedData | null
}) {
  const label = getDocumentLabel(doc.document_key)
  const senderName = doc.expand?.user?.name || doc.expand?.user?.email?.split('@')[0] || '—'
  const canAnalyze = ANALYZABLE_KEYS.has(doc.document_key)
  const isCertidao = doc.document_key === 'pf_certidao_estado_civil'
  const needsPessoaisFirst =
    isCertidao &&
    (!pessoaisAnalysis || !pessoaisAnalysis.nome || pessoaisAnalysis.is_personal_document === false)

  const [analyzing, setAnalyzing] = useState(false)
  const [extracted, setExtracted] = useState<ExtractedData | null>(doc.ai_analysis ?? null)
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [expanded, setExpanded] = useState(false)

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
        setExpanded(true)
      } else if (res.raw) {
        setError('A IA retornou um formato inesperado.')
      }
    } catch (e: any) {
      const msg =
        e?.response?.message ||
        e?.response?.error ||
        (e instanceof Error ? e.message : 'Erro ao analisar.')
      setError(msg)
    } finally {
      setAnalyzing(false)
    }
  }

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const res = await pb.send('/backend/v1/document-file-url', {
        method: 'POST',
        body: { check_id: doc.id, disposition: 'inline' },
      })
      if (res.url) window.open(res.url, '_blank')
    } catch (_) {
      /* ignore */
    }
    setDownloading(false)
  }

  const summary = extracted ? extractedSummary(extracted, doc.document_key) : null

  return (
    <div className="border-t border-brand-primary/5 first:border-t-0">
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50/80 transition-colors',
          expanded && 'bg-slate-50/50',
        )}
        onClick={() => setExpanded((v) => !v)}
      >
        <FileText className="w-4 h-4 text-brand-secondary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-brand-primary truncate">{label}</p>
          {summary ? (
            <p className="text-[11px] text-brand-primary/50 truncate mt-0.5">{summary}</p>
          ) : (
            <p className="text-[11px] text-brand-primary/40 mt-0.5">
              Enviado por {senderName} em {format(new Date(doc.updated), 'dd/MM/yyyy')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge doc={doc} extracted={extracted} />
          <ChevronDown
            className={cn(
              'w-4 h-4 text-brand-primary/30 transition-transform',
              expanded && 'rotate-180',
            )}
          />
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {extracted ? (
            <ExpandedDetails data={extracted} documentKey={doc.document_key} />
          ) : canAnalyze && needsPessoaisFirst ? (
            <p className="text-xs text-amber-600">
              <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
              Analise os Documentos Pessoais primeiro.
            </p>
          ) : canAnalyze ? (
            <div className="flex items-center gap-2">
              <Scan className="w-4 h-4 text-brand-secondary/40 shrink-0" />
              <p className="text-xs text-brand-primary/50">
                {isCertidao
                  ? 'Extrair tipo de certidão, nomes, cartório e estado civil.'
                  : doc.document_key === 'pf_comprovante_residencia'
                    ? 'Extrair titular, endereço completo e tipo de comprovante.'
                    : 'Extrair RG, CPF, Nome e Estado.'}
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-brand-primary/20 shrink-0" />
              <p className="text-xs text-brand-primary/40">Análise com IA em breve.</p>
            </div>
          )}

          {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}

          <div className="flex items-center gap-2 pt-1">
            {canAnalyze && !needsPessoaisFirst && (
              <Button
                onClick={(e) => {
                  e.stopPropagation()
                  handleAnalyze()
                }}
                disabled={analyzing}
                variant={extracted ? 'outline' : 'default'}
                className={cn(
                  'h-7 text-[11px] font-semibold gap-1.5',
                  extracted
                    ? 'border-brand-primary/15 text-brand-primary/70 hover:bg-slate-100'
                    : 'bg-brand-secondary hover:bg-brand-secondary/90 text-white',
                )}
              >
                {analyzing ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />{' '}
                    {extracted ? 'Reanalisando...' : 'Analisando...'}
                  </>
                ) : (
                  <>
                    {extracted ? (
                      <RefreshCw className="w-3 h-3" />
                    ) : (
                      <Sparkles className="w-3 h-3" />
                    )}
                    {extracted ? 'Reanalisar' : 'Analisar com IA'}
                  </>
                )}
              </Button>
            )}
            {doc.document_url && (
              <Button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDownload()
                }}
                disabled={downloading}
                variant="outline"
                className="h-7 text-[11px] font-semibold gap-1.5 border-brand-primary/15 text-brand-primary/70 hover:bg-slate-100"
              >
                {downloading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Download className="w-3 h-3" />
                )}
                Ver Documento
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function SubjectSection({
  icon: Icon,
  label,
  badge,
  docs,
  pessoaisAnalysis,
  attentionItems,
}: {
  icon: any
  label: string
  badge?: string
  docs: DocumentRecord[]
  pessoaisAnalysis?: ExtractedData | null
  attentionItems: AttentionItem[]
}) {
  if (docs.length === 0 && attentionItems.length === 0) return null

  return (
    <div className="bg-white rounded-xl border border-brand-primary/10 shadow-sm overflow-hidden">
      <div className="px-4 py-3 flex items-center gap-3 border-b border-brand-primary/5">
        <Icon className="w-4 h-4 text-brand-secondary shrink-0" />
        <span className="text-xs font-bold text-brand-primary/70 uppercase tracking-wider flex-1">
          {label}
        </span>
        {badge && (
          <Badge className="bg-brand-secondary/10 text-brand-secondary border-none text-[9px] font-bold px-1.5 py-0">
            {badge}
          </Badge>
        )}
        <Badge className="bg-slate-100 text-slate-600 border-none text-[9px] font-bold px-1.5 py-0">
          {docs.length} {docs.length === 1 ? 'doc' : 'docs'}
        </Badge>
      </div>

      {attentionItems.length > 0 && (
        <div className="border-b border-brand-primary/5 bg-rose-50/30">
          {attentionItems.map((item, i) => (
            <div key={i} className="px-4 py-2 flex items-start gap-2.5 text-xs">
              {item.severity === 'error' ? (
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
              )}
              <div>
                <span
                  className={cn(
                    'font-semibold',
                    item.severity === 'error' ? 'text-rose-700' : 'text-amber-700',
                  )}
                >
                  {item.docLabel}:
                </span>{' '}
                <span
                  className={item.severity === 'error' ? 'text-rose-600/80' : 'text-amber-600/80'}
                >
                  {item.message}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="divide-y-0">
        {docs.map((doc) => (
          <DocumentRow key={doc.id} doc={doc} pessoaisAnalysis={pessoaisAnalysis} />
        ))}
      </div>
    </div>
  )
}

function buildSubjectAttentionItems(subjectDocs: DocumentRecord[]): AttentionItem[] {
  const items: AttentionItem[] = []

  const pessoaisDoc = subjectDocs.find(
    (d) => d.document_key === 'pf_documentos_pessoais' && d.ai_analysis,
  )
  const pessoaisAnalysis = pessoaisDoc?.ai_analysis ?? null
  const pessoaisNome = (pessoaisAnalysis?.nome || '').trim()

  const conjugeDoc = subjectDocs.find(
    (d) => d.document_key === 'pf_documentos_pessoais_conjuge' && d.ai_analysis,
  )
  const conjugeAnalysis = conjugeDoc?.ai_analysis ?? null
  const conjugeNome = (conjugeAnalysis?.nome || '').trim()

  for (const doc of subjectDocs) {
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
      const knownNames: string[] = []
      if (pessoaisNome && pessoaisNome.toLowerCase() !== 'não identificado') {
        knownNames.push(pessoaisNome)
      }
      if (conjugeNome && conjugeNome.toLowerCase() !== 'não identificado') {
        knownNames.push(conjugeNome)
      }

      for (const known of knownNames) {
        const normalizedKnown = normalizeName(known)
        const found = analysis.nomes_mencionados.some((n) => normalizeName(n) === normalizedKnown)
        if (!found) {
          const role = known === pessoaisNome ? 'proprietário' : 'cônjuge'
          items.push({
            docLabel: label,
            message: `O nome do ${role} ("${known}") não foi encontrado entre os nomes da certidão: ${analysis.nomes_mencionados.join(', ')}`,
            severity: 'warning',
          })
        }
      }
    }

    if (
      doc.document_key === 'pf_comprovante_residencia' &&
      analysis?.is_comprovante_residencia === true &&
      analysis.nome_titular &&
      analysis.nome_titular !== 'Não Identificado' &&
      analysis.nome_titular !== 'Não Aplicável'
    ) {
      const normalizedTitular = normalizeName(analysis.nome_titular)

      const knownNames: { name: string; normalized: string }[] = []
      if (pessoaisNome && pessoaisNome.toLowerCase() !== 'não identificado') {
        knownNames.push({ name: pessoaisNome, normalized: normalizeName(pessoaisNome) })
      }
      if (conjugeNome && conjugeNome.toLowerCase() !== 'não identificado') {
        knownNames.push({ name: conjugeNome, normalized: normalizeName(conjugeNome) })
      }

      if (knownNames.length > 0) {
        const matchesAny = knownNames.some((k) => k.normalized === normalizedTitular)
        if (!matchesAny) {
          const nomes = knownNames.map((k) => `"${k.name}"`)
          items.push({
            docLabel: label,
            message: `O titular do comprovante ("${analysis.nome_titular}") não confere com ${nomes.length > 1 ? 'o proprietário nem o cônjuge' : 'o proprietário'} (${nomes.join(', ')})`,
            severity: 'warning',
          })
        }
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
  }

  return items
}

export function DocumentInspector({ landId }: { landId: string }) {
  const [docs, setDocs] = useState<DocumentRecord[]>([])
  const [subjects, setSubjects] = useState<LandSubject[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    try {
      const [records, subjectRecords] = await Promise.all([
        pb.collection('document_checks').getFullList({
          filter: `land_id="${landId}" && is_completed=true && document_url!=""`,
          expand: 'user',
          sort: '-updated',
        }),
        pb.collection('land_subjects').getFullList({
          filter: `land_id="${landId}"`,
          sort: 'sort_order,created',
        }),
      ])
      setDocs(records as unknown as DocumentRecord[])
      setSubjects(subjectRecords as unknown as LandSubject[])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [landId])

  useRealtime('document_checks', (e) => {
    if (e.record.land_id === landId) fetchData()
  })

  const grouped = useMemo(() => {
    const ownerSubjects = subjects
      .filter((s) => s.kind === 'owner')
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    const matriculaSubjects = subjects
      .filter((s) => s.kind === 'matricula')
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

    const ownerSections = ownerSubjects.map((sub) => {
      const subDocs = docs.filter(
        (d) => d.subject_id === sub.id && OWNER_KEYS_SET.has(d.document_key),
      )
      const pessoaisDoc = subDocs.find(
        (d) => d.document_key === 'pf_documentos_pessoais' && d.ai_analysis,
      )
      return {
        subject: sub,
        docs: subDocs,
        pessoaisAnalysis: pessoaisDoc?.ai_analysis ?? null,
        attentionItems: buildSubjectAttentionItems(subDocs),
      }
    })

    const matriculaSections = matriculaSubjects.map((sub) => {
      const subDocs = docs.filter(
        (d) => d.subject_id === sub.id && MATRICULA_KEYS_SET.has(d.document_key),
      )
      return {
        subject: sub,
        docs: subDocs,
        attentionItems: [] as AttentionItem[],
      }
    })

    const certidaoAmbientalDocs = docs.filter((d) => CERTIDAO_AMBIENTAL_SET.has(d.document_key))
    const certidaoFiscalDocs = docs.filter((d) => CERTIDAO_FISCAL_SET.has(d.document_key))

    const categorizedIds = new Set<string>()
    for (const sec of ownerSections) sec.docs.forEach((d) => categorizedIds.add(d.id))
    for (const sec of matriculaSections) sec.docs.forEach((d) => categorizedIds.add(d.id))
    certidaoAmbientalDocs.forEach((d) => categorizedIds.add(d.id))
    certidaoFiscalDocs.forEach((d) => categorizedIds.add(d.id))
    const uncategorizedDocs = docs.filter((d) => !categorizedIds.has(d.id))

    return {
      ownerSections,
      matriculaSections,
      certidaoAmbientalDocs,
      certidaoFiscalDocs,
      uncategorizedDocs,
    }
  }, [docs, subjects])

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

  const allAttentionItems = grouped.ownerSections.flatMap((s) =>
    s.attentionItems.map((item) => ({ ...item, subjectLabel: s.subject.label })),
  )
  const errorCount = allAttentionItems.filter((i) => i.severity === 'error').length
  const warningCount = allAttentionItems.filter((i) => i.severity === 'warning').length

  return (
    <div className="space-y-4">
      {allAttentionItems.length > 0 && (
        <div className="bg-white rounded-xl border border-brand-primary/10 shadow-sm overflow-hidden">
          <div className="px-4 py-3 flex items-center gap-3 border-b border-brand-primary/5 bg-rose-50/50">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="text-xs font-bold text-brand-primary/70 uppercase tracking-wider flex-1">
              Pontos de Atenção
            </span>
            {errorCount > 0 && (
              <Badge className="bg-rose-100 text-rose-700 border-none text-[9px] font-bold px-1.5 py-0">
                {errorCount} {errorCount === 1 ? 'erro' : 'erros'}
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge className="bg-amber-100 text-amber-700 border-none text-[9px] font-bold px-1.5 py-0">
                {warningCount} {warningCount === 1 ? 'aviso' : 'avisos'}
              </Badge>
            )}
          </div>
          <div className="divide-y divide-brand-primary/5">
            {allAttentionItems.map((item, i) => (
              <div key={i} className="px-4 py-2.5 flex items-start gap-2.5 text-xs">
                {item.severity === 'error' ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                )}
                <div>
                  {item.subjectLabel && (
                    <Badge className="bg-slate-100 text-slate-600 border-none text-[9px] font-bold px-1.5 py-0 mr-1.5">
                      {item.subjectLabel}
                    </Badge>
                  )}
                  <span
                    className={cn(
                      'font-semibold',
                      item.severity === 'error' ? 'text-rose-700' : 'text-amber-700',
                    )}
                  >
                    {item.docLabel}:
                  </span>{' '}
                  <span
                    className={item.severity === 'error' ? 'text-rose-600/80' : 'text-amber-600/80'}
                  >
                    {item.message}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {grouped.ownerSections.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-brand-primary/50 uppercase tracking-wider flex items-center gap-2 px-1">
            <User className="w-3.5 h-3.5" />
            Proprietários
          </h3>
          {grouped.ownerSections.map((section) => (
            <SubjectSection
              key={section.subject.id}
              icon={User}
              label={section.subject.label}
              badge={section.subject.owner_type === 'pj' ? 'PJ' : 'PF'}
              docs={section.docs}
              pessoaisAnalysis={section.pessoaisAnalysis}
              attentionItems={section.attentionItems}
            />
          ))}
        </div>
      )}

      {grouped.matriculaSections.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-brand-primary/50 uppercase tracking-wider flex items-center gap-2 px-1">
            <FileStack className="w-3.5 h-3.5" />
            Matrículas
          </h3>
          {grouped.matriculaSections.map((section) => (
            <SubjectSection
              key={section.subject.id}
              icon={FileStack}
              label={section.subject.label}
              docs={section.docs}
              attentionItems={section.attentionItems}
            />
          ))}
        </div>
      )}

      {grouped.certidaoAmbientalDocs.length > 0 && (
        <SubjectSection
          icon={Shield}
          label="Certidões Ambientais"
          docs={grouped.certidaoAmbientalDocs}
          attentionItems={[]}
        />
      )}

      {grouped.certidaoFiscalDocs.length > 0 && (
        <SubjectSection
          icon={Landmark}
          label="Certidões Fiscais"
          docs={grouped.certidaoFiscalDocs}
          attentionItems={[]}
        />
      )}

      {grouped.uncategorizedDocs.length > 0 && (
        <SubjectSection
          icon={FileText}
          label="Outros Documentos"
          docs={grouped.uncategorizedDocs}
          attentionItems={[]}
        />
      )}
    </div>
  )
}
