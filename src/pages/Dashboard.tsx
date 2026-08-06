import { useState, useEffect, useMemo } from 'react'
import { Bar, BarChart, XAxis, YAxis, LabelList } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { fetchAllLandMetadata } from '@/services/lands'
import { useRealtime } from '@/hooks/use-realtime'
import {
  calculateStageDelays,
  calculateStageAverageTime,
  calculateStatusDistribution,
} from '@/lib/dash-utils'
import { AlertTriangle, CheckCircle2, Layers, Timer } from 'lucide-react'
import { StageTimeChart } from '@/components/dash/StageTimeChart'
import { PlannedVsActualCard } from '@/components/dash/PlannedVsActualCard'
import { StageRankingTable } from '@/components/dash/StageRankingTable'
import { CHART_MAGNITUDE, CHART_POSITIVE, CHART_NEGATIVE } from '@/lib/chart-colors'

const statusConfig = {
  count: { label: 'Terras', color: CHART_MAGNITUDE },
} satisfies ChartConfig

function KpiCard({
  title,
  value,
  hint,
  icon: Icon,
  valueColor,
}: {
  title: string
  value: string | number
  hint?: string
  icon: React.ComponentType<{ className?: string }>
  valueColor?: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" style={valueColor ? { color: valueColor } : undefined}>
          {value}
        </div>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  )
}

export default function Dashboard() {
  const [lands, setLands] = useState<Record<string, any>[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      // O tempo por etapa vem de land_metadata.stage_dates — mesma fonte do card
      // do board, e editável na tela da terra.
      const metadata = await fetchAllLandMetadata()
      setLands(Array.from(metadata.values()))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])
  useRealtime('land_metadata', () => loadData())

  const delays = useMemo(() => calculateStageDelays(lands), [lands])
  const statusDist = useMemo(() => calculateStatusDistribution(lands), [lands])
  const stageTimes = useMemo(() => calculateStageAverageTime(lands), [lands])

  const kpis = useMemo(() => {
    const inProgress = lands.filter((l) => (l.status || '').trim()).length
    // O indicador de prazo usa só as etapas com data estimada de conclusão —
    // as de tempo de resposta não têm "prazo" contra o qual comparar.
    const deviationStages = delays.filter((d) => d.kind === 'deviation')
    const evaluated = deviationStages.reduce((s, d) => s + d.count, 0)
    const onTime = deviationStages.reduce((s, d) => s + d.onTimeCount, 0)
    const onTimeRate = evaluated > 0 ? Math.round((onTime / evaluated) * 100) : null
    const avgStageDays = stageTimes.length
      ? Math.round((stageTimes.reduce((s, d) => s + d.averageDays, 0) / stageTimes.length) * 10) /
        10
      : 0
    return { inProgress, evaluated, onTime, onTimeRate, avgStageDays }
  }, [lands, delays, stageTimes])

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    )
  }

  const statusChart = statusDist.map((s) => ({ label: s.label, count: s.count }))

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6">
      <div className="mx-auto max-w-6xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Visão geral das diligências</p>
        </div>

        {/* Panorama */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Panorama
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard title="Total de terras" value={lands.length} icon={Layers} />
            <KpiCard
              title="No board"
              value={kpis.inProgress}
              hint="Terras com etapa atribuída"
              icon={Layers}
            />
            <KpiCard
              title="Tempo médio por etapa"
              value={`${kpis.avgStageDays}d`}
              hint="Média entre as etapas"
              icon={Timer}
            />
            {kpis.onTimeRate === null ? (
              <KpiCard
                title="Dentro do prazo"
                value="—"
                hint="Sem datas estimadas preenchidas"
                icon={AlertTriangle}
              />
            ) : (
              <KpiCard
                title="Dentro do prazo"
                value={`${kpis.onTimeRate}%`}
                hint={`${kpis.onTime} de ${kpis.evaluated} com data estimada`}
                icon={kpis.onTimeRate >= 50 ? CheckCircle2 : AlertTriangle}
                valueColor={kpis.onTimeRate >= 50 ? CHART_POSITIVE : CHART_NEGATIVE}
              />
            )}
          </div>
        </section>

        {/* Tempo */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Tempo no processo
          </h2>
          <StageTimeChart lands={lands} />
          <StageRankingTable lands={lands} />
        </section>

        {/* Prazos */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Prazos
          </h2>
          <PlannedVsActualCard lands={lands} />
        </section>

        {/* Distribuição */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Distribuição
          </h2>
          <Card>
            <CardHeader>
              <CardTitle>Terras por etapa</CardTitle>
              <CardDescription>Quantas terras estão em cada coluna do board</CardDescription>
            </CardHeader>
            <CardContent>
              {statusChart.length === 0 ? (
                <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                  Sem dados de etapa disponíveis
                </div>
              ) : (
                <ChartContainer config={statusConfig} className="h-[280px] w-full">
                  <BarChart
                    data={statusChart}
                    layout="vertical"
                    margin={{ left: 10, right: 40, top: 4, bottom: 4 }}
                  >
                    <XAxis type="number" allowDecimals={false} fontSize={12} />
                    <YAxis
                      type="category"
                      dataKey="label"
                      width={180}
                      fontSize={12}
                      tickFormatter={(v: string) => (v.length > 28 ? v.slice(0, 28) + '…' : v)}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill={CHART_MAGNITUDE} radius={4} barSize={18}>
                      <LabelList
                        dataKey="count"
                        position="right"
                        className="fill-foreground"
                        fontSize={12}
                      />
                    </Bar>
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}
