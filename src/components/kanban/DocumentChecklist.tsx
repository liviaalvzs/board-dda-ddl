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
  User,
  FileStack,
} from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { getDocumentTypes, type DocumentType } from '@/services/app-settings'
import { uploadDocumentToS3 } from '@/services/s3-upload'
import { setDocumentNotApplicable } from '@/services/documents'
import { ensureMinimumSubjects } from '@/services/land-subjects'
import { DocumentInfo } from '@/components/document-upload/DocumentInfo'
import { DocumentFileActions } from '@/components/document-upload/DocumentFileActions'
import { SubjectsToolbar } from '@/components/document-upload/SubjectsToolbar'
import {
  DOCUMENT_GROUP_IDS,
  DOCUMENT_GROUP_LABEL,
  computeDocumentProgress,
  getExclusionLabel,
  getExclusionReason,
  getSubjectKindForCategory,
  instanceKey,
  progressPercent,
  subjectsOfKind,
  type LandSubject,
  type OwnerType,
} from '@/lib/document-groups'

const MAX_SIZE = 10 * 1024 * 1024
const ALLOWED_MIMES = ['application/pdf', 'image/jpeg', 'image/png']

export function DocumentChecklist({ landId, metadata }: { landId: string; metadata: any }) {
  const [checks, setChecks] = useState<Record<string, any>>({})
  const [docTypes, setDocTypes] = useState<DocumentType[]>([])
  const [subjects, setSubjects] = useState<LandSubject[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadingKey, setUploadingKey] = useState<string | null>(null)
  const [togglingKey, setTogglingKey] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const { toast } = useToast()

  // Indexado por instância (tipo + sujeito), não por tipo: o mesmo documento
  // existe uma vez para cada proprietário ou matrícula.
  const fetchChecks = async () => {
    try {
      const records = await pb
        .collection('document_checks')
        .getFullList({ filter: `land_id="${landId}"`, expand: 'user' })
      const map: Record<string, any> = {}
      records.forEach((r) => {
        const key = instanceKey(r.document_key, r.subject_id || '')
        if (!map[key]) map[key] = r
      })
      setChecks(map)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // Garante o mínimo de um proprietário e uma matrícula ao abrir: toda terra
  // tem os dois, então eles passam a existir de fato em vez de ficarem no
  // implícito.
  const fetchSubjects = async () => {
    try {
      setSubjects(await ensureMinimumSubjects(landId, (metadata?.owner_type || '') as OwnerType))
    } catch {
      setSubjects([])
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
    fetchSubjects()
  }, [landId])

  useRealtime('document_checks', (e) => {
    if (e.record.land_id === landId) fetchChecks()
  })

  useRealtime('land_subjects', (e) => {
    if (e.record.land_id === landId) fetchSubjects()
  })

  const fallbackOwnerType = (metadata?.owner_type || '') as OwnerType

  const handleFileUpload = async (key: string, subjectId: string, file: File) => {
    const uiKey = instanceKey(key, subjectId)
    setErrors((prev) => ({ ...prev, [uiKey]: '' }))
    const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
    if (!ALLOWED_MIMES.includes(file.type) && !['.pdf', '.jpg', '.jpeg', '.png'].includes(ext)) {
      setErrors((prev) => ({ ...prev, [uiKey]: 'Formato não permitido. Aceitos: PDF, JPG, PNG.' }))
      return
    }
    if (file.size > MAX_SIZE) {
      setErrors((prev) => ({ ...prev, [uiKey]: 'O arquivo excede o tamanho máximo de 10 MB.' }))
      return
    }
    setUploadingKey(uiKey)
    try {
      const clusterSerial = metadata?.cluster_serial || ''
      if (!clusterSerial) {
        setErrors((prev) => ({
          ...prev,
          [uiKey]: 'Cluster serial não definido para esta terra.',
        }))
        return
      }
      await uploadDocumentToS3(landId, clusterSerial, key, file, undefined, subjectId)
      toast({ title: 'Documento enviado com sucesso!' })
      fetchChecks()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao enviar arquivo. Tente novamente.'
      setErrors((prev) => ({ ...prev, [uiKey]: msg }))
    } finally {
      setUploadingKey(null)
    }
  }

  const handleToggleNotApplicable = async (key: string, subjectId: string, next: boolean) => {
    const uiKey = instanceKey(key, subjectId)
    setTogglingKey(uiKey)
    try {
      await setDocumentNotApplicable(landId, key, next, subjectId)
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

  /**
   * Um bloco por sujeito: a categoria se repete para cada proprietário ou
   * matrícula, com o nome no cabeçalho e contador próprio. Responde direto a
   * "o que falta do proprietário B?", que é a pergunta real de quem cobra.
   */
  const blocks = useMemo(() => {
    const result: {
      id: string
      category: string
      subject: LandSubject
      docs: {
        doc: DocumentType
        check: any
        isCompleted: boolean
        exclusion: ReturnType<typeof getExclusionReason>
      }[]
    }[] = []

    for (const doc of docTypes) {
      const category = doc.category || 'Outros documentos'
      const kind = getSubjectKindForCategory(doc.category)

      for (const subject of subjectsOfKind(subjects, kind, fallbackOwnerType)) {
        const key = instanceKey(doc.key, subject.id)
        const check = checks[key]
        const isCompleted = !!(check?.is_completed && check?.document_url)
        const ownerType = (subject.owner_type || fallbackOwnerType) as OwnerType
        const exclusion = getExclusionReason(doc.category, ownerType, !!check?.not_applicable)

        const blockId = `${category}::${subject.id}`
        let block = result.find((b) => b.id === blockId)
        if (!block) {
          block = { id: blockId, category, subject, docs: [] }
          result.push(block)
        }
        block.docs.push({ doc, check, isCompleted, exclusion })
      }
    }

    // Dispensado desce dentro do bloco; bloco sem nada exigido vai para o fim.
    for (const block of result) {
      block.docs = [
        ...block.docs.filter((d) => !d.exclusion),
        ...block.docs.filter((d) => d.exclusion),
      ]
    }
    const isFullyExcluded = (b: (typeof result)[number]) => b.docs.every((d) => !!d.exclusion)
    return [...result.filter((b) => !isFullyExcluded(b)), ...result.filter(isFullyExcluded)]
  }, [docTypes, subjects, checks, fallbackOwnerType])

  // Básicos e certidões andam separados: um depende do proprietário entregar,
  // o outro de órgão emitir. Um número só não dizia qual dos dois estava preso.
  //
  // O cálculo é o mesmo que o card do board usa, para os dois não divergirem.
  const groupProgress = useMemo(() => {
    const completedKeys = new Set<string>()
    const notApplicableKeys = new Set<string>()
    for (const [key, check] of Object.entries(checks)) {
      if (check?.is_completed && check?.document_url) completedKeys.add(key)
      if (check?.not_applicable) notApplicableKeys.add(key)
    }
    return computeDocumentProgress(
      docTypes,
      subjects,
      fallbackOwnerType,
      completedKeys,
      notApplicableKeys,
    )
  }, [checks, docTypes, subjects, fallbackOwnerType])

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
      <SubjectsToolbar
        landId={landId}
        subjects={subjects}
        fallbackOwnerType={fallbackOwnerType}
        onChanged={fetchSubjects}
      />

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

      {blocks.map((block) => {
        const required = block.docs.filter((d) => !d.exclusion)
        const blockCompleted = required.filter((d) => d.isCompleted).length
        const SubjectIcon = block.subject.kind === 'owner' ? User : FileStack

        return (
          <div
            key={block.id}
            className="bg-white rounded-xl border border-brand-primary/10 shadow-sm overflow-hidden"
          >
            <div className="bg-brand-primary/[0.02] px-5 py-3 border-b border-brand-primary/5 flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-primary/50 shrink-0" />
              <h4 className="font-semibold text-brand-primary text-sm">{block.category}</h4>
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-primary/5 px-2 py-0.5 text-[11px] font-semibold text-brand-primary/60">
                <SubjectIcon className="h-3 w-3" />
                {block.subject.label}
              </span>
              <span className="ml-auto text-xs font-medium text-brand-primary/50 shrink-0">
                {required.length === 0 ? 'Não se aplica' : `${blockCompleted}/${required.length}`}
              </span>
            </div>
            <div className="divide-y divide-brand-primary/5">
              {block.docs.map(({ doc, check, isCompleted, exclusion }) => {
                const uiKey = instanceKey(doc.key, block.subject.id)
                const userName = check?.expand?.user?.name || check?.expand?.user?.email
                const isToggling = togglingKey === uiKey
                const ownerType = (block.subject.owner_type || fallbackOwnerType) as OwnerType

                // Dispensar só vale para campo vazio: com arquivo enviado, a
                // saída é remover o documento, não escondê-lo da conta. A opção
                // de desfazer continua disponível para não prender um registro
                // marcado antes desta regra.
                const canToggle = exclusion === 'manual' || (!exclusion && !isCompleted)

                return (
                  <div
                    key={uiKey}
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
                              {getExclusionLabel(exclusion, ownerType) ??
                                (isCompleted ? 'Enviado' : 'Pendente')}
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
                        {isCompleted && check?.id && (
                          <DocumentFileActions checkId={check.id} documentLabel={doc.label} />
                        )}
                        {/* Escondido quando já há arquivo (dispensar deixaria de
                            fazer sentido) e quando a dispensa vem do tipo de
                            proprietário — nesse caso a mudança é no cadastro do
                            proprietário, não documento a documento. */}
                        {canToggle && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isToggling}
                            onClick={() =>
                              handleToggleNotApplicable(
                                doc.key,
                                block.subject.id,
                                exclusion !== 'manual',
                              )
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
                            fileInputRefs.current[uiKey] = el
                          }}
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleFileUpload(doc.key, block.subject.id, file)
                            e.target.value = ''
                          }}
                        />
                        {/* Documento dispensado não aceita envio: o botão sai de
                            cena em vez de ficar desabilitado, senão a linha fica
                            oferecendo uma ação morta. */}
                        {!exclusion && (
                          <Button
                            variant={isCompleted ? 'outline' : 'default'}
                            size="sm"
                            disabled={uploadingKey === uiKey}
                            onClick={() => fileInputRefs.current[uiKey]?.click()}
                            className={cn(
                              'h-9 shrink-0',
                              isCompleted
                                ? 'border-brand-primary/20 text-brand-primary hover:bg-brand-primary/5'
                                : 'bg-brand-secondary hover:bg-brand-secondary/90 text-white',
                            )}
                          >
                            {uploadingKey === uiKey ? (
                              <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                            ) : isCompleted ? (
                              <RefreshCw className="w-3.5 h-3.5 mr-1" />
                            ) : (
                              <Upload className="w-3.5 h-3.5 mr-1" />
                            )}
                            {isCompleted ? 'Substituir' : 'Enviar'}
                          </Button>
                        )}
                      </div>
                    </div>
                    {errors[uiKey] && (
                      <p className="text-xs text-brand-critical mt-2 md:ml-8">{errors[uiKey]}</p>
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
