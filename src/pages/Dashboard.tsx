import { useState, useEffect, useMemo } from 'react'
import { differenceInDays } from 'date-fns'
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
import { useDelayedThreshold } from '@/hooks/use-delayed-threshold'
import { getCurrentStageEntry } from '@/lib/stage-dates-helpers'
import {
  calculateStageDelays,
  calculateStageAverageTime,
  calculateStatusDistribution,
} from '@/lib/dash-utils'
import { AlertTriangle, AlertOctagon, CheckCircle2, Layers, Timer } from 'lucide-react'
import { StageTimeChart } from '@/components/dash/StageTimeChart'
import { PlannedVsActualCard } from '@/components/dash/PlannedVsActualCard'
import { StageRankingTable } from '@/components/dash/StageRankingTable'
import { CHART_MAGNITUDE, CHART_POSITIVE, CHART_NEGATIVE } from '@/lib/chart-colors'
import { DASH_CARD_CLASS, DashSection } from '@/components/dash/dash-chrome'

const statusConfig = {
  count: { label: 'Terras', color: CHART_MAGNITUDE },
} satisfies ChartConfig

/**
 * Stat tile: rótulo, valor e uma dica de contexto. O valor usa a display da
 * marca com figuras proporcionais — `tabular-nums` fica reservado às colunas
 * de número que precisam alinhar na vertical (ver a tabela de ranking).
 */
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
    <Card className={DASH_CARD_CLASS}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-brand-primary/50">
            {title}
          </span>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-secondary/10">
            <Icon className="h-4 w-4 text-brand-primary" />
          </span>
        </div>
        <div
          className="mt-4 font-display text-[34px] font-light leading-none text-brand-primary"
          style={valueColor ? { color: valueColor } : undefined}
        >
          {value}
        </div>
        {hint && <p className="mt-2 text-xs leading-relaxed text-brand-primary/50">{hint}</p>}
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

  // Mesma regra de urgência do card do board (badges ATRASADO/ATENÇÃO), só que
  // somada — para responder "quantas terras precisam de atenção agora" sem
  // abrir o board e contar card por card.
  const { threshold: delayedThreshold } = useDelayedThreshold()
  const attentionThreshold = Math.max(1, Math.floor(delayedThreshold / 2))
  const urgency = useMemo(() => {
    const now = new Date()
    let delayed = 0
    let attention = 0
    for (const land of lands) {
      const status = (land.status || '').trim()
      if (!status) continue
      const entry = getCurrentStageEntry(land.stage_dates, status)
      if (!entry) continue
      const days = differenceInDays(now, entry)
      if (days < 0) continue
      if (days > delayedThreshold) delayed++
      else if (days > attentionThreshold) attention++
    }
    return { delayed, attention }
  }, [lands, delayedThreshold, attentionThreshold])

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
      <div className="h-full overflow-y-auto bg-white p-4 md:p-6">
        <div className="mx-auto max-w-6xl space-y-8">
          <Skeleton className="h-9 w-48 rounded-xl" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </div>
    )
  }

  const statusChart = statusDist.map((s) => ({ label: s.label, count: s.count }))

  return (
    <div className="h-full overflow-y-auto bg-white p-4 md:p-6">
      <div className="mx-auto max-w-6xl space-y-10">
        <div>
          <h1 className="font-display text-[32px] font-light leading-tight text-brand-primary">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-brand-primary/60">
            Visão geral das diligências em andamento
          </p>
        </div>

        {/* Panorama */}
        <DashSection title="Panorama" description="Os números do processo hoje">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              title="No board"
              value={kpis.inProgress}
              hint="Terras com etapa atribuída"
              icon={Layers}
            />
            <KpiCard
              title="Terras atrasadas"
              value={urgency.delayed}
              hint={`${urgency.attention} em atenção · limite ${delayedThreshold}d na etapa`}
              icon={AlertOctagon}
              valueColor={urgency.delayed > 0 ? CHART_NEGATIVE : CHART_POSITIVE}
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
        </DashSection>

        {/* Tempo */}
        <DashSection
          title="Tempo no processo"
          description="Quanto tempo as terras levam em cada etapa"
        >
          <StageTimeChart lands={lands} />
          <StageRankingTable lands={lands} />
        </DashSection>

        {/* Prazos */}
        <DashSection title="Prazos" description="O previsto contra o que aconteceu">
          <PlannedVsActualCard lands={lands} />
        </DashSection>

        {/* Distribuição */}
        <DashSection title="Distribuição" description="Onde as terras estão paradas">
          <Card className={DASH_CARD_CLASS}>
            <CardHeader>
              <CardTitle className="font-display text-lg font-light text-brand-primary">
                Terras por etapa
              </CardTitle>
              <CardDescription className="text-brand-primary/55">
                Quantas terras estão em cada coluna do board
              </CardDescription>
            </CardHeader>
            <CardContent>
              {statusChart.length === 0 ? (
                <div className="flex h-[280px] items-center justify-center rounded-xl border border-dashed border-brand-primary/15 text-sm text-brand-primary/50">
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
                    {/* Canto arredondado só na ponta do dado; a base fica reta
                        sobre a linha de origem. */}
                    <Bar dataKey="count" fill={CHART_MAGNITUDE} radius={[0, 4, 4, 0]} barSize={18}>
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
        </DashSection>
      </div>
    </div>
  )
}
