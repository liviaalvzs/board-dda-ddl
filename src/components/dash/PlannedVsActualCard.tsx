import { useMemo } from 'react'
import { Bar, BarChart, XAxis, YAxis, Cell, ReferenceLine, LabelList } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { calculateStageDelays, type StageDelayData } from '@/lib/dash-utils'
import { CHART_MAGNITUDE, CHART_POSITIVE, CHART_NEGATIVE, deviationColor } from '@/lib/chart-colors'
import { DASH_CARD_CLASS, DASH_TILE_CLASS } from '@/components/dash/dash-chrome'

const deviationConfig = {
  averageDelay: { label: 'Desvio (dias)', color: CHART_NEGATIVE },
} satisfies ChartConfig

const leadTimeConfig = {
  averageDelay: { label: 'Tempo de resposta (dias)', color: CHART_MAGNITUDE },
} satisfies ChartConfig

function StageDetail({ stage }: { stage: StageDelayData }) {
  const isDeviation = stage.kind === 'deviation'
  const value = stage.averageDelay
  const sign = value > 0 ? '+' : ''

  return (
    <div className={DASH_TILE_CLASS}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-brand-primary">{stage.label}</span>
        <span
          className="text-sm font-bold"
          style={{ color: isDeviation ? deviationColor(value) : undefined }}
        >
          {isDeviation ? `${sign}${value}d` : `${value}d`}
        </span>
      </div>
      <p className="mt-1 text-xs text-brand-primary/50">
        {stage.plannedLabel} → {stage.actualLabel}
      </p>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 text-xs text-brand-primary/50">
        <span>{stage.count} terras</span>
        <span>·</span>
        <span>mediana {stage.medianDelay}d</span>
        {isDeviation && (
          <>
            <span>·</span>
            <span style={{ color: CHART_POSITIVE }}>{stage.onTimeCount} no prazo</span>
            <span>·</span>
            <span style={{ color: CHART_NEGATIVE }}>{stage.delayedCount} atrasadas</span>
          </>
        )}
      </div>
    </div>
  )
}

export function PlannedVsActualCard({ lands }: { lands: unknown }) {
  const stages = useMemo(() => calculateStageDelays(lands), [lands])

  const deviations = stages.filter((s) => s.kind === 'deviation')
  const leadTimes = stages.filter((s) => s.kind === 'leadtime')

  const deviationChart = deviations.map((s) => ({ label: s.label, averageDelay: s.averageDelay }))
  const leadTimeChart = leadTimes.map((s) => ({ label: s.label, averageDelay: s.averageDelay }))

  const hasData = stages.some((s) => s.count > 0)

  return (
    <Card className={DASH_CARD_CLASS}>
      <CardHeader>
        <CardTitle className="font-display text-lg font-light text-brand-primary">
          Previsto × Realizado
        </CardTitle>
        <CardDescription className="text-brand-primary/55">
          Comparação entre as datas informadas no board. Diligência (DDL) e DDA têm data estimada de
          recebimento, então a diferença é desvio de prazo: negativo quer dizer concluído antes do
          previsto.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!hasData ? (
          <div className="flex h-[200px] items-center justify-center rounded-xl border border-dashed border-brand-primary/15 text-sm text-brand-primary/50">
            Nenhuma terra com as duas datas preenchidas.
          </div>
        ) : (
          <>
            <section className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-brand-primary">
                  Desvio do prazo estimado
                </h3>
                <p className="text-xs text-brand-primary/50">
                  Negativo = concluído antes do estimado · positivo = depois
                </p>
              </div>
              <ChartContainer config={deviationConfig} className="h-[120px] w-full">
                <BarChart
                  data={deviationChart}
                  layout="vertical"
                  margin={{ left: 10, right: 44, top: 4, bottom: 4 }}
                >
                  <XAxis type="number" tickFormatter={(v) => `${v}d`} fontSize={12} />
                  <YAxis type="category" dataKey="label" width={120} fontSize={12} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ReferenceLine x={0} stroke="hsl(var(--border))" />
                  {/* Radius simétrico de propósito: aqui a barra cresce para os
                      dois lados do zero, então não há uma "ponta" fixa que o
                      arredondamento possa seguir. */}
                  <Bar dataKey="averageDelay" radius={4} barSize={18}>
                    {deviationChart.map((d, i) => (
                      <Cell key={i} fill={deviationColor(d.averageDelay)} />
                    ))}
                    <LabelList
                      dataKey="averageDelay"
                      position="right"
                      className="fill-foreground"
                      fontSize={12}
                      formatter={(v: number) => `${v > 0 ? '+' : ''}${v}d`}
                    />
                  </Bar>
                </BarChart>
              </ChartContainer>
              <div className="grid gap-2 sm:grid-cols-2">
                {deviations.map((s) => (
                  <StageDetail key={s.label} stage={s} />
                ))}
              </div>
            </section>

            {leadTimes.length > 0 && (
              <section className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-brand-primary">Tempo de resposta</h3>
                  <p className="text-xs text-brand-primary/50">
                    Dias entre o pedido e o recebimento — quanto menor, melhor
                  </p>
                </div>{' '}
                <ChartContainer config={leadTimeConfig} className="h-[120px] w-full">
                  <BarChart
                    data={leadTimeChart}
                    layout="vertical"
                    margin={{ left: 10, right: 44, top: 4, bottom: 4 }}
                  >
                    <XAxis type="number" tickFormatter={(v) => `${v}d`} fontSize={12} />
                    <YAxis type="category" dataKey="label" width={120} fontSize={12} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar
                      dataKey="averageDelay"
                      fill={CHART_MAGNITUDE}
                      radius={[0, 4, 4, 0]}
                      barSize={18}
                    >
                      <LabelList
                        dataKey="averageDelay"
                        position="right"
                        className="fill-foreground"
                        fontSize={12}
                        formatter={(v: number) => `${v}d`}
                      />
                    </Bar>
                  </BarChart>
                </ChartContainer>
                <div className="grid gap-2 sm:grid-cols-2">
                  {leadTimes.map((s) => (
                    <StageDetail key={s.label} stage={s} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
