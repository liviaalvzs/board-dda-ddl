import { useState, useEffect, useMemo } from 'react'
import { Loader2, AlertCircle, Clock, TrendingDown, Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { BarChart, type BarItem } from '@/components/dash/BarChart'
import { useRealtime } from '@/hooks/use-realtime'
import pb from '@/lib/pocketbase/client'
import {
  calculateStageDurations,
  calculateStageDelays,
  calculateLandDelays,
  getDelayBadgeClass,
} from '@/lib/dash-utils'

export default function Dashboard() {
  const [records, setRecords] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  const loadData = async (silent = false) => {
    if (!silent) setIsLoading(true)
    setHasError(false)
    try {
      const data = await pb.collection('land_metadata').getFullList()
      setRecords(data)
    } catch (err) {
      console.error('Dashboard fetch error:', err)
      setHasError(true)
    } finally {
      if (!silent) setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('land_metadata', () => {
    loadData(true)
  })

  const stageDurations = useMemo(() => calculateStageDurations(records), [records])
  const stageDelays = useMemo(() => calculateStageDelays(records), [records])
  const landDelays = useMemo(() => calculateLandDelays(records), [records])

  const maxDuration = useMemo(() => {
    const eligible = stageDurations.filter((s) => s.eligibleCount > 0)
    if (!eligible.length) return null
    return eligible.reduce((m, s) => (s.avgDuration > m.avgDuration ? s : m))
  }, [stageDurations])

  const durationBars: BarItem[] = stageDurations.map((s) => ({
    label: s.stageLabel,
    value: s.avgDuration,
    subtitle: `${s.eligibleCount} propriedade(s) elegível(is)`,
    highlight: maxDuration?.stageId === s.stageId,
    color: maxDuration?.stageId === s.stageId ? 'bg-red-500' : 'bg-brand-secondary',
  }))

  const delayBars: BarItem[] = stageDelays
    .filter((s) => s.hasDelayData)
    .map((s) => ({
      label: s.stageLabel,
      value: s.avgDelay,
      subtitle: `${s.eligibleCount} propriedade(s)`,
      color: s.avgDelay <= 0 ? 'bg-green-500' : s.avgDelay <= 7 ? 'bg-amber-500' : 'bg-red-500',
    }))

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-secondary" />
      </div>
    )
  }

  if (hasError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
        <AlertCircle className="w-12 h-12 text-rose-400 mb-4" />
        <p className="text-slate-600 mb-4">Erro ao carregar dados do dashboard.</p>
        <Button onClick={() => loadData()}>Recarregar</Button>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto bg-slate-50 p-4 md:p-6">
      <Breadcrumb className="mb-3">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/" className="text-slate-500">
              Home
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="font-semibold text-brand-primary">Dashboard</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-6">
        Dashboard de Tempo e Atraso
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-brand-primary">
              <Clock className="w-5 h-5 text-brand-secondary" />
              Tempo por Etapa
            </CardTitle>
            <CardDescription>Duração média (em dias) por etapa do processo</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChart
              items={durationBars}
              unit="dias"
              emptyMessage="Nenhuma propriedade com datas completas."
            />
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-brand-primary">
              <TrendingDown className="w-5 h-5 text-brand-secondary" />
              Análise de Atrasos
            </CardTitle>
            <CardDescription>Atraso médio entre data prevista e realizada</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChart
              items={delayBars}
              unit="dias"
              emptyMessage="Sem dados de atraso disponíveis."
            />

            <div className="mt-4 flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">
                Atrasos são calculados apenas para <strong>DD Conclusiva</strong>, que possui data
                prevista e realizada. Outras etapas não têm campo de data estimada no schema atual.
              </p>
            </div>

            {landDelays.length > 0 && (
              <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                <h4 className="text-sm font-semibold text-slate-700">Atrasos por Propriedade</h4>
                {landDelays.slice(0, 15).map((land) => (
                  <div
                    key={land.landId}
                    className="flex items-center justify-between py-2 px-3 bg-white rounded-lg border border-slate-100"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-700 truncate">{land.landName}</p>
                      {land.clusterSerial && (
                        <p className="text-xs text-slate-400">{land.clusterSerial}</p>
                      )}
                    </div>
                    <Badge className={`shrink-0 ml-2 ${getDelayBadgeClass(land.delayDays)}`}>
                      {land.delayDays > 0 ? `+${land.delayDays} dias` : `${land.delayDays} dias`}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
