import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, Timer, CalendarDays, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { getStatusLabel } from '@/lib/status-mapping'

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
  const stages = useMemo<StageEntry[]>(() => {
    const statusChanges = historyLogs
      .filter((log) => getChangeDetails(log).field === 'status')
      .sort((a, b) => new Date(a.created).getTime() - new Date(b.created).getTime())

    const startDate = metadata?.created
      ? new Date(metadata.created)
      : new Date(land?.createdAt || land?.created || new Date())

    const result: StageEntry[] = []

    if (statusChanges.length > 0) {
      const firstChange = statusChanges[0]
      const firstChangeDate = new Date(firstChange.created)
      const firstDetails = getChangeDetails(firstChange)
      result.push({
        statusName: getStatusLabel(firstDetails.old || 'Inicial'),
        startDate,
        endDate: firstChangeDate,
        durationMs: firstChangeDate.getTime() - startDate.getTime(),
        isCurrent: false,
      })

      for (let i = 0; i < statusChanges.length; i++) {
        const change = statusChanges[i]
        const details = getChangeDetails(change)
        const changeDate = new Date(change.created)
        const nextDate =
          i < statusChanges.length - 1 ? new Date(statusChanges[i + 1].created) : null

        result.push({
          statusName: getStatusLabel(details.new || 'Desconhecido'),
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
      result.push({
        statusName: getStatusLabel(currentStatus),
        startDate,
        endDate: null,
        durationMs: Date.now() - startDate.getTime(),
        isCurrent: true,
      })
    }

    return result
  }, [historyLogs, metadata, land])

  const totalInternalTime = stages.reduce((sum, s) => sum + s.durationMs, 0)
  const hasStatusChanges =
    stages.length > 1 ||
    (stages.length === 1 && historyLogs.some((log) => getChangeDetails(log).field === 'status'))
  const reversedStages = [...stages].reverse()

  return (
    <Card className="border-brand-primary/10 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-lg text-brand-primary flex items-center gap-2">
          <Timer className="w-5 h-5 text-brand-secondary" />
          Histórico de Etapas Internas
        </CardTitle>
      </CardHeader>
      <CardContent>
        {hasStatusChanges || stages.length > 0 ? (
          <>
            <div className="flex items-center gap-2 mb-5 text-xs text-brand-primary/60">
              <Clock className="w-3.5 h-3.5" />
              <span>
                Tempo total:{' '}
                <strong className="text-brand-primary">{formatDuration(totalInternalTime)}</strong>
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
                      {!stage.endDate && (
                        <span className="text-brand-primary/40 ml-1">
                          (
                          {formatDistanceToNow(stage.startDate, {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                          )
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-10">
            <Timer className="w-8 h-8 text-brand-primary/30 mx-auto mb-3" />
            <p className="text-sm text-brand-primary/60">Nenhum histórico de etapas encontrado</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
