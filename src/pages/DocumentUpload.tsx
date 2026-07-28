import { useState, useEffect } from 'react'
import { FileText, Loader2, Info } from 'lucide-react'
import { LandSearch } from '@/components/document-upload/LandSearch'
import { DocumentItem } from '@/components/document-upload/DocumentItem'
import { DocumentHistory } from '@/components/document-upload/DocumentHistory'
import { getDocumentChecksForLand } from '@/services/document-upload'
import { getDocumentTypes, type DocumentType } from '@/services/app-settings'
import { useRealtime } from '@/hooks/use-realtime'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function DocumentUpload() {
  const [selectedLand, setSelectedLand] = useState<any>(null)
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([])
  const [checks, setChecks] = useState<Record<string, any>>({})
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

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
        if (!map[r.document_key]) {
          map[r.document_key] = r
        }
      }
      setChecks(map)
    } catch {
      setChecks({})
      setHistory([])
    }
  }

  useEffect(() => {
    if (selectedLand) {
      setChecks({})
      setHistory([])
      fetchChecks()
    }
  }, [selectedLand])

  useRealtime('document_checks', (e) => {
    if (selectedLand && e.record.land_id === selectedLand.external_id) {
      fetchChecks()
    }
  })

  useEffect(() => {
    if (!selectedLand) {
      setChecks({})
      setHistory([])
    }
  }, [selectedLand])

  const completedCount = documentTypes.filter((doc) => {
    const check = checks[doc.key]
    const fileName = check?.document_file
      ? Array.isArray(check.document_file)
        ? check.document_file[0]
        : check.document_file
      : null
    return check?.is_completed && !!(check?.document_url || fileName)
  }).length

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-brand-background">
        <Loader2 className="w-8 h-8 animate-spin text-brand-secondary" />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto bg-white p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-4 md:space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-primary flex items-center gap-2">
            <FileText className="w-6 h-6 text-brand-secondary" />
            Documentos
          </h1>
          <p className="text-sm text-brand-primary/60">
            Pesquise uma terra e gerencie os documentos necessários.
          </p>
        </div>

        <LandSearch
          onSelect={setSelectedLand}
          selectedLand={selectedLand}
          onClear={() => setSelectedLand(null)}
        />

        {selectedLand && (
          <div className="space-y-3 md:space-y-4">
            {documentTypes.length > 0 ? (
              <>
                <div className="bg-white p-4 rounded-xl border border-brand-primary/10 shadow-sm flex items-center justify-between">
                  <span className="text-sm font-semibold text-brand-primary">
                    Progresso dos Documentos
                  </span>
                  <span className="text-sm font-bold text-brand-secondary">
                    {completedCount} de {documentTypes.length}
                  </span>
                </div>
                {documentTypes.map((doc) => (
                  <DocumentItem
                    key={doc.key}
                    landId={selectedLand.external_id}
                    documentKey={doc.key}
                    documentLabel={doc.label}
                    check={checks[doc.key]}
                    onUploaded={fetchChecks}
                  />
                ))}
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
            )}
            <DocumentHistory records={history} />
          </div>
        )}

        {!selectedLand && (
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
