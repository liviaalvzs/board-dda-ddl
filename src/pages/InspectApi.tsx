import { useState, useEffect } from 'react'
import { Loader2, Search, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import pb from '@/lib/pocketbase/client'

interface FieldInfo {
  value: string
  type: string
}

interface PatternMatch {
  field: string
  value: string
}

interface SampleLand {
  index: number
  fields: Record<string, FieldInfo>
  patternMatches: PatternMatch[]
  uuidMatches: PatternMatch[]
  allFieldNames: string[]
}

interface InspectResult {
  totalLands: number
  responseStructure: string
  topLevelKeys: string[]
  allFieldNames: string[]
  sampleLands: SampleLand[]
}

export default function InspectApi() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<InspectResult | null>(null)
  const [error, setError] = useState('')

  const inspect = async () => {
    setLoading(true)
    setError('')
    try {
      const result = await pb.send('/backend/v1/inspect-lands', { method: 'GET' })
      setData(result as InspectResult)
    } catch (err: any) {
      setError(err?.message || 'Failed to inspect API')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    inspect()
  }, [])

  return (
    <div className="flex-1 overflow-auto bg-brand-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-primary flex items-center gap-2">
            <Search className="w-6 h-6 text-brand-secondary" />
            Inspeção da API de Terras
          </h1>
          <p className="text-sm text-brand-primary/60 mt-1">
            Analisando a resposta da API externa para identificar qual campo contém o código
            cluster_serial (ex: CAM-0193).
          </p>
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-brand-secondary mb-3" />
            <p className="text-sm text-brand-primary/60">Consultando API externa...</p>
          </div>
        )}

        {error && !loading && (
          <Card className="border-brand-critical/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-brand-critical">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span className="text-sm font-medium">{error}</span>
              </div>
              <Button onClick={inspect} variant="outline" size="sm" className="mt-4">
                <RefreshCw className="w-4 h-4 mr-2" />
                Tentar novamente
              </Button>
            </CardContent>
          </Card>
        )}

        {data && !loading && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Resumo da Resposta</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-brand-primary/60">Total de terras:</span>
                  <span className="font-bold text-brand-primary">{data.totalLands}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-brand-primary/60">Estrutura da resposta:</span>
                  <span className="font-bold text-brand-primary">{data.responseStructure}</span>
                </div>
                {data.topLevelKeys && data.topLevelKeys.length > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-brand-primary/60">Keys principais:</span>
                    <span className="font-mono text-xs text-brand-primary">
                      {data.topLevelKeys.join(', ')}
                    </span>
                  </div>
                )}
                {data.allFieldNames && data.allFieldNames.length > 0 && (
                  <div className="pt-2 border-t border-brand-primary/5">
                    <p className="text-xs font-semibold text-brand-primary/60 mb-2">
                      Todos os campos encontrados ({data.allFieldNames.length}):
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {data.allFieldNames.map((name) => (
                        <Badge
                          key={name}
                          variant="outline"
                          className="text-[10px] font-mono border-brand-secondary/30 text-brand-secondary"
                        >
                          {name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {data.sampleLands?.map((land) => (
              <Card key={land.index}>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                    Terra #{land.index + 1}
                    {land.patternMatches?.length > 0 && (
                      <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        {land.patternMatches.length} campo(s) com padrão XXX-9999
                      </Badge>
                    )}
                    {land.uuidMatches?.length > 0 && (
                      <Badge variant="outline" className="text-blue-600 border-blue-200">
                        {land.uuidMatches.length} UUID(s)
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {land.patternMatches?.length > 0 && (
                    <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-xs font-semibold text-green-800 mb-2">
                        ✅ Campos que correspondem ao padrão de cluster_serial (XXX-9999):
                      </p>
                      {land.patternMatches.map((m, i) => (
                        <div key={i} className="text-sm flex items-center gap-2 py-1">
                          <span className="font-mono font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded">
                            {m.field}
                          </span>
                          <span className="text-green-600">→</span>
                          <span className="font-mono text-green-900 font-bold">{m.value}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {land.uuidMatches?.length > 0 && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-xs font-semibold text-blue-800 mb-2">
                        🔑 Campos com formato UUID (provável external_id):
                      </p>
                      {land.uuidMatches.map((m, i) => (
                        <div key={i} className="text-sm flex items-center gap-2 py-1">
                          <span className="font-mono font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                            {m.field}
                          </span>
                          <span className="text-blue-600">→</span>
                          <span className="font-mono text-xs text-blue-900">{m.value}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-brand-primary/60 mb-2">
                      Todos os campos do registro:
                    </p>
                    {Object.entries(land.fields).map(([key, val]) => (
                      <div
                        key={key}
                        className="flex items-start gap-2 text-sm py-1 border-b border-brand-primary/5 last:border-0"
                      >
                        <span className="font-mono text-xs font-bold text-brand-secondary min-w-[160px] shrink-0">
                          {key}
                        </span>
                        <span className="font-mono text-xs text-brand-primary/80 break-all">
                          {val.value}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] ml-auto shrink-0 text-brand-primary/40"
                        >
                          {val.type}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}

            <Button onClick={inspect} variant="outline" className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar inspeção
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
