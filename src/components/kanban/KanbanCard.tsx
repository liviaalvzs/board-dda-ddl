import { MapPin, Clock, FileText, Building2, ChevronDown, ChevronUp } from 'lucide-react'
import { KanbanCardType } from '@/types/kanban'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useNavigate } from 'react-router-dom'
import { differenceInDays, differenceInHours, format } from 'date-fns'
import { useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

interface KanbanCardProps {
  card: KanbanCardType
  onDragStart: (e: React.DragEvent<HTMLDivElement>, cardId: string) => void
}

type TimelineStep = {
  statusName: string
  groupName: string
  startDate: Date
  endDate?: Date
  durationDays: number
  isCurrent: boolean
}

export function KanbanCard({ card, onDragStart }: KanbanCardProps) {
  const navigate = useNavigate()
  const [timelineSteps, setTimelineSteps] = useState<TimelineStep[]>([])
  const [timelineLoading, setTimelineLoading] = useState(true)
  const [isTimelineOpen, setIsTimelineOpen] = useState(false)

  useEffect(() => {
    let isMounted = true
    const code = card.code || card.clusterSerial || card.id
    if (!code || String(code).startsWith('local-')) {
      setTimelineLoading(false)
      return
    }

    setTimelineLoading(true)

    pb.send(`/backend/v1/land-status?limit=100&offset=0&landCodes=${encodeURIComponent(code)}`, {
      method: 'GET',
    })
      .then((res) => {
        if (!isMounted) return
        const items = res?.data?.items || res?.items || []

        if (items.length > 0) {
          const sortedItems = [...items].sort(
            (a, b) =>
              new Date(a.startDate || a.creationDate).getTime() -
              new Date(b.startDate || b.creationDate).getTime(),
          )

          const groups: TimelineStep[] = []
          for (const item of sortedItems) {
            const statusName = item.status?.name || 'Desconhecido'
            const groupName = item.status?.statusGroup?.name || ''
            const date = new Date(item.startDate || item.creationDate)

            if (groups.length === 0) {
              groups.push({
                statusName,
                groupName,
                startDate: date,
                durationDays: 0,
                isCurrent: false,
              })
            } else {
              const lastGroup = groups[groups.length - 1]
              if (lastGroup.statusName === statusName) {
                // keep the first start date
              } else {
                lastGroup.endDate = date
                lastGroup.durationDays = differenceInDays(date, lastGroup.startDate)
                groups.push({
                  statusName,
                  groupName,
                  startDate: date,
                  durationDays: 0,
                  isCurrent: false,
                })
              }
            }
          }

          if (groups.length > 0) {
            const lastGroup = groups[groups.length - 1]
            lastGroup.isCurrent = true
            lastGroup.durationDays = differenceInDays(new Date(), lastGroup.startDate)
          }

          setTimelineSteps(groups)
        }
      })
      .catch(console.error)
      .finally(() => {
        if (isMounted) setTimelineLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [card.code, card.clusterSerial, card.id])

  const createdDate = new Date(card.createdAt || new Date())
  const updatedDate = new Date(card.updatedAt || new Date())

  const isNew = differenceInHours(new Date(), createdDate) <= 48
  const daysInStatus =
    timelineSteps.length > 0
      ? timelineSteps[timelineSteps.length - 1].durationDays
      : differenceInDays(new Date(), updatedDate)

  const urgencyClass =
    daysInStatus > 14
      ? 'bg-white border-rose-200'
      : daysInStatus > 7
        ? 'bg-white border-amber-200'
        : 'bg-white border-slate-200'
  const hoverClass =
    daysInStatus > 14
      ? 'hover:border-rose-400'
      : daysInStatus > 7
        ? 'hover:border-amber-400'
        : 'hover:border-brand-secondary/60'

  const urgencyBadge =
    daysInStatus > 14 ? (
      <Badge className="bg-rose-500 hover:bg-rose-600 text-white text-[9px] px-1.5 py-0 border-none font-bold">
        ATRASADO
      </Badge>
    ) : daysInStatus > 7 ? (
      <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-[9px] px-1.5 py-0 border-none font-bold">
        ATENÇÃO
      </Badge>
    ) : null

  const ddaLabel = {
    existing: 'DDA Existente',
    distributed: 'DDA Distribuída',
    none: 'Sem DDA',
    '': '',
  }
  const ddaColors = {
    existing: 'bg-blue-100 text-blue-700',
    distributed: 'bg-purple-100 text-purple-700',
    none: 'bg-slate-100 text-slate-600',
    '': 'hidden',
  }

  const completedDocs = card.completedDocs || 0
  const totalDocs = 11 // Matching total items in checklist generally
  const progressPercent = Math.min(100, Math.max(0, (completedDocs / totalDocs) * 100))

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, card.id)}
      onClick={() => navigate(`/land/${card.id}`)}
      className={cn(
        'rounded-xl p-4 shadow-sm border transition-all duration-200 cursor-grab active:cursor-grabbing group animate-slide-up flex flex-col gap-3',
        urgencyClass,
        hoverClass,
      )}
    >
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-start gap-2">
          <span className="text-slate-500 font-bold text-[10px] tracking-widest uppercase bg-white/60 px-1.5 py-0.5 rounded">
            {card.clusterSerial || card.id}
          </span>
          <div className="flex gap-1 flex-wrap justify-end">
            {urgencyBadge}
            {isNew && (
              <Badge className="bg-brand-primary text-white hover:bg-brand-primary/90 text-[9px] px-1.5 py-0">
                NOVO
              </Badge>
            )}
          </div>
        </div>

        <h4 className="font-semibold text-sm text-slate-800 leading-snug group-hover:text-brand-secondary transition-colors line-clamp-2">
          {card.name ? card.name : card.title}
        </h4>
      </div>

      <div className="flex items-center flex-wrap gap-1.5">
        <Badge
          variant="outline"
          className="bg-white/60 text-slate-700 font-bold text-[10px] px-2 py-0 border-slate-200 shadow-sm"
        >
          {card.area.toLocaleString('pt-BR')} ha
        </Badge>
        {card.ddaStatusLabel && card.ddaStatusLabel !== 'none' && (
          <Badge
            variant="outline"
            className={cn(
              'font-bold text-[10px] px-2 py-0 border-none shadow-sm',
              ddaColors[card.ddaStatusLabel as keyof typeof ddaColors],
            )}
          >
            {ddaLabel[card.ddaStatusLabel as keyof typeof ddaLabel]}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-1.5 text-xs text-slate-600">
        <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
        <span
          className="truncate font-medium"
          title={`${card.location.city}, ${card.location.state}`}
        >
          {card.location.city}, {card.location.state}
        </span>
      </div>

      <div className="bg-white/60 p-2.5 rounded-lg border border-slate-200/60 space-y-2 mt-1">
        <div className="flex justify-between items-center text-[10px] text-slate-600 font-bold">
          <span className="flex items-center gap-1">
            <FileText className="w-3 h-3 text-brand-primary/60" /> Docs: {completedDocs}/{totalDocs}
          </span>
          <span className="text-brand-secondary">{Math.round(progressPercent)}%</span>
        </div>
        <Progress
          value={progressPercent}
          className="h-1.5 bg-slate-200"
          indicatorClassName="bg-brand-secondary"
        />
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 mt-1">
        <div
          className={cn(
            'flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-md',
            daysInStatus > 14
              ? 'bg-rose-100 text-rose-700'
              : daysInStatus > 7
                ? 'bg-amber-100 text-amber-700'
                : 'bg-emerald-100 text-emerald-700',
          )}
        >
          <Clock className="w-3 h-3" />
          <span>
            {daysInStatus} {daysInStatus === 1 ? 'dia' : 'dias'} na etapa
          </span>
        </div>

        <div
          className={cn(
            'flex items-center gap-1.5 font-bold text-[10px] px-2 py-1 rounded-md transition-colors max-w-[120px] shadow-sm',
            !card.externalOffice ||
              card.externalOffice === 'Sem Escritório' ||
              card.externalOffice === 'Pendente'
              ? 'bg-slate-100 text-slate-500 border border-slate-200'
              : 'bg-white text-slate-700 border border-slate-200',
          )}
        >
          <Building2 className="w-3 h-3 shrink-0" />
          <span className="truncate" title={card.externalOffice || 'Sem Escritório'}>
            {card.externalOffice || 'Sem Escritório'}
          </span>
        </div>
      </div>

      {/* Progress Timeline */}
      <Collapsible
        open={isTimelineOpen}
        onOpenChange={setIsTimelineOpen}
        className="mt-1 border-t border-slate-200/60 pt-2"
        onClick={(e) => e.stopPropagation()}
      >
        <CollapsibleTrigger className="flex items-center justify-between w-full p-1 rounded hover:bg-slate-50 transition-colors group/trigger">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Progresso
          </span>
          <div className="flex items-center gap-1 text-slate-400 group-hover/trigger:text-slate-600 transition-colors">
            {timelineSteps.length > 0 && (
              <span className="text-[9px] font-medium mr-1">{timelineSteps.length} etapas</span>
            )}
            {isTimelineOpen ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-2 data-[state=closed]:animate-collapse-up data-[state=open]:animate-collapse-down">
          {timelineLoading ? (
            <div className="space-y-2 p-1">
              <div className="h-8 bg-slate-100 animate-pulse rounded" />
              <div className="h-8 bg-slate-100 animate-pulse rounded" />
            </div>
          ) : timelineSteps.length > 0 ? (
            <div className="max-h-[160px] overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full flex flex-col gap-2 relative before:absolute before:inset-y-1 before:left-[5px] before:w-[2px] before:bg-slate-100 ml-1">
              {timelineSteps.map((step, i) => (
                <div key={i} className="flex gap-2.5 relative z-10">
                  <div
                    className={cn(
                      'w-3 h-3 rounded-full border-2 border-white shrink-0 mt-0.5',
                      step.isCurrent ? 'bg-brand-secondary' : 'bg-slate-300',
                    )}
                  />
                  <div className="flex flex-col gap-0.5 pb-2">
                    <span className="text-[10px] font-bold text-slate-700 leading-tight">
                      {step.statusName}
                    </span>
                    {step.groupName && (
                      <span className="text-[9px] text-slate-400 leading-none">
                        {step.groupName}
                      </span>
                    )}
                    <div className="flex items-center gap-1.5 text-[9px] text-slate-500 font-medium mt-0.5">
                      <span>{format(step.startDate, 'dd/MM/yyyy')}</span>
                      <span>•</span>
                      <span
                        className={cn(
                          step.isCurrent && step.durationDays > 14 ? 'text-rose-600 font-bold' : '',
                        )}
                      >
                        {step.durationDays} {step.durationDays === 1 ? 'dia' : 'dias'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-2">
              <span className="text-[10px] text-slate-400 font-medium">
                Sem histórico de etapas
              </span>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
