import { useState } from 'react'
import { KanbanColumnType, KanbanCardType } from '@/types/kanban'
import { KanbanCard } from './KanbanCard'
import { cn } from '@/lib/utils'
import { Leaf } from 'lucide-react'

interface KanbanColumnProps {
  column: KanbanColumnType
  cards: KanbanCardType[]
  onDropCard: (cardId: string, targetColumnId: string) => void
}

export function KanbanColumn({ column, cards, onDropCard }: KanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (!isDragOver) setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
    const cardId = e.dataTransfer.getData('cardId')
    if (cardId) {
      onDropCard(cardId, column.id)
    }
  }

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, cardId: string) => {
    e.dataTransfer.setData('cardId', cardId)
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div
      className={cn(
        'flex flex-col flex-shrink-0 w-[280px] sm:w-[320px] h-full max-h-full bg-slate-100/80 rounded-xl transition-all duration-200 border border-slate-200 shadow-rg-card',
        isDragOver && 'bg-brand-secondary/10 ring-2 ring-brand-secondary/30',
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="p-4 flex-shrink-0 border-b border-slate-200/80 flex items-center justify-between gap-3 bg-slate-100 rounded-t-xl shadow-sm z-10 relative">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              'w-3 h-3 rounded-full flex-shrink-0 shadow-sm',
              column.color || 'bg-brand-primary',
            )}
          />
          <h3 className="font-display font-semibold text-slate-800 text-[15px] leading-snug">
            {column.title}
          </h3>
        </div>
        <div className="bg-white text-brand-primary font-bold text-xs px-3 py-1 rounded-full shadow-sm flex-shrink-0 border border-slate-200/80">
          {cards.length} {cards.length === 1 ? 'card' : 'cards'}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 scrollbar-hide">
        {cards.length === 0 ? (
          <div className="h-32 flex flex-col items-center justify-center text-muted-foreground/60 gap-3 border-2 border-dashed border-slate-300 rounded-lg bg-white/40 m-1">
            <Leaf className="w-8 h-8 opacity-20" />
            <p className="text-sm font-medium text-center px-4">Nenhuma propriedade</p>
          </div>
        ) : (
          cards.map((card) => (
            <KanbanCard key={card.id} card={card} onDragStart={handleDragStart} />
          ))
        )}
      </div>
    </div>
  )
}
