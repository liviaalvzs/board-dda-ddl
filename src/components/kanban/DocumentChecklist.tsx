import { useState, useEffect, useRef, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  CheckCircle2,
  FileText,
  Upload,
  RefreshCw,
  Loader2,
  AlertCircle,
  Ban,
  Undo2,
} from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { getDocumentTypes, type DocumentType } from '@/services/app-settings'
import { uploadDocumentToS3 } from '@/services/s3-upload'
import { setDocumentNotApplicable } from '@/services/documents'
import { DocumentInfo } from '@/components/document-upload/DocumentInfo'
import { DocumentFileActions } from '@/components/document-upload/DocumentFileActions'
import {
  DOCUMENT_GROUP_IDS,
  DOCUMENT_GROUP_LABEL,
  OWNER_TYPE_LABEL,
  computeDocumentProgress,
  getExclusionReason,
  progressPercent,
  type OwnerType,
} from '@/lib/document-groups'

const MAX_SIZE = 10 * 1024 * 1024
const ALLOWED_MIMES = ['application/pdf', 'image/jpeg', 'image/png']

export function DocumentChecklist({ landId, metadata }: { landId: string; metadata: any }) {
  const [checks, setChecks] = useState<Record<string, any>>({})
  const [docTypes, setDocTypes] = useState<DocumentType[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadingKey, setUploadingKey] = useState<string | null>(null)
  const [togglingKey, setTogglingKey] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const { toast } = useToast()

  const fetchChecks = async () => {
    try {
      const records = await pb
        .collection('document_checks')
        .getFullList({ filter: `land_id="${landId}"`, expand: 'user' })
      const map: Record<string, any> = {}
      records.forEach((r) => {
        if (!map[r.document_key]) map[r.document_key] = r
      })
      setChecks(map)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Sem filtro por "dda": ele excluía os tipos de documento dda_existente e
    // dda_distribuida, que não existem mais desde a troca pela lista dos Anexos.
    // Mantê-lo esconderia silenciosamente qualquer documento futuro cujo nome
    // contivesse "dda".
    getDocumentTypes()
      .then(setDocTypes)
      .catch(() => setDocTypes([]))
    fetchChecks()
  }, [landId])

  useRealtime('document_checks', (e) => {
    if (e.record.land_id === landId) fetchChecks()
  })

  const handleFileUpload = async (key: string, file: File) => {
    setErrors((prev) => ({ ...prev, [key]: '' }))
    const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
    if (!ALLOWED_MIMES.includes(file.type) && !['.pdf', '.jpg', '.jpeg', '.png'].includes(ext)) {
      setErrors((prev) => ({ ...prev, [key]: 'Formato não permitido. Aceitos: PDF, JPG, PNG.' }))
      return
    }
    if (file.size > MAX_SIZE) {
      setErrors((prev) => ({ ...prev, [key]: 'O arquivo excede o tamanho máximo de 10 MB.' }))
      return
    }
    setUploadingKey(key)
    try {
      const clusterSerial = metadata?.cluster_serial || ''
      if (!clusterSerial) {
        setErrors((prev) => ({
          ...prev,
          [key]: 'Cluster serial não definido para esta terra.',
        }))
        return
      }
      const existing = checks[key]
      await uploadDocumentToS3(landId, clusterSerial, key, file, existing?.id)
      toast({ title: 'Documento enviado com sucesso!' })
      fetchChecks()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao enviar arquivo. Tente novamente.'
      setErrors((prev) => ({ ...prev, [key]: msg }))
    } finally {
      setUploadingKey(null)
    }
  }

  // O status vem do envio do arquivo, não de marcação manual. Os arquivos vivem
  // só no S3, então a presença de document_url é o que define "enviado". Mesma
  // regra da aba Documentos, para os dois lugares nunca divergirem.
  const ownerType = (metadata?.owner_type || '') as OwnerType

  const docsWithStatus = useMemo(() => {
    return docTypes.map((doc) => {
      const check = checks[doc.key]
      const isCompleted = !!(check?.is_completed && check?.document_url)
      const exclusion = getExclusionReason(doc.category, ownerType, !!check?.not_applicable)
      return { doc, check, isCompleted, exclusion }
    })
  }, [docTypes, checks, ownerType])

  const handleToggleNotApplicable = async (key: string, next: boolean) => {
    setTogglingKey(key)
    try {
      await setDocumentNotApplicable(landId, key, next)
      toast({
        title: next ? 'Documento dispensado' : 'Documento voltou a ser exigido',
        description: 'A contagem de progresso foi ajustada.',
      })
      fetchChecks()
    } catch (e) {
      toast({
        title: 'Erro ao alterar o documento',
        description: e instanceof Error ? e.message : 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setTogglingKey(null)
    }
  }

  const groupedDocs = useMemo(() => {
    const groups: { category: string; docs: typeof docsWithStatus }[] = []
    for (const item of docsWithStatus) {
      const category = item.doc.category || 'Outros documentos'
      let group = groups.find((g) => g.category === category)
      if (!group) {
        group = { category, docs: [] }
        groups.push(group)
      }
      group.docs.push(item)
    }
    return groups
  }, [docsWithStatus])

  // Básicos e certidões andam separados: um depende do proprietário entregar,
  // o outro de órgão emitir. Um número só não dizia qual dos dois estava preso.
  //
  // O cálculo é o mesmo que o card do board usa, para os dois não divergirem.
  const groupProgress = useMemo(() => {
    const completedKeys = new Set(docsWithStatus.filter((d) => d.isCompleted).map((d) => d.doc.key))
    const notApplicableKeys = new Set(
      docsWithStatus.filter((d) => !!d.check?.not_applicable).map((d) => d.doc.key),
    )
    return computeDocumentProgress(docTypes, ownerType, completedKeys, notApplicableKeys)
  }, [docsWithStatus, docTypes, ownerType])

  if (loading) return null

  if (docTypes.length === 0) {
    return (
      <div className="bg-white p-8 rounded-xl border border-dashed border-brand-primary/20 text-center">
        <AlertCircle className="w-8 h-8 text-brand-primary/30 mx-auto mb-3" />
        <p className="text-sm text-brand-primary/60 font-medium">
          Nenhum tipo de documento configurado. Entre em contato com o administrador.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-brand-primary/10">
        <h3 className="text-xl font-display text-brand-primary flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-brand-secondary" /> Progresso da Due Diligence
        </h3>
        <div className="grid gap-5 sm:grid-cols-2 mt-4">
          {DOCUMENT_GROUP_IDS.map((groupId) => {
            const group = groupProgress[groupId]
            const percent = progressPercent(group)

            return (
              <div key={groupId}>
                <div className="flex items-end justify-between gap-3 mb-2">
                  <div>
                    <p className="text-sm font-semibold text-brand-primary">
                      {DOCUMENT_GROUP_LABEL[groupId]}
                    </p>
                    <p className="text-xs font-medium text-brand-primary/60 mt-0.5">
                      {group.completed} de {group.total} validados
                    </p>
                  </div>
                  <span className="text-2xl font-bold text-brand-secondary leading-none">
                    {Math.round(percent)}%
                  </span>
                </div>
                <Progress
                  value={percent}
                  className="h-3 bg-brand-primary/5"
                  indicatorClassName="bg-brand-secondary transition-all duration-500 ease-in-out"
                />
              </div>
            )
          })}
        </div>
      </div>

      {groupedDocs.map((group) => {
        const required = group.docs.filter((d) => !d.exclusion)
        const groupCompleted = required.filter((d) => d.isCompleted).length

        return (
          <div
            key={group.category}
            className="bg-white rounded-xl border border-brand-primary/10 shadow-sm overflow-hidden"
          >
            <div className="bg-brand-primary/[0.02] px-5 py-3 border-b border-brand-primary/5 flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-primary/50 shrink-0" />
              <h4 className="font-semibold text-brand-primary text-sm">{group.category}</h4>
              <span className="ml-auto text-xs font-medium text-brand-primary/50 shrink-0">
                {required.length === 0 ? 'Não se aplica' : `${groupCompleted}/${required.length}`}
              </span>
            </div>
            <div className="divide-y divide-brand-primary/5">
              {group.docs.map(({ doc, check, isCompleted, exclusion }) => {
                const userName = check?.expand?.user?.name || check?.expand?.user?.email
                const isToggling = togglingKey === doc.key

                return (
                  <div
                    key={doc.key}
                    className={cn(
                      'p-5 transition-colors hover:bg-brand-primary/[0.01]',
                      isCompleted && !exclusion && 'bg-emerald-50/30',
                      exclusion && 'bg-slate-50/60',
                    )}
                  >
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">
                          {exclusion ? (
                            <Ban className="w-5 h-5 text-slate-400" />
                          ) : isCompleted ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          ) : (
                            <FileText className="w-5 h-5 text-amber-500" />
                          )}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={cn(
                                'text-sm font-semibold',
                                exclusion
                                  ? 'text-brand-primary/40 line-through'
                                  : isCompleted
                                    ? 'text-brand-primary/60'
                                    : 'text-brand-primary',
                              )}
                            >
                              {doc.label}
                            </span>
                            <DocumentInfo label={doc.label} description={doc.description} />
                          </div>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
                            <span
                              className={cn(
                                'text-[11px] font-semibold px-2 py-0.5 rounded-full',
                                exclusion
                                  ? 'bg-slate-200 text-slate-600'
                                  : isCompleted
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-amber-100 text-amber-700',
                              )}
                            >
                              {exclusion === 'owner-type'
                                ? `Não se aplica · ${OWNER_TYPE_LABEL[ownerType === 'pf' ? 'pf' : 'pj']}`
                                : exclusion === 'manual'
                                  ? 'Dispensado'
                                  : isCompleted
                                    ? 'Enviado'
                                    : 'Pendente'}
                            </span>
                            {isCompleted && userName && (
                              <span className="text-[11px] text-brand-primary/50">
                                por {userName}
                              </span>
                            )}
                            {isCompleted && check?.updated && (
                              <span className="text-[11px] text-brand-primary/40">
                                em {format(new Date(check.updated), 'dd/MM/yyyy')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
                        {isCompleted && !exclusion && check?.id && (
                          <DocumentFileActions checkId={check.id} documentLabel={doc.label} />
                        )}
                        {/* A dispensa por tipo de proprietário é automática, então
                            ali o botão só confundiria: mudar isso é no seletor de
                            PF/PJ, não documento a documento. */}
                        {exclusion !== 'owner-type' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isToggling}
                            onClick={() =>
                              handleToggleNotApplicable(doc.key, exclusion !== 'manual')
                            }
                            className={cn(
                              'h-9 shrink-0 text-xs font-semibold',
                              exclusion === 'manual'
                                ? 'text-brand-primary/60 hover:text-brand-primary'
                                : 'text-brand-primary/40 hover:text-brand-primary',
                            )}
                          >
                            {isToggling ? (
                              <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                            ) : exclusion === 'manual' ? (
                              <Undo2 className="w-3.5 h-3.5 mr-1" />
                            ) : (
                              <Ban className="w-3.5 h-3.5 mr-1" />
                            )}
                            {exclusion === 'manual' ? 'Voltar a exigir' : 'Não se aplica'}
                          </Button>
                        )}
                        <input
                          ref={(el) => {
                            fileInputRefs.current[doc.key] = el
                          }}
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleFileUpload(doc.key, file)
                            e.target.value = ''
                          }}
                        />
                        <Button
                          variant={isCompleted || exclusion ? 'outline' : 'default'}
                          size="sm"
                          disabled={uploadingKey === doc.key}
                          onClick={() => fileInputRefs.current[doc.key]?.click()}
                          className={cn(
                            'h-9 shrink-0',
                            isCompleted || exclusion
                              ? 'border-brand-primary/20 text-brand-primary hover:bg-brand-primary/5'
                              : 'bg-brand-secondary hover:bg-brand-secondary/90 text-white',
                          )}
                        >
                          {uploadingKey === doc.key ? (
                            <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                          ) : isCompleted ? (
                            <RefreshCw className="w-3.5 h-3.5 mr-1" />
                          ) : (
                            <Upload className="w-3.5 h-3.5 mr-1" />
                          )}
                          {isCompleted ? 'Substituir' : 'Enviar'}
                        </Button>
                      </div>
                    </div>
                    {errors[doc.key] && (
                      <p className="text-xs text-brand-critical mt-2 md:ml-8">{errors[doc.key]}</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
