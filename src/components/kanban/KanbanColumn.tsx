import { useState, useCallback } from 'react'
import { KanbanColumnType, KanbanCardType } from '@/types/kanban'
import { KanbanCard } from './KanbanCard'
import { cn } from '@/lib/utils'
import { ChevronRight, Leaf, Minimize2, Maximize2 } from 'lucide-react'

interface KanbanColumnProps {
  column: KanbanColumnType
  cards: KanbanCardType[]
  onDropCard: (cardId: string, targetColumnId: string) => void
  collapsible?: boolean
}

export function KanbanColumn({ column, cards, onDropCard, collapsible }: KanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [collapsed, setCollapsed] = useState(!!collapsible)
  const [allMinimized, setAllMinimized] = useState(false)
  const [minimizedCards, setMinimizedCards] = useState<Set<string>>(new Set())

  const isCardMinimized = useCallback(
    (cardId: string) => {
      if (minimizedCards.has(cardId)) return !allMinimized
      return allMinimized
    },
    [allMinimized, minimizedCards],
  )

  const toggleCardMinimize = useCallback((cardId: string) => {
    setMinimizedCards((prev) => {
      const next = new Set(prev)
      if (next.has(cardId)) next.delete(cardId)
      else next.add(cardId)
      return next
    })
  }, [])

  const toggleAllMinimized = useCallback(() => {
    setAllMinimized((prev) => !prev)
    setMinimizedCards(new Set())
  }, [])

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

  if (collapsed) {
    return (
      <div
        className={cn(
          'flex flex-col flex-shrink-0 w-14 h-full max-h-full bg-gray-100 rounded-xl transition-all duration-200 border border-gray-300 shadow-rg-card items-center cursor-pointer',
          isDragOver && 'bg-brand-secondary/10 ring-2 ring-brand-secondary/30',
        )}
        onClick={() => setCollapsed(false)}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="py-4 flex flex-col items-center gap-2">
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <div className="bg-gray-200 text-gray-600 font-bold text-xs px-2 py-0.5 rounded-full">
            {cards.length}
          </div>
          <span className="text-xs font-semibold text-gray-500 [writing-mode:vertical-lr] rotate-180">
            {column.title}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex flex-col flex-shrink-0 w-[280px] sm:w-[320px] h-full max-h-full rounded-xl transition-all duration-200 border shadow-rg-card',
        collapsible ? 'bg-gray-50 border-gray-300' : 'bg-slate-100/80 border-slate-200',
        isDragOver && 'bg-brand-secondary/10 ring-2 ring-brand-secondary/30',
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div
        className={cn(
          'p-4 flex-shrink-0 border-b flex items-center justify-between gap-3 rounded-t-xl shadow-sm z-10 relative',
          collapsible
            ? 'bg-gray-100 border-gray-300 cursor-pointer hover:bg-gray-200 transition-colors'
            : 'bg-slate-100 border-slate-200/80',
        )}
        onClick={collapsible ? () => setCollapsed(true) : undefined}
      >
        <div className="flex items-center gap-2.5">
          {collapsible && <ChevronRight className="w-4 h-4 text-gray-400 rotate-90" />}
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
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              toggleAllMinimized()
            }}
            className="p-1 rounded-md hover:bg-slate-200 transition-colors text-slate-400 hover:text-slate-600"
            title={allMinimized ? 'Expandir todos' : 'Minimizar todos'}
          >
            {allMinimized ? (
              <Maximize2 className="w-3.5 h-3.5" />
            ) : (
              <Minimize2 className="w-3.5 h-3.5" />
            )}
          </button>
          <div className="bg-white text-brand-primary font-bold text-xs px-3 py-1 rounded-full shadow-sm border border-slate-200/80">
            {cards.length} {cards.length === 1 ? 'card' : 'cards'}
          </div>
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
            <KanbanCard
              key={card.id}
              card={card}
              onDragStart={handleDragStart}
              minimized={isCardMinimized(card.id)}
              onToggleMinimize={() => toggleCardMinimize(card.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}
