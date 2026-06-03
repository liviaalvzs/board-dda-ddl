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
        'flex flex-col flex-shrink-0 w-[320px] max-h-full bg-black/5 rounded-xl transition-colors duration-200',
        isDragOver && 'bg-brand-secondary/10 ring-2 ring-brand-secondary/30',
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="p-4 flex-shrink-0 border-b border-brand-primary/10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'w-2.5 h-2.5 rounded-full flex-shrink-0',
              column.color || 'bg-brand-primary',
            )}
          />
          <h3 className="rg-label text-brand-primary leading-snug">{column.title}</h3>
        </div>
        <div className="bg-brand-primary/10 text-brand-primary font-bold text-xs px-2.5 py-1 rounded-full shadow-sm flex-shrink-0">
          {cards.length}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-hide">
        {cards.length === 0 ? (
          <div className="h-32 flex flex-col items-center justify-center text-muted-foreground/60 gap-3 border-2 border-dashed border-black/5 rounded-lg bg-white/40">
            <Leaf className="w-8 h-8 opacity-20" />
            <p className="text-sm font-medium text-center px-4">Nenhuma propriedade nesta etapa</p>
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
