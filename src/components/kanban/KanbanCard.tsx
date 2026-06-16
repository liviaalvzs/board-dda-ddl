import { MapPin, User, Clock, FileText } from 'lucide-react'
import { KanbanCardType } from '@/types/kanban'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useNavigate } from 'react-router-dom'
import { differenceInDays, differenceInHours } from 'date-fns'

interface KanbanCardProps {
  card: KanbanCardType
  onDragStart: (e: React.DragEvent<HTMLDivElement>, cardId: string) => void
}

export function KanbanCard({ card, onDragStart }: KanbanCardProps) {
  const navigate = useNavigate()

  const responsibleStatus =
    !card.responsible ||
    card.responsible === 'Unassigned' ||
    card.responsible === 'Sem responsável' ||
    card.responsible === 'NA'

  const createdDate = new Date(card.createdAt || new Date())
  const updatedDate = new Date(card.updatedAt || new Date())

  const isNew = differenceInHours(new Date(), createdDate) <= 48
  const daysInStatus = differenceInDays(new Date(), updatedDate)

  const urgencyClass =
    daysInStatus > 14
      ? 'bg-rose-50/50 border-rose-200 hover:border-rose-300'
      : daysInStatus > 7
        ? 'bg-amber-50/50 border-amber-200 hover:border-amber-300'
        : 'bg-white border-slate-200 hover:border-brand-secondary/60'

  const riskColors = {
    low: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200',
    medium: 'bg-amber-100 text-amber-700 hover:bg-amber-200',
    high: 'bg-rose-100 text-rose-700 hover:bg-rose-200',
    '': 'hidden',
  }

  const riskLabel = {
    low: 'Baixo Risco',
    medium: 'Médio Risco',
    high: 'Alto Risco',
    '': '',
  }

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
  const totalDocs = 9
  const progressPercent = Math.min(100, Math.max(0, (completedDocs / totalDocs) * 100))

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, card.id)}
      onClick={() => navigate(`/land/${card.id}`)}
      className={cn(
        'rounded-lg p-4 shadow-sm border transition-all duration-150 cursor-grab active:cursor-grabbing group animate-slide-up flex flex-col gap-3',
        urgencyClass,
      )}
    >
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-start gap-2">
          <span className="text-muted-foreground font-bold text-[10px] tracking-wider uppercase">
            {card.clusterSerial || card.id}
          </span>
          <div className="flex gap-1">
            {isNew && (
              <Badge className="bg-brand-primary text-white hover:bg-brand-primary/90 text-[9px] px-1.5 py-0">
                NOVO
              </Badge>
            )}
            {card.riskLevel && (
              <Badge
                className={cn(
                  'text-[9px] px-1.5 py-0 border-none font-semibold',
                  riskColors[card.riskLevel as keyof typeof riskColors],
                )}
              >
                {riskLabel[card.riskLevel as keyof typeof riskLabel]}
              </Badge>
            )}
          </div>
        </div>

        <h4 className="font-semibold text-sm text-slate-800 leading-tight group-hover:text-brand-secondary transition-colors line-clamp-2">
          {card.name ? card.name : card.title}
        </h4>
      </div>

      <div className="flex items-center flex-wrap gap-1.5">
        <Badge
          variant="outline"
          className="bg-slate-100 text-slate-700 font-medium text-xs px-2 py-0 border-slate-200"
        >
          {card.area.toLocaleString('pt-BR')} ha
        </Badge>
        {card.ddaStatusLabel && card.ddaStatusLabel !== 'none' && (
          <Badge
            variant="outline"
            className={cn(
              'font-medium text-xs px-2 py-0 border-none',
              ddaColors[card.ddaStatusLabel as keyof typeof ddaColors],
            )}
          >
            {ddaLabel[card.ddaStatusLabel as keyof typeof ddaLabel]}
          </Badge>
        )}
      </div>

      <div className="space-y-1.5 mt-1 text-xs text-slate-600">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
          <span className="truncate" title={`${card.location.city}, ${card.location.state}`}>
            {card.location.city}, {card.location.state}
          </span>
        </div>
      </div>

      <div className="space-y-1.5 pt-2 border-t border-slate-200">
        <div className="flex justify-between items-center text-[10px] text-slate-500 font-medium">
          <span className="flex items-center gap-1">
            <FileText className="w-3 h-3" /> Docs: {completedDocs}/{totalDocs}
          </span>
          <span>{Math.round(progressPercent)}%</span>
        </div>
        <Progress
          value={progressPercent}
          className="h-1.5 bg-slate-200"
          indicatorClassName="bg-brand-primary"
        />
      </div>

      <div className="flex items-center justify-between pt-1 mt-1">
        <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
          <Clock className="w-3 h-3" />
          <span>
            {daysInStatus} {daysInStatus === 1 ? 'dia' : 'dias'} na etapa
          </span>
        </div>

        <div
          className={cn(
            'flex items-center gap-1 font-semibold text-[10px] px-2 py-0.5 rounded-md transition-colors max-w-[120px]',
            responsibleStatus ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700',
          )}
        >
          <User className="w-3 h-3 flex-shrink-0" />
          <span className="truncate" title={card.responsible}>
            {responsibleStatus ? 'Pendente' : card.responsible}
          </span>
        </div>
      </div>
    </div>
  )
}
