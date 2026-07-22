import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ExternalLink, Clock, CalendarDays, ArrowRight, AlertCircle, Timer } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import pb from '@/lib/pocketbase/client'
import { getStatusLabel } from '@/lib/status-mapping'

interface DiligenceTimelineProps {
  land: any
  landId: string
  metadata?: any
}

interface ExternalStage {
  statusName: string
  groupName: string
  startDate: Date
  endDate: Date | null
  durationMs: number
  isCurrent: boolean
}

function formatDuration(ms: number): string {
  if (ms <= 0) return '0 dias'
  const days = Math.floor(ms / (1000 * 60 * 60 * 24))
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  if (days > 0 && hours > 0) return `${days} ${days === 1 ? 'dia' : 'dias'}, ${hours}h`
  if (days > 0) return `${days} ${days === 1 ? 'dia' : 'dias'}`
  if (hours > 0) return `${hours}h`
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
  if (minutes > 0) return `${minutes}min`
  return '< 1min'
}

export function DiligenceTimeline({ land, landId, metadata }: DiligenceTimelineProps) {
  const [stages, setStages] = useState<ExternalStage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [noIdentifier, setNoIdentifier] = useState(false)

  useEffect(() => {
    let isMounted = true

    const externalId = metadata?.external_id || land?.external_id || land?.externalId || ''

    console.log('[DiligenceTimeline] Identifier extraction:', {
      landId,
      metadataExternalId: metadata?.external_id || null,
      landExternalId: land?.external_id || land?.externalId || null,
      resolvedExternalId: externalId || null,
    })

    if (!externalId) {
      console.warn('[DiligenceTimeline] No external_id available — skipping request', {
        landId,
        metadata: metadata ? { external_id: metadata.external_id } : null,
        land: land
          ? {
              external_id: land.external_id,
              externalId: land.externalId,
            }
          : null,
      })
      setStages([])
      setLoading(false)
      setError(false)
      setNoIdentifier(true)
      return
    }

    setNoIdentifier(false)
    setLoading(true)
    setError(false)

    const requestUrl = `/backend/v1/land-status?landIds=${encodeURIComponent(externalId)}`

    console.log('[DiligenceTimeline] Sending request to backend:', {
      requestUrl,
      method: 'GET',
      params: {
        landIds: externalId,
      },
    })

    pb.send(requestUrl, {
      method: 'GET',
    })
      .then((res) => {
        if (!isMounted) return
        const items = res?.data?.items || res?.items || []

        console.log('[DiligenceTimeline] Response received:', {
          requestUrl,
          hasData: !!res,
          hasDataItems: !!res?.data?.items,
          hasItems: !!res?.items,
          itemCount: items.length,
          rawResponseKeys: res ? Object.keys(res) : [],
          firstItemPreview:
            items.length > 0
              ? {
                  statusName: items[0]?.status?.name,
                  startDate: items[0]?.startDate,
                  creationDate: items[0]?.creationDate,
                }
              : null,
        })

        if (items.length === 0) {
          console.log('[DiligenceTimeline] API returned 0 items — confirmed empty response', {
            requestUrl,
            params: { landIds: externalId },
          })
          setStages([])
          return
        }

        const sortedItems = [...items].sort(
          (a, b) =>
            new Date(a.startDate || a.creationDate).getTime() -
            new Date(b.startDate || b.creationDate).getTime(),
        )

        const mapped: ExternalStage[] = []
        for (let i = 0; i < sortedItems.length; i++) {
          const item = sortedItems[i]
          const start = new Date(item.startDate || item.creationDate)
          const end =
            i < sortedItems.length - 1
              ? new Date(sortedItems[i + 1].startDate || sortedItems[i + 1].creationDate)
              : null

          const rawName = item.status?.name || 'Desconhecido'
          const mappedName = getStatusLabel(rawName)
          const statusName = mappedName === rawName ? rawName : mappedName

          mapped.push({
            statusName,
            groupName: item.status?.statusGroup?.name || '',
            startDate: start,
            endDate: end,
            durationMs: end ? end.getTime() - start.getTime() : Date.now() - start.getTime(),
            isCurrent: end === null,
          })
        }

        setStages(mapped)
      })
      .catch((err) => {
        console.error('[DiligenceTimeline] Request failed:', {
          requestUrl,
          params: { landIds: externalId },
          error: err?.message || err,
          status: err?.status,
        })
        if (isMounted) setError(true)
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [land, landId, metadata])

  const totalDiligenceMs = stages.reduce((sum, s) => sum + s.durationMs, 0)
  const reversedStages = [...stages].reverse()

  return (
    <div className="space-y-6">
      <Card className="border-brand-primary/10 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-lg text-brand-primary flex items-center gap-2">
            <ExternalLink className="w-5 h-5 text-brand-secondary" />
            Tempo Total de Diligência (Externo)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-10 w-48" />
          ) : error ? (
            <span className="text-sm text-brand-primary/50 italic">
              Não foi possível carregar os dados de diligência externa
            </span>
          ) : totalDiligenceMs > 0 ? (
            <span className="text-3xl font-display font-light text-brand-primary">
              {formatDuration(totalDiligenceMs)}
            </span>
          ) : (
            <span className="text-sm text-brand-primary/50 italic">Informação indisponível</span>
          )}
        </CardContent>
      </Card>

      <Card className="border-brand-primary/10 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-lg text-brand-primary flex items-center gap-2">
            <Timer className="w-5 h-5 text-brand-secondary" />
            Linha do Tempo de Diligência Externa
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="w-4 h-4 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-10">
              <AlertCircle className="w-8 h-8 text-brand-primary/30 mx-auto mb-3" />
              <p className="text-sm text-brand-primary/60">
                Não foi possível carregar os dados de diligência externa
              </p>
            </div>
          ) : noIdentifier ? (
            <div className="text-center py-10">
              <AlertCircle className="w-8 h-8 text-brand-primary/30 mx-auto mb-3" />
              <p className="text-sm text-brand-primary/60">
                Nenhum identificador externo disponível para esta propriedade
              </p>
            </div>
          ) : stages.length > 0 ? (
            <>
              <div className="flex items-center gap-2 mb-5 text-xs text-brand-primary/60">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  Tempo total:{' '}
                  <strong className="text-brand-primary">{formatDuration(totalDiligenceMs)}</strong>
                </span>
              </div>
              <div className="space-y-4 relative before:absolute before:inset-y-1 before:left-[7px] before:w-[2px] before:bg-brand-primary/10">
                {reversedStages.map((stage, i) => (
                  <div key={i} className="flex gap-3 relative z-10">
                    <div
                      className={cn(
                        'w-4 h-4 rounded-full border-2 border-white shrink-0 mt-0.5 shadow-sm',
                        stage.isCurrent ? 'bg-brand-secondary' : 'bg-slate-300',
                      )}
                    />
                    <div className="flex-1 flex flex-col gap-1.5 pb-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-sm font-bold text-brand-primary">
                          {stage.statusName}
                        </span>
                        {stage.isCurrent ? (
                          <Badge className="bg-brand-secondary/10 text-brand-secondary border-none text-[9px] font-bold">
                            EM ANDAMENTO
                          </Badge>
                        ) : (
                          <span className="text-[10px] text-brand-primary/40 font-medium uppercase tracking-wider">
                            Concluído
                          </span>
                        )}
                      </div>
                      {stage.groupName && (
                        <span className="text-[10px] text-brand-primary/40 leading-none">
                          {stage.groupName}
                        </span>
                      )}
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-brand-primary/60">
                        <div className="flex items-center gap-1">
                          <CalendarDays className="w-3 h-3" />
                          <span>Entrada: {format(stage.startDate, "dd/MM/yyyy 'às' HH:mm")}</span>
                        </div>
                        {stage.endDate ? (
                          <>
                            <ArrowRight className="w-3 h-3" />
                            <span>Saída: {format(stage.endDate, "dd/MM/yyyy 'às' HH:mm")}</span>
                          </>
                        ) : (
                          <>
                            <ArrowRight className="w-3 h-3" />
                            <span className="italic">Em andamento</span>
                          </>
                        )}
                      </div>
                      <div
                        className={cn(
                          'text-xs font-semibold flex items-center gap-1',
                          stage.isCurrent ? 'text-brand-secondary' : 'text-brand-primary/70',
                        )}
                      >
                        <Clock className="w-3 h-3" />
                        Duração: {formatDuration(stage.durationMs)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-10">
              <Timer className="w-8 h-8 text-brand-primary/30 mx-auto mb-3" />
              <p className="text-sm text-brand-primary/60">
                Nenhum dado de diligência externa encontrado
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
