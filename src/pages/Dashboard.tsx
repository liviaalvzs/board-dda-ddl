import { useState, useEffect, useMemo } from 'react'
import { Bar, BarChart, XAxis, YAxis, Cell } from 'recharts'
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
import { calculateStageDelays, calculateStageDurations } from '@/lib/dash-utils'
import { AlertTriangle, CheckCircle2, Layers } from 'lucide-react'

const delayConfig = {
  averageDelay: { label: 'Atraso (dias)', color: 'hsl(var(--chart-1))' },
} satisfies ChartConfig

const durConfig = {
  averageDuration: { label: 'Tempo (dias)', color: 'hsl(var(--chart-2))' },
} satisfies ChartConfig

function delayColor(d: number): string {
  if (d <= 0) return 'hsl(142 71% 45%)'
  if (d <= 7) return 'hsl(38 92% 50%)'
  return 'hsl(0 84% 60%)'
}

export default function Dashboard() {
  const [lands, setLands] = useState<Record<string, any>[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      setLands(await fetchAllLandMetadata())
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])
  useRealtime('land_metadata', () => {
    loadData()
  })

  const delays = useMemo(() => calculateStageDelays(lands), [lands])
  const durations = useMemo(() => calculateStageDurations(lands), [lands])

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    )
  }

  const delayChart = delays.map((d) => ({
    label: d.label,
    averageDelay: Math.max(0, d.averageDelay),
  }))
  const durChart = durations.map((d) => ({
    label: d.label,
    averageDuration: d.averageDuration,
  }))

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral das diligências</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Terras</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lands.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Com Atraso</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {delays.reduce((s, d) => s + d.delayedCount, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">No Prazo</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {delays.reduce((s, d) => s + d.onTimeCount, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Atraso por Etapa</CardTitle>
          <CardDescription>Diferença média em dias entre data prevista e realizada</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={delayConfig} className="h-[220px] w-full">
            <BarChart
              data={delayChart}
              layout="vertical"
              margin={{ left: 10, right: 30, top: 5, bottom: 5 }}
            >
              <XAxis type="number" tickFormatter={(v) => `${v}d`} fontSize={12} />
              <YAxis type="category" dataKey="label" width={90} fontSize={12} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="averageDelay" radius={4} cursor={{ fillOpacity: 0.1 }}>
                {delayChart.map((_, i) => (
                  <Cell key={i} fill={delayColor(delays[i].averageDelay)} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {delays.map((s) => (
              <div key={s.label} className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{s.label}</span>
                  <span
                    className={`text-sm font-bold ${
                      s.averageDelay > 0 ? 'text-red-600' : 'text-green-600'
                    }`}
                  >
                    {s.averageDelay > 0 ? `+${s.averageDelay}d` : `${s.averageDelay}d`}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{s.count} terras</span>
                  <span>·</span>
                  <span className="text-green-600">{s.onTimeCount} no prazo</span>
                  <span>·</span>
                  <span className="text-red-600">{s.delayedCount} atrasadas</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tempo por Etapa</CardTitle>
          <CardDescription>
            Tempo médio em dias desde a assinatura da carta proposta até a realização
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={durConfig} className="h-[220px] w-full">
            <BarChart
              data={durChart}
              layout="vertical"
              margin={{ left: 10, right: 30, top: 5, bottom: 5 }}
            >
              <XAxis type="number" tickFormatter={(v) => `${v}d`} fontSize={12} />
              <YAxis type="category" dataKey="label" width={90} fontSize={12} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey="averageDuration"
                fill="hsl(var(--chart-2))"
                radius={4}
                cursor={{ fillOpacity: 0.1 }}
              />
            </BarChart>
          </ChartContainer>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {durations.map((s) => (
              <div key={s.label} className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{s.label}</span>
                  <span className="text-sm font-bold">{s.averageDuration}d</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{s.count} terras avaliadas</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
