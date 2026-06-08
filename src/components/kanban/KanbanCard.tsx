import { MapPin, User } from 'lucide-react'
import { KanbanCardType } from '@/types/kanban'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { useNavigate } from 'react-router-dom'

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

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, card.id)}
      onClick={() => navigate(`/land/${card.id}`)}
      className="bg-white rounded-rg p-4 shadow-rg-card border border-transparent hover:border-brand-secondary/60 transition-all duration-150 cursor-grab active:cursor-grabbing group animate-slide-up flex flex-col gap-3"
    >
      <div className="space-y-1.5">
        <span className="rg-label text-muted-foreground block font-bold text-[11px] tracking-wider uppercase">
          Cluster Serial: {card.clusterSerial || card.id}
        </span>
        <div className="flex justify-between items-start gap-2">
          <h4 className="font-display font-light text-[1.1rem] text-brand-primary leading-tight group-hover:text-brand-secondary transition-colors line-clamp-2">
            {card.name ? card.name : card.title}
          </h4>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Badge className="bg-brand-secondary text-brand-primary hover:bg-brand-secondary/90 font-bold whitespace-nowrap text-sm px-2 py-0.5 rounded-md border-none">
          {card.area.toLocaleString('pt-BR')} ha
        </Badge>
      </div>

      <div className="space-y-2 mt-1 text-[13px] text-brand-primary">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 flex-shrink-0 text-brand-secondary" />
          <span
            className="truncate font-medium"
            title={`${card.location.city}, ${card.location.state}`}
          >
            {card.location.city}, {card.location.state}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <User className="w-4 h-4 flex-shrink-0 text-brand-warning" />
          <span className="truncate font-medium" title={card.owner}>
            {card.owner}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 mt-1 border-t border-brand-primary/10">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-brand-primary/5 text-brand-primary/80 font-semibold text-[11px] whitespace-nowrap">
          <span>Checklist de Documentos ({card.completedDocs || 0}/9)</span>
        </div>

        <div
          className={cn(
            'flex items-center gap-1.5 font-semibold text-[11px] px-2.5 py-1 rounded-md transition-colors',
            responsibleStatus
              ? 'bg-brand-warning text-brand-primary'
              : 'bg-brand-secondary text-brand-primary',
          )}
        >
          <User className="w-3 h-3" />
          <span className="truncate max-w-[100px]" title={card.responsible}>
            {responsibleStatus ? 'Pendente' : card.responsible}
          </span>
        </div>
      </div>
    </div>
  )
}
