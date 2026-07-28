import { cn } from '@/lib/utils'

export type FilterType = 'all' | 'pending' | 'uploaded'

interface FilterTabsProps {
  active: FilterType
  onChange: (f: FilterType) => void
  counts: { all: number; pending: number; uploaded: number }
}

export function FilterTabs({ active, onChange, counts }: FilterTabsProps) {
  const tabs: { key: FilterType; label: string; count: number }[] = [
    { key: 'all', label: 'Todos', count: counts.all },
    { key: 'pending', label: 'Pendentes', count: counts.pending },
    { key: 'uploaded', label: 'Enviados', count: counts.uploaded },
  ]

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors shrink-0 min-h-[44px]',
            active === tab.key
              ? 'bg-brand-secondary text-white'
              : 'bg-brand-primary/5 text-brand-primary/60 hover:bg-brand-primary/10',
          )}
        >
          <span>{tab.label}</span>
          <span
            className={cn(
              'text-xs px-1.5 py-0.5 rounded-full font-bold min-w-[20px] text-center',
              active === tab.key ? 'bg-white/20' : 'bg-brand-primary/10',
            )}
          >
            {tab.count}
          </span>
        </button>
      ))}
    </div>
  )
}
