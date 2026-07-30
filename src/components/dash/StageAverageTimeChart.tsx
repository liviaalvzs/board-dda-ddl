import { useMemo } from 'react'
import { Bar, BarChart, XAxis, YAxis, Cell } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { calculateStageAverageTime } from '@/lib/dash-utils'
import { getKanbanColumnColor } from '@/lib/kanban-columns'

const stageAvgConfig = {
  averageDays: { label: 'Tempo médio (dias)', color: 'hsl(var(--chart-2))' },
} satisfies ChartConfig

export function StageAverageTimeChart({ lands }: { lands: unknown }) {
  const stageAvg = useMemo(() => calculateStageAverageTime(lands), [lands])

  const chartData = stageAvg.map((s) => ({
    label: s.label,
    averageDays: s.averageDays,
    status: s.status,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>⏱️ Tempo médio por etapa do Kanban</CardTitle>
        <CardDescription>
          Tempo médio (em dias) que as terras permanecem em cada etapa do board
        </CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
            Sem dados
          </div>
        ) : (
          <ChartContainer config={stageAvgConfig} className="h-[300px] w-full">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ left: 10, right: 30, top: 5, bottom: 5 }}
            >
              <XAxis type="number" tickFormatter={(v) => `${v}d`} fontSize={12} />
              <YAxis
                type="category"
                dataKey="label"
                width={180}
                fontSize={12}
                tickFormatter={(value: string) =>
                  value.length > 28 ? value.slice(0, 28) + '…' : value
                }
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="averageDays" radius={4} cursor={{ fillOpacity: 0.1 }}>
                {chartData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={getKanbanColumnColor(entry.status) || 'hsl(var(--chart-2))'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
        {stageAvg.length > 0 && (
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            {stageAvg.map((s) => (
              <div key={s.status} className="rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{
                      backgroundColor: getKanbanColumnColor(s.status) || '#94a3b8',
                    }}
                  />
                  <span className="truncate text-sm font-medium" title={s.label}>
                    {s.label}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{s.count} terras</span>
                  <span className="font-bold text-foreground">{s.averageDays}d</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
