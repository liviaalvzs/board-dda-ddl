import pb from '@/lib/pocketbase/client'

export interface AnalyzeDocumentResult {
  check_id: string
  land_id: string
  document_key: string
  document_type: string
  file_ext: string
  mime_type: string
  analysis: string
}

/**
 * Chama a rota de TESTE que manda o arquivo (imagem/PDF) direto pro modelo de
 * IA, sem extrair texto antes. Ver pocketbase/hooks/test_ai_document_analysis.js.
 */
export async function analyzeDocumentWithAi(checkId: string): Promise<AnalyzeDocumentResult> {
  return pb.send('/backend/v1/test/analyze-document', {
    method: 'POST',
    body: JSON.stringify({ check_id: checkId }),
    headers: { 'Content-Type': 'application/json' },
  })
}
