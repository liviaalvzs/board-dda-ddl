import { useState, useEffect, useMemo } from 'react'
import { FileText, Loader2, Info, Upload, User, FileStack } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import { CompactLandSearch } from '@/components/document-upload/CompactLandSearch'
import { ProgressRing } from '@/components/document-upload/ProgressRing'
import { ExpandableSearch } from '@/components/document-upload/ExpandableSearch'
import { FilterTabs, type FilterType } from '@/components/document-upload/FilterTabs'
import { DocumentRow } from '@/components/document-upload/DocumentRow'
import { BulkUploadModal } from '@/components/document-upload/BulkUploadModal'
import { DocumentHistory } from '@/components/document-upload/DocumentHistory'
import { getDocumentChecksForLand } from '@/services/document-upload'
import { getLandSubjects } from '@/services/land-subjects'
import { getDocumentTypes, type DocumentType } from '@/services/app-settings'
import { useRealtime } from '@/hooks/use-realtime'
import {
  getExclusionLabel,
  getExclusionReason,
  getSubjectKindForCategory,
  instanceKey,
  subjectsOfKind,
  type LandSubject,
  type OwnerType,
} from '@/lib/document-groups'

export default function DocumentUpload() {
  const [selectedLand, setSelectedLand] = useState<any>(null)
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([])
  const [subjects, setSubjects] = useState<LandSubject[]>([])
  const [checks, setChecks] = useState<Record<string, any>>({})
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [bulkOpen, setBulkOpen] = useState(false)

  useEffect(() => {
    getDocumentTypes()
      .then(setDocumentTypes)
      .catch(() => setDocumentTypes([]))
      .finally(() => setLoading(false))
  }, [])

  const fetchChecks = async () => {
    if (!selectedLand) return
    try {
      const records = await getDocumentChecksForLand(selectedLand.external_id)
      const sorted = [...records].sort(
        (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime(),
      )
      setHistory(sorted)
      // Indexado por instância: o mesmo tipo existe uma vez por proprietário ou
      // matrícula, então só o par tipo+sujeito identifica o registro.
      const map: Record<string, any> = {}
      for (const r of sorted) {
        const key = instanceKey(r.document_key, r.subject_id || '')
        if (!map[key]) map[key] = r
      }
      setChecks(map)
    } catch {
      setChecks({})
      setHistory([])
    }
  }

  const fetchSubjects = async () => {
    if (!selectedLand) return
    try {
      setSubjects(await getLandSubjects(selectedLand.external_id))
    } catch {
      setSubjects([])
    }
  }

  useEffect(() => {
    setChecks({})
    setHistory([])
    setSubjects([])
    if (selectedLand) {
      fetchChecks()
      fetchSubjects()
    }
  }, [selectedLand])

  useRealtime('document_checks', (e) => {
    if (selectedLand && e.record.land_id === selectedLand.external_id) fetchChecks()
  })

  useRealtime('land_subjects', (e) => {
    if (selectedLand && e.record.land_id === selectedLand.external_id) fetchSubjects()
  })

  // A terra selecionada é o registro de land_metadata, então o tipo de
  // proprietário vem junto e serve de padrão para quem não tem marcação própria.
  const fallbackOwnerType = (selectedLand?.owner_type || '') as OwnerType

  /** Uma entrada por tipo de documento × sujeito do escopo daquele tipo. */
  const instances = useMemo(() => {
    const result: {
      doc: DocumentType
      subject: LandSubject
      check: any
      isCompleted: boolean
      exclusion: ReturnType<typeof getExclusionReason>
    }[] = []

    for (const doc of documentTypes) {
      const kind = getSubjectKindForCategory(doc.category)
      for (const subject of subjectsOfKind(subjects, kind, fallbackOwnerType)) {
        const check = checks[instanceKey(doc.key, subject.id)]
        // Os arquivos vivem só no S3: a presença de document_url é o que define
        // um documento como enviado.
        const isCompleted = !!(check?.is_completed && check?.document_url)
        const ownerType = (subject.owner_type || fallbackOwnerType) as OwnerType
        const exclusion = getExclusionReason(doc.category, ownerType, !!check?.not_applicable)
        result.push({ doc, subject, check, isCompleted, exclusion })
      }
    }
    return result
  }, [documentTypes, subjects, checks, fallbackOwnerType])

  const searchLower = searchQuery.toLowerCase()

  const filteredInstances = useMemo(() => {
    return instances.filter(({ doc, isCompleted, exclusion }) => {
      const matchesSearch = doc.label.toLowerCase().includes(searchLower)
      // Dispensado não é "pendente": ninguém precisa entregá-lo.
      const matchesFilter =
        activeFilter === 'all' ||
        (activeFilter === 'pending' && !isCompleted && !exclusion) ||
        (activeFilter === 'uploaded' && isCompleted)
      return matchesSearch && matchesFilter
    })
  }, [instances, searchLower, activeFilter])

  /**
   * Um bloco por categoria × sujeito, com o nome do sujeito no cabeçalho. Mesma
   * divisão da aba Documentos da terra, para as duas telas se lerem igual.
   */
  const blocks = useMemo(() => {
    const result: {
      id: string
      category: string
      subject: LandSubject
      docs: typeof filteredInstances
    }[] = []

    for (const item of filteredInstances) {
      const category = item.doc.category || 'Outros documentos'
      const id = `${category}::${item.subject.id}`
      let block = result.find((b) => b.id === id)
      if (!block) {
        block = { id, category, subject: item.subject, docs: [] }
        result.push(block)
      }
      block.docs.push(item)
    }

    // O que não é exigido desce: para o fim do bloco, e o bloco inteiro para o
    // fim da página quando nada nele é exigido.
    for (const block of result) {
      block.docs = [
        ...block.docs.filter((d) => !d.exclusion),
        ...block.docs.filter((d) => d.exclusion),
      ]
    }
    const isFullyExcluded = (b: (typeof result)[number]) => b.docs.every((d) => !!d.exclusion)
    return [...result.filter((b) => !isFullyExcluded(b)), ...result.filter(isFullyExcluded)]
  }, [filteredInstances])

  const counts = useMemo(() => {
    const matching = instances.filter(({ doc }) => doc.label.toLowerCase().includes(searchLower))
    return {
      all: matching.length,
      pending: matching.filter((d) => !d.isCompleted && !d.exclusion).length,
      uploaded: matching.filter((d) => d.isCompleted).length,
    }
  }, [instances, searchLower])

  // O progresso conta só o que é exigido desta terra — dispensado sai do
  // numerador e do denominador, senão nunca chegaria a 100%.
  const required = instances.filter((d) => !d.exclusion)
  const completedCount = required.filter((d) => d.isCompleted).length
  const totalCount = required.length
  const pendingCount = totalCount - completedCount
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0
  const pendingInstances = required
    .filter((d) => !d.isCompleted)
    .map((d) => ({ doc: d.doc, subjectId: d.subject.id, subjectLabel: d.subject.label }))

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-brand-background">
        <Loader2 className="w-8 h-8 animate-spin text-brand-secondary" />
      </div>
    )
  }

  const renderBlock = (block: (typeof blocks)[number]) => {
    if (block.docs.length === 0) return null
    const blockRequired = block.docs.filter((d) => !d.exclusion)
    const blockCompleted = blockRequired.filter((d) => d.isCompleted).length
    const SubjectIcon = block.subject.kind === 'owner' ? User : FileStack

    return (
      <div
        key={block.id}
        className="bg-white rounded-xl border border-brand-primary/10 shadow-sm overflow-hidden"
      >
        <div className="px-4 py-2.5 bg-brand-primary/[0.02] border-b border-brand-primary/5 flex items-center gap-2">
          <h3 className="text-sm font-semibold text-brand-primary">{block.category}</h3>
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-primary/5 px-2 py-0.5 text-[11px] font-semibold text-brand-primary/60">
            <SubjectIcon className="h-3 w-3" />
            {block.subject.label}
          </span>
          <span className="ml-auto text-xs font-medium text-brand-primary/50 shrink-0">
            {blockRequired.length === 0
              ? 'Não se aplica'
              : `${blockCompleted}/${blockRequired.length}`}
          </span>
        </div>
        <div className="divide-y divide-brand-primary/5">
          {block.docs.map(({ doc, subject, check, exclusion }) => (
            <DocumentRow
              key={instanceKey(doc.key, subject.id)}
              landId={selectedLand.external_id}
              documentKey={doc.key}
              documentLabel={doc.label}
              documentDescription={doc.description}
              check={check}
              onUploaded={fetchChecks}
              clusterSerial={selectedLand.cluster_serial || ''}
              subjectId={subject.id}
              subjectLabel={subject.label}
              exclusionLabel={getExclusionLabel(
                exclusion,
                (subject.owner_type || fallbackOwnerType) as OwnerType,
              )}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto bg-gray-50 p-4 md:p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-brand-primary flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-secondary" />
            Documentos
          </h1>
          <ExpandableSearch value={searchQuery} onChange={setSearchQuery} />
        </div>

        <CompactLandSearch
          onSelect={setSelectedLand}
          selectedLand={selectedLand}
          onClear={() => setSelectedLand(null)}
        />

        {selectedLand ? (
          documentTypes.length > 0 ? (
            <>
              <div className="bg-white p-4 rounded-xl border border-brand-primary/10 shadow-sm flex items-center gap-4">
                <ProgressRing percent={progressPercent} />
                <div>
                  <p className="text-sm font-semibold text-brand-primary">
                    {completedCount} de {totalCount} documentos enviados
                  </p>
                  <p className="text-xs text-brand-primary/60">
                    {pendingCount} pendentes para concluir a etapa
                  </p>
                </div>
              </div>

              <FilterTabs active={activeFilter} onChange={setActiveFilter} counts={counts} />

              {blocks.map(renderBlock)}

              {pendingCount > 0 && (
                <Button
                  onClick={() => setBulkOpen(true)}
                  className="w-full min-h-[44px] bg-brand-secondary hover:bg-brand-secondary/90"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Enviar documentos pendentes ({pendingCount})
                </Button>
              )}

              <DocumentHistory records={history} />

              <BulkUploadModal
                open={bulkOpen}
                onClose={() => setBulkOpen(false)}
                pendingInstances={pendingInstances}
                landId={selectedLand.external_id}
                clusterSerial={selectedLand.cluster_serial || ''}
                onComplete={fetchChecks}
              />
            </>
          ) : (
            <div className="bg-white p-6 rounded-xl border border-dashed border-brand-primary/20 text-center">
              <Info className="w-8 h-8 text-brand-primary/30 mx-auto mb-2" />
              <p className="text-sm text-brand-primary/60 mb-3">
                Nenhum tipo de documento configurado.
              </p>
              <Button variant="outline" size="sm" asChild>
                <Link to="/settings">Ir para Configurações</Link>
              </Button>
            </div>
          )
        ) : (
          <div className="bg-white p-8 rounded-xl border border-dashed border-brand-primary/20 text-center">
            <FileText className="w-10 h-10 text-brand-primary/20 mx-auto mb-3" />
            <p className="text-sm text-brand-primary/50">
              Selecione uma terra para gerenciar seus documentos.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
