import { getStageColor } from '@/lib/map-utils'

interface MapLegendProps {
  stages: string[]
}

export function MapLegend({ stages }: MapLegendProps) {
  if (stages.length === 0) return null

  return (
    <div className="absolute top-4 right-4 z-[1000] bg-white rounded-xl shadow-lg border border-brand-primary/10 p-4 w-[220px] animate-fade-in-up">
      <div className="flex items-center gap-2 pb-2 border-b border-brand-primary/10 mb-3">
        <span className="text-sm font-bold text-brand-primary">Legenda</span>
      </div>
      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {stages.map((stage) => (
          <div key={stage} className="flex items-center gap-2.5">
            <div
              className="w-3 h-3 rounded-full shrink-0 border border-white shadow-sm"
              style={{ backgroundColor: getStageColor(stage) }}
            />
            <span className="text-xs font-medium text-brand-primary/80 truncate">{stage}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
