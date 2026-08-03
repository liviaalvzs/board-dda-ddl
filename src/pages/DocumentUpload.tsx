import { useState, useEffect, useMemo } from 'react'
import { FileText, Loader2, Info, Upload } from 'lucide-react'
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
import { getDocumentTypes, type DocumentType } from '@/services/app-settings'
import { useRealtime } from '@/hooks/use-realtime'

export default function DocumentUpload() {
  const [selectedLand, setSelectedLand] = useState<any>(null)
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([])
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
      const map: Record<string, any> = {}
      for (const r of sorted) {
        if (!map[r.document_key]) map[r.document_key] = r
      }
      setChecks(map)
    } catch {
      setChecks({})
      setHistory([])
    }
  }

  useEffect(() => {
    setChecks({})
    setHistory([])
    if (selectedLand) fetchChecks()
  }, [selectedLand])

  useRealtime('document_checks', (e) => {
    if (selectedLand && e.record.land_id === selectedLand.external_id) fetchChecks()
  })

  const docsWithStatus = useMemo(() => {
    return documentTypes.map((doc) => {
      const check = checks[doc.key]
      const fileName = check?.document_file
        ? Array.isArray(check.document_file)
          ? check.document_file[0]
          : check.document_file
        : null
      const isCompleted = check?.is_completed && !!(check?.document_url || fileName)
      return { doc, check, isCompleted }
    })
  }, [documentTypes, checks])

  const searchLower = searchQuery.toLowerCase()

  const filteredDocs = useMemo(() => {
    return docsWithStatus.filter(({ doc, isCompleted }) => {
      const matchesSearch = doc.label.toLowerCase().includes(searchLower)
      const matchesFilter =
        activeFilter === 'all' ||
        (activeFilter === 'pending' && !isCompleted) ||
        (activeFilter === 'uploaded' && isCompleted)
      return matchesSearch && matchesFilter
    })
  }, [docsWithStatus, searchLower, activeFilter])

  // As categorias vêm dos Anexos I e II da Carta Proposta. A ordem de exibição
  // segue o sort_order dos tipos de documento, então basta respeitar a ordem em
  // que cada categoria aparece na lista já ordenada.
  const groupedDocs = useMemo(() => {
    const groups: { category: string; docs: typeof filteredDocs }[] = []
    for (const item of filteredDocs) {
      const category = item.doc.category || 'Outros documentos'
      let group = groups.find((g) => g.category === category)
      if (!group) {
        group = { category, docs: [] }
        groups.push(group)
      }
      group.docs.push(item)
    }
    return groups
  }, [filteredDocs])

  const counts = useMemo(() => {
    const matching = docsWithStatus.filter(({ doc }) =>
      doc.label.toLowerCase().includes(searchLower),
    )
    return {
      all: matching.length,
      pending: matching.filter((d) => !d.isCompleted).length,
      uploaded: matching.filter((d) => d.isCompleted).length,
    }
  }, [docsWithStatus, searchLower])

  const completedCount = docsWithStatus.filter((d) => d.isCompleted).length
  const totalCount = documentTypes.length
  const pendingCount = totalCount - completedCount
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0
  const pendingDocs = docsWithStatus.filter((d) => !d.isCompleted).map((d) => d.doc)

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-brand-background">
        <Loader2 className="w-8 h-8 animate-spin text-brand-secondary" />
      </div>
    )
  }

  const renderGroup = (title: string, docs: typeof filteredDocs) => {
    if (docs.length === 0) return null
    const groupCompleted = docs.filter((d) => d.isCompleted).length
    return (
      <div
        key={title}
        className="bg-white rounded-xl border border-brand-primary/10 shadow-sm overflow-hidden"
      >
        <div className="px-4 py-2.5 bg-brand-primary/[0.02] border-b border-brand-primary/5 flex items-center gap-2">
          <h3 className="text-sm font-semibold text-brand-primary">{title}</h3>
          <span className="ml-auto text-xs font-medium text-brand-primary/50 shrink-0">
            {groupCompleted}/{docs.length}
          </span>
        </div>
        <div className="divide-y divide-brand-primary/5">
          {docs.map(({ doc, check }) => (
            <DocumentRow
              key={doc.key}
              landId={selectedLand.external_id}
              documentKey={doc.key}
              documentLabel={doc.label}
              documentDescription={doc.description}
              check={check}
              onUploaded={fetchChecks}
              clusterSerial={selectedLand.cluster_serial || ''}
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

              {groupedDocs.map((group) => renderGroup(group.category, group.docs))}

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
                pendingDocs={pendingDocs}
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
