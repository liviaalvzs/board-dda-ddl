import { useState, useEffect, useRef, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Eye, Download, CheckCircle2, FileText, Upload, Loader2, AlertCircle } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { getDocumentTypes, type DocumentType } from '@/services/app-settings'
import { uploadDocumentToS3 } from '@/services/s3-upload'
import { DocumentInfo } from '@/components/document-upload/DocumentInfo'
import { DeleteDocumentButton } from '@/components/document-upload/DeleteDocumentButton'

const MAX_SIZE = 10 * 1024 * 1024
const ALLOWED_MIMES = ['application/pdf', 'image/jpeg', 'image/png']

export function DocumentChecklist({ landId, metadata }: { landId: string; metadata: any }) {
  const [checks, setChecks] = useState<Record<string, any>>({})
  const [docTypes, setDocTypes] = useState<DocumentType[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadingKey, setUploadingKey] = useState<string | null>(null)
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
    getDocumentTypes()
      .then((types) => setDocTypes(types.filter((t) => !t.key.toLowerCase().includes('dda'))))
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

  // O status vem do envio do arquivo, não de marcação manual: um documento só
  // conta como concluído quando existe arquivo associado. Mesma regra da aba
  // Documentos, para os dois lugares nunca divergirem.
  const docsWithStatus = useMemo(() => {
    return docTypes.map((doc) => {
      const check = checks[doc.key]
      const fileName = check?.document_file
        ? Array.isArray(check.document_file)
          ? check.document_file[0]
          : check.document_file
        : null
      const isCompleted = !!(check?.is_completed && (check?.document_url || fileName))
      return { doc, check, fileName, isCompleted }
    })
  }, [docTypes, checks])

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

  const totalItems = docTypes.length
  const completedCount = docsWithStatus.filter((d) => d.isCompleted).length
  const progressPercent = totalItems > 0 ? (completedCount / totalItems) * 100 : 0

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
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-4">
          <div>
            <h3 className="text-xl font-display text-brand-primary flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-brand-secondary" /> Progresso da Due Diligence
            </h3>
            <p className="text-sm font-medium text-brand-primary/60 mt-1">
              {completedCount} de {totalItems} documentos validados
            </p>
          </div>
          <span className="text-3xl font-bold text-brand-secondary leading-none">
            {Math.round(progressPercent)}%
          </span>
        </div>
        <Progress
          value={progressPercent}
          className="h-3 bg-brand-primary/5"
          indicatorClassName="bg-brand-secondary transition-all duration-500 ease-in-out"
        />
      </div>

      {groupedDocs.map((group) => {
        const groupCompleted = group.docs.filter((d) => d.isCompleted).length

        return (
          <div
            key={group.category}
            className="bg-white rounded-xl border border-brand-primary/10 shadow-sm overflow-hidden"
          >
            <div className="bg-brand-primary/[0.02] px-5 py-3 border-b border-brand-primary/5 flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-primary/50 shrink-0" />
              <h4 className="font-semibold text-brand-primary text-sm">{group.category}</h4>
              <span className="ml-auto text-xs font-medium text-brand-primary/50 shrink-0">
                {groupCompleted}/{group.docs.length}
              </span>
            </div>
            <div className="divide-y divide-brand-primary/5">
              {group.docs.map(({ doc, check, fileName, isCompleted }) => {
                const userName = check?.expand?.user?.name || check?.expand?.user?.email
                // Servimos sempre a cópia do PocketBase: o document_url aponta
                // para o bucket privado do data lake e não abre no navegador.
                const viewUrl = fileName ? pb.files.getURL(check, fileName) : null
                const downloadUrl = fileName
                  ? pb.files.getURL(check, fileName, { download: true })
                  : null

                return (
                  <div
                    key={doc.key}
                    className={cn(
                      'p-5 transition-colors hover:bg-brand-primary/[0.01]',
                      isCompleted && 'bg-emerald-50/30',
                    )}
                  >
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">
                          {isCompleted ? (
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
                                isCompleted ? 'text-brand-primary/60' : 'text-brand-primary',
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
                                isCompleted
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-amber-100 text-amber-700',
                              )}
                            >
                              {isCompleted ? 'Enviado' : 'Pendente'}
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
                        {viewUrl && downloadUrl && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                              className="h-9 shrink-0 border-brand-primary/20 text-brand-primary hover:bg-brand-primary/5"
                            >
                              <a href={viewUrl} target="_blank" rel="noopener noreferrer">
                                <Eye className="w-3.5 h-3.5 mr-1.5" />
                                Visualizar
                              </a>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                              className="h-9 shrink-0 border-brand-primary/20 text-brand-primary hover:bg-brand-primary/5"
                            >
                              <a href={downloadUrl}>
                                <Download className="w-3.5 h-3.5 mr-1.5" />
                                Baixar
                              </a>
                            </Button>
                            {check?.id && (
                              <DeleteDocumentButton
                                checkId={check.id}
                                documentLabel={doc.label}
                                onDeleted={fetchChecks}
                              />
                            )}
                          </>
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
                        {!isCompleted && (
                          <Button
                            variant="default"
                            size="sm"
                            disabled={uploadingKey === doc.key}
                            onClick={() => fileInputRefs.current[doc.key]?.click()}
                            className="bg-brand-secondary hover:bg-brand-secondary/90 text-white h-9 shrink-0"
                          >
                            {uploadingKey === doc.key ? (
                              <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                            ) : (
                              <Upload className="w-3.5 h-3.5 mr-1" />
                            )}
                            Enviar
                          </Button>
                        )}
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
