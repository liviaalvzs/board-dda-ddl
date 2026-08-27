import { useState } from 'react'
import { Button } from '@/components/ui/button'
import pb from '@/lib/pocketbase/client'
import { toast } from 'sonner'
import { Loader2, Upload, CheckCircle, XCircle } from 'lucide-react'

export default function AdminTools() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    total: number
    uploaded: number
    failed: number
    results: { id: string; status: string; path?: string; detail?: string }[]
  } | null>(null)

  const handleReprocess = async () => {
    setLoading(true)
    setResult(null)
    try {
      const res = await pb.send('/backend/v1/reprocess-sharepoint', { method: 'GET' })
      setResult(res)
      if (res.uploaded > 0) {
        toast.success(`${res.uploaded} documentos enviados ao SharePoint`)
      }
      if (res.failed > 0) {
        toast.error(`${res.failed} documentos falharam`)
      }
    } catch (err) {
      toast.error('Erro ao reprocessar: ' + String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Ferramentas Admin</h1>

      <div className="rounded-lg border bg-card p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Reprocessar SharePoint</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Envia todos os documentos existentes para o SharePoint com nomes inteligentes baseados
            na análise da IA (ex: &quot;DOCUMENTO PESSOAL - João da Silva.pdf&quot;).
          </p>
        </div>

        <Button onClick={handleReprocess} disabled={loading} size="lg">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Enviar documentos ao SharePoint
            </>
          )}
        </Button>

        {result && (
          <div className="mt-4 space-y-3">
            <div className="flex gap-4 text-sm">
              <span className="font-medium">Total: {result.total}</span>
              <span className="text-green-600 font-medium flex items-center gap-1">
                <CheckCircle className="h-3.5 w-3.5" /> {result.uploaded} enviados
              </span>
              {result.failed > 0 && (
                <span className="text-red-600 font-medium flex items-center gap-1">
                  <XCircle className="h-3.5 w-3.5" /> {result.failed} falhas
                </span>
              )}
            </div>

            {result.results.length > 0 && (
              <div className="max-h-80 overflow-y-auto rounded border bg-muted/50 p-3 text-xs font-mono space-y-1">
                {result.results.map((r, i) => (
                  <div key={i} className={r.status === 'ok' ? 'text-green-700' : 'text-red-600'}>
                    {r.status === 'ok' ? '✓' : '✗'} {r.path || r.detail || r.id}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
