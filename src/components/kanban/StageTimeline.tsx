import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, Timer, ExternalLink, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import pb from '@/lib/pocketbase/client'

interface StageTimelineProps {
  historyLogs: any[]
  metadata: any
  land: any
  landId: string
}

interface StageEntry {
  statusName: string
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

function getChangeDetails(log: any): any {
  const details = log.change_details
  if (typeof details === 'string') {
    try {
      return JSON.parse(details)
    } catch {
      return {}
    }
  }
  return details || {}
}

export function StageTimeline({ historyLogs, metadata, land, landId }: StageTimelineProps) {
  const [externalDiligenceTime, setExternalDiligenceTime] = useState<string | null>(null)
  const [diligenceLoading, setDiligenceLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    const code = land?.clusterSerial || land?.external_id || land?.externalId || landId
    if (!code) {
      setDiligenceLoading(false)
      return
    }

    pb.send(`/backend/v1/land-status?landCodes=${encodeURIComponent(code)}`, { method: 'GET' })
      .then((res) => {
        if (!isMounted) return
        const items = res?.data?.items || res?.items || []
        let totalDiligenceMs = 0
        const sortedItems = [...items].sort(
          (a, b) =>
            new Date(a.startDate || a.creationDate).getTime() -
            new Date(b.startDate || b.creationDate).getTime(),
        )

        for (let i = 0; i < sortedItems.length; i++) {
          const item = sortedItems[i]
          const groupName = (item.status?.statusGroup?.name || '').toLowerCase()
          const statusName = (item.status?.name || '').toLowerCase()
          if (groupName.includes('dilig') || statusName.includes('dilig')) {
            const start = new Date(item.startDate || item.creationDate)
            const end =
              i < sortedItems.length - 1
                ? new Date(sortedItems[i + 1].startDate || sortedItems[i + 1].creationDate)
                : new Date()
            totalDiligenceMs += end.getTime() - start.getTime()
          }
        }

        const directDiligence =
          land?.diligenceTime ||
          land?.totalDiligenceTime ||
          land?.diligenceDuration ||
          land?.diligenceDays

        if (directDiligence) {
          setExternalDiligenceTime(String(directDiligence))
        } else if (totalDiligenceMs > 0) {
          setExternalDiligenceTime(formatDuration(totalDiligenceMs))
        } else {
          setExternalDiligenceTime(null)
        }
      })
      .catch(() => {
        if (isMounted) setExternalDiligenceTime(null)
      })
      .finally(() => {
        if (isMounted) setDiligenceLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [land, landId])

  const statusChanges = historyLogs
    .filter((log) => getChangeDetails(log).field === 'status')
    .sort((a, b) => new Date(a.created).getTime() - new Date(b.created).getTime())

  const startDate = metadata?.created
    ? new Date(metadata.created)
    : new Date(land?.createdAt || land?.created || new Date())

  const stages: StageEntry[] = []

  if (statusChanges.length > 0) {
    const firstChange = statusChanges[0]
    const firstChangeDate = new Date(firstChange.created)
    const firstDetails = getChangeDetails(firstChange)
    stages.push({
      statusName: firstDetails.old || 'Inicial',
      startDate,
      endDate: firstChangeDate,
      durationMs: firstChangeDate.getTime() - startDate.getTime(),
      isCurrent: false,
    })

    for (let i = 0; i < statusChanges.length; i++) {
      const change = statusChanges[i]
      const details = getChangeDetails(change)
      const changeDate = new Date(change.created)
      const nextDate = i < statusChanges.length - 1 ? new Date(statusChanges[i + 1].created) : null

      stages.push({
        statusName: details.new || 'Desconhecido',
        startDate: changeDate,
        endDate: nextDate,
        durationMs: nextDate
          ? nextDate.getTime() - changeDate.getTime()
          : Date.now() - changeDate.getTime(),
        isCurrent: nextDate === null,
      })
    }
  } else {
    const currentStatus = metadata?.status || land?.currentStatus?.name || land?.status || 'Atual'
    stages.push({
      statusName: currentStatus,
      startDate,
      endDate: null,
      durationMs: Date.now() - startDate.getTime(),
      isCurrent: true,
    })
  }

  const totalInternalTime = stages.reduce((sum, s) => sum + s.durationMs, 0)

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
          {diligenceLoading ? (
            <div className="flex items-center gap-2 text-brand-primary/60">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Carregando...</span>
            </div>
          ) : externalDiligenceTime ? (
            <span className="text-3xl font-display font-light text-brand-primary">
              {externalDiligenceTime}
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
            Histórico de Etapas Internas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4 text-xs text-brand-primary/60">
            <Clock className="w-3.5 h-3.5" />
            <span>
              Tempo total:{' '}
              <strong className="text-brand-primary">{formatDuration(totalInternalTime)}</strong>
            </span>
          </div>

          <div className="space-y-3 relative before:absolute before:inset-y-1 before:left-[7px] before:w-[2px] before:bg-brand-primary/10">
            {stages.map((stage, i) => (
              <div key={i} className="flex gap-3 relative z-10">
                <div
                  className={cn(
                    'w-4 h-4 rounded-full border-2 border-white shrink-0 mt-1 shadow-sm',
                    stage.isCurrent ? 'bg-brand-secondary' : 'bg-slate-300',
                  )}
                />
                <div className="flex-1 flex flex-col gap-1 pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-brand-primary">{stage.statusName}</span>
                    {stage.isCurrent && (
                      <Badge className="bg-brand-secondary/10 text-brand-secondary border-none text-[9px] font-bold">
                        ATUAL
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-brand-primary/60">
                    <span>{format(stage.startDate, 'dd/MM/yyyy')}</span>
                    {stage.endDate && (
                      <>
                        <span>→</span>
                        <span>{format(stage.endDate, 'dd/MM/yyyy')}</span>
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
                    {formatDuration(stage.durationMs)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
