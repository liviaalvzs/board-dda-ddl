import { useEffect, useState } from 'react'
import { FlaskConical, Loader2, Sparkles, FileText, Eye } from 'lucide-react'
import { CompactLandSearch } from '@/components/document-upload/CompactLandSearch'
import {
  getDocumentChecksForLand,
  getDocumentFileUrl,
  getDocumentLabel,
} from '@/services/document-upload'
import { analyzeDocumentWithAi, type AnalyzeDocumentResult } from '@/services/document-ai-test'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'

/**
 * Página isolada de teste: manda o arquivo (imagem/PDF) de um document_checks
 * direto pro backend de IA e mostra a análise. Não faz parte do fluxo normal
 * de documentos — existe só para validar a rota /backend/v1/test/analyze-document.
 */
export default function TestAiDocumentAnalysis() {
  const [selectedLand, setSelectedLand] = useState<any>(null)
  const [checks, setChecks] = useState<any[]>([])
  const [loadingChecks, setLoadingChecks] = useState(false)
  const [analyzingId, setAnalyzingId] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, AnalyzeDocumentResult>>({})
  const { toast } = useToast()

  useEffect(() => {
    if (!selectedLand) {
      setChecks([])
      return
    }
    setLoadingChecks(true)
    getDocumentChecksForLand(selectedLand.external_id)
      .then((records) => setChecks(records.filter((r: any) => !!r.document_url)))
      .catch(() => setChecks([]))
      .finally(() => setLoadingChecks(false))
  }, [selectedLand])

  const handleAnalyze = async (checkId: string) => {
    setAnalyzingId(checkId)
    try {
      const result = await analyzeDocumentWithAi(checkId)
      setResults((prev) => ({ ...prev, [checkId]: result }))
    } catch (err) {
      toast({ title: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setAnalyzingId(null)
    }
  }

  const handleView = async (checkId: string) => {
    try {
      const url = await getDocumentFileUrl(checkId, 'inline')
      window.open(url, '_blank')
    } catch (err) {
      toast({ title: getErrorMessage(err), variant: 'destructive' })
    }
  }

  return (
    <div className="flex-1 overflow-auto bg-gray-50 p-4 md:p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <div>
          <h1 className="text-xl font-bold text-brand-primary flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-brand-secondary" />
            Teste — Análise de documento com IA
          </h1>
          <p className="text-sm text-brand-primary/60 mt-1">
            Página isolada para testar a rota de IA. Selecione uma terra, escolha um documento já
            enviado e peça a análise.
          </p>
        </div>

        <CompactLandSearch
          onSelect={setSelectedLand}
          selectedLand={selectedLand}
          onClear={() => setSelectedLand(null)}
        />

        {selectedLand && (
          <div className="bg-white rounded-xl border border-brand-primary/10 shadow-sm overflow-hidden">
            {loadingChecks ? (
              <div className="p-6 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-brand-secondary" />
              </div>
            ) : checks.length === 0 ? (
              <div className="p-6 text-center text-sm text-brand-primary/50">
                Nenhum documento enviado para esta terra.
              </div>
            ) : (
              <div className="divide-y divide-brand-primary/5">
                {checks.map((check) => {
                  const result = results[check.id]
                  const isAnalyzing = analyzingId === check.id
                  return (
                    <div key={check.id} className="p-4 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-brand-secondary shrink-0" />
                          <span className="text-sm font-semibold text-brand-primary truncate">
                            {getDocumentLabel(check.document_key)}
                          </span>
                          <span className="text-[11px] text-brand-primary/40 shrink-0">
                            {check.file_ext || ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleView(check.id)}
                          >
                            <Eye className="w-3.5 h-3.5 mr-1.5" />
                            Ver
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            disabled={isAnalyzing}
                            onClick={() => handleAnalyze(check.id)}
                            className="bg-brand-secondary hover:bg-brand-secondary/90"
                          >
                            {isAnalyzing ? (
                              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                            ) : (
                              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                            )}
                            Analisar com IA
                          </Button>
                        </div>
                      </div>

                      {result && (
                        <div className="bg-brand-primary/[0.03] border border-brand-primary/10 rounded-lg p-3 space-y-1.5">
                          <div className="flex flex-wrap gap-2 text-[11px] text-brand-primary/50">
                            <span>Tipo esperado: {result.document_type}</span>
                            <span>·</span>
                            <span>MIME: {result.mime_type}</span>
                          </div>
                          <p className="text-sm text-brand-primary whitespace-pre-wrap">
                            {result.analysis}
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
