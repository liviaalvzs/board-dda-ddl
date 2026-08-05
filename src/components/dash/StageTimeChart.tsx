import { useMemo } from 'react'
import { Bar, BarChart, XAxis, YAxis, LabelList } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Info } from 'lucide-react'
import { calculateStageAverageTime } from '@/lib/dash-utils'
import { getKanbanColumnColor } from '@/lib/kanban-columns'
import { CHART_MAGNITUDE } from '@/lib/chart-colors'

const config = {
  averageDays: { label: 'Tempo médio (dias)', color: CHART_MAGNITUDE },
} satisfies ChartConfig

interface StageTimeChartProps {
  lands: unknown
  historyLogs: unknown
}

export function StageTimeChart({ lands, historyLogs }: StageTimeChartProps) {
  const stages = useMemo(() => calculateStageAverageTime(lands, historyLogs), [lands, historyLogs])

  const hasClosedSpans = stages.some((s) => s.closedCount > 0)
  const chartData = stages.map((s) => ({
    label: s.label,
    averageDays: s.averageDays,
    status: s.status,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tempo médio por etapa</CardTitle>
        <CardDescription>
          Dias que uma terra permanece em cada coluna do board, considerando períodos já encerrados
          e o tempo corrente na etapa atual
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {chartData.length === 0 ? (
          <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
            Sem dados de etapa registrados.
          </div>
        ) : (
          <ChartContainer config={config} className="h-[280px] w-full">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ left: 10, right: 44, top: 4, bottom: 4 }}
            >
              <XAxis type="number" tickFormatter={(v) => `${v}d`} fontSize={12} />
              <YAxis
                type="category"
                dataKey="label"
                width={180}
                fontSize={12}
                tickFormatter={(v: string) => (v.length > 28 ? v.slice(0, 28) + '…' : v)}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="averageDays" fill={CHART_MAGNITUDE} radius={4} barSize={18}>
                {/* Rótulo direto: também é o alívio exigido pelo aviso de
                    contraste desta cor no modo escuro. */}
                <LabelList
                  dataKey="averageDays"
                  position="right"
                  className="fill-foreground"
                  fontSize={12}
                  formatter={(v: number) => `${v}d`}
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        )}

        {stages.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {stages.map((s) => (
              <div key={s.status} className="rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: getKanbanColumnColor(s.status) || '#94a3b8' }}
                  />
                  <span className="truncate text-sm font-medium" title={s.label}>
                    {s.label}
                  </span>
                  <span className="ml-auto text-sm font-bold">{s.averageDays}d</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {s.closedCount}{' '}
                  {s.closedCount === 1 ? 'passagem concluída' : 'passagens concluídas'}
                  {s.openCount > 0 && ` · ${s.openCount} em curso`}
                </p>
              </div>
            ))}
          </div>
        )}

        {!hasClosedSpans && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-xs text-amber-800">
              O registro de mudanças de etapa começou agora, então ainda não há passagens
              concluídas. Os valores acima refletem apenas o tempo corrente na etapa atual e vão
              ficar precisos conforme as terras avançarem no board.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
