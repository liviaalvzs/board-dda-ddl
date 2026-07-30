import { cn } from '@/lib/utils'

export interface BarItem {
  label: string
  value: number
  subtitle?: string
  color?: string
  highlight?: boolean
}

interface BarChartProps {
  items: BarItem[]
  unit?: string
  emptyMessage?: string
}

export function BarChart({
  items,
  unit = 'dias',
  emptyMessage = 'Sem dados disponíveis',
}: BarChartProps) {
  const hasData = items.some((i) => i.value !== 0)
  if (!hasData) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-slate-400">
        {emptyMessage}
      </div>
    )
  }

  const maxVal = Math.max(...items.map((i) => Math.abs(i.value)), 1)

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const widthPct = (Math.abs(item.value) / maxVal) * 100
        const isNegative = item.value < 0
        return (
          <div key={item.label} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span
                className={cn('font-medium', item.highlight ? 'text-red-600' : 'text-slate-700')}
              >
                {item.label}
                {item.highlight && (
                  <span className="ml-2 text-xs text-red-500 font-normal">(maior tempo)</span>
                )}
              </span>
              <span className="font-semibold text-slate-900">
                {item.value} {unit}
              </span>
            </div>
            <div className="h-7 bg-slate-100 rounded-lg overflow-hidden relative">
              <div
                className={cn(
                  'h-full rounded-lg transition-all duration-700 ease-out',
                  item.color || (isNegative ? 'bg-green-500' : 'bg-brand-secondary'),
                )}
                style={{ width: `${Math.max(widthPct, 2)}%` }}
              />
            </div>
            {item.subtitle && <p className="text-xs text-slate-400">{item.subtitle}</p>}
          </div>
        )
      })}
    </div>
  )
}
