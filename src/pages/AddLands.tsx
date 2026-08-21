import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Plus, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { fetchFirstStageEntry, FIRST_STAGE_ID } from '@/services/land-stages'

interface ImportResult {
  serial: string
  status: 'success' | 'error' | 'exists'
  message: string
}

export default function AddLands() {
  const [input, setInput] = useState('')
  const [importing, setImporting] = useState(false)
  const [results, setResults] = useState<ImportResult[]>([])
  const { toast } = useToast()
  const navigate = useNavigate()

  const handleImport = async () => {
    const serials = input
      .split(/[\n,;]+/)
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean)

    if (serials.length === 0) {
      toast({ title: 'Informe ao menos um cluster serial.', variant: 'destructive' })
      return
    }

    setImporting(true)
    setResults([])
    const newResults: ImportResult[] = []

    const batchSize = 10
    for (let i = 0; i < serials.length; i += batchSize) {
      const batch = serials.slice(i, i + batchSize)

      try {
        const res = await pb.send(
          `/backend/v1/lands?clusterSerials=${encodeURIComponent(batch.join(','))}&limit=50&offset=0`,
          { method: 'GET' },
        )

        const items: any[] =
          res?.data?.items ?? res?.items ?? res?.data ?? (Array.isArray(res) ? res : [])

        const foundSerials = new Map<string, any>()
        for (const item of items) {
          const serial = (item.clusterSerial || '').toUpperCase()
          if (serial) foundSerials.set(serial, item)
        }

        for (const serial of batch) {
          const item = foundSerials.get(serial)
          if (!item) {
            newResults.push({
              serial,
              status: 'error',
              message: 'Cluster serial nao encontrado na API',
            })
            continue
          }

          try {
            const existing = await pb
              .collection('land_metadata')
              .getFirstListItem(`external_id="${item.id}"`)
            if (existing) {
              newResults.push({ serial, status: 'exists', message: 'Ja existe no board' })
              continue
            }
          } catch {
            // not found, proceed to create
          }

          try {
            const entry = await fetchFirstStageEntry(item.id).catch(() => null)
            await pb.collection('land_metadata').create({
              external_id: item.id,
              status: 'triagem-documentos-basicos',
              cluster_serial: item.clusterSerial || '',
              area_ha: typeof item.area === 'number' ? item.area : 0,
              name: item.name || '',
              city: item.city || item.geomCityName || '',
              state: item.geomAcronymState || item.state || '',
              stage_dates: entry ? { [FIRST_STAGE_ID]: entry } : {},
            })
            newResults.push({
              serial,
              status: 'success',
              message: `${item.name || serial} importada`,
            })
          } catch (err) {
            newResults.push({ serial, status: 'error', message: `Erro ao criar: ${String(err)}` })
          }
        }
      } catch (err) {
        for (const serial of batch) {
          newResults.push({ serial, status: 'error', message: `Erro na busca: ${String(err)}` })
        }
      }

      setResults([...newResults])
    }

    setImporting(false)

    const successCount = newResults.filter((r) => r.status === 'success').length
    if (successCount > 0) {
      toast({
        title: `${successCount} ${successCount === 1 ? 'terra importada' : 'terras importadas'} com sucesso!`,
      })
    }
  }

  const successCount = results.filter((r) => r.status === 'success').length
  const errorCount = results.filter((r) => r.status === 'error').length
  const existsCount = results.filter((r) => r.status === 'exists').length

  return (
    <div className="flex-1 overflow-auto bg-gray-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="text-brand-primary/70 hover:text-brand-primary"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao Board
        </Button>

        <Card className="border-brand-primary/10 shadow-sm">
          <CardHeader>
            <CardTitle className="text-brand-primary flex items-center gap-2">
              <Plus className="w-5 h-5 text-brand-secondary" />
              Adicionar Terras
            </CardTitle>
            <CardDescription>
              Insira os cluster serials das terras que deseja importar para o board. Um por linha,
              ou separados por virgula.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder={'VAL_0179\nCAM_0027\nREC_0042'}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="min-h-[160px] font-mono text-sm bg-white"
              disabled={importing}
            />
            <div className="flex justify-between items-center">
              <span className="text-xs text-brand-primary/50">
                {input.split(/[\n,;]+/).filter((s) => s.trim()).length} serial(is)
              </span>
              <Button
                onClick={handleImport}
                disabled={importing || !input.trim()}
                className="bg-brand-secondary hover:bg-brand-secondary/90"
              >
                {importing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importando...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" /> Importar
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {results.length > 0 && (
          <Card className="border-brand-primary/10 shadow-sm">
            <CardHeader>
              <CardTitle className="text-brand-primary text-lg">Resultado</CardTitle>
              <div className="flex gap-2 pt-1">
                {successCount > 0 && (
                  <Badge className="bg-emerald-100 text-emerald-700 border-none">
                    {successCount} importada{successCount > 1 ? 's' : ''}
                  </Badge>
                )}
                {existsCount > 0 && (
                  <Badge className="bg-amber-100 text-amber-700 border-none">
                    {existsCount} ja existente{existsCount > 1 ? 's' : ''}
                  </Badge>
                )}
                {errorCount > 0 && (
                  <Badge className="bg-rose-100 text-rose-700 border-none">
                    {errorCount} erro{errorCount > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {results.map((r, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-3 p-2.5 rounded-lg text-sm ${
                      r.status === 'success'
                        ? 'bg-emerald-50 text-emerald-800'
                        : r.status === 'exists'
                          ? 'bg-amber-50 text-amber-800'
                          : 'bg-rose-50 text-rose-800'
                    }`}
                  >
                    {r.status === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                    ) : r.status === 'exists' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-amber-500" />
                    ) : (
                      <XCircle className="w-4 h-4 shrink-0" />
                    )}
                    <span className="font-mono font-bold text-xs">{r.serial}</span>
                    <span className="text-xs">{r.message}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
