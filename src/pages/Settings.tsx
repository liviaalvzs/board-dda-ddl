import { useState, useEffect } from 'react'
import { Settings as SettingsIcon, Save, Loader2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import {
  getStageThresholds,
  updateStageThresholds,
  type StageThreshold,
} from '@/services/app-settings'
import { invalidateThresholdCache } from '@/hooks/use-delayed-threshold'
import { KANBAN_COLUMNS } from '@/lib/kanban-columns'

export default function Settings() {
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const [stageThresholds, setStageThresholds] = useState<Record<string, StageThreshold>>({})
  const [savingStages, setSavingStages] = useState(false)
  useEffect(() => {
    getStageThresholds()
      .then((stages) => {
        setStageThresholds(stages)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const getStageValue = (stageId: string, field: 'attention' | 'delayed'): string => {
    const t = stageThresholds[stageId]
    if (!t) return ''
    return String(t[field] || '')
  }

  const setStageValue = (stageId: string, field: 'attention' | 'delayed', value: string) => {
    const num = parseInt(value, 10)
    const current = stageThresholds[stageId] || { attention: 0, delayed: 0 }
    setStageThresholds({
      ...stageThresholds,
      [stageId]: { ...current, [field]: isNaN(num) ? 0 : num },
    })
  }

  const handleSaveStageThresholds = async () => {
    const cleaned: Record<string, StageThreshold> = {}
    for (const col of KANBAN_COLUMNS) {
      const t = stageThresholds[col.id]
      if (t && (t.attention > 0 || t.delayed > 0)) {
        cleaned[col.id] = {
          attention: Math.max(0, t.attention || 0),
          delayed: Math.max(0, t.delayed || 0),
        }
      }
    }
    setSavingStages(true)
    try {
      await updateStageThresholds(cleaned)
      invalidateThresholdCache()
      toast({ title: 'Limites por etapa salvos com sucesso!' })
    } catch {
      toast({ title: 'Erro ao salvar limites por etapa', variant: 'destructive' })
    } finally {
      setSavingStages(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-brand-secondary" />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-primary flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-brand-secondary" />
            Configurações
          </h1>
          <p className="text-sm text-brand-primary/60">
            Defina os parâmetros do sistema de controle de terras.
          </p>
        </div>

        <Card className="border-brand-primary/10 shadow-sm">
          <CardHeader>
            <CardTitle className="text-brand-primary flex items-center gap-2">
              <Clock className="w-5 h-5 text-brand-secondary" />
              Limites por Etapa
            </CardTitle>
            <CardDescription>
              Configure os dias para &quot;atenção&quot; (amarelo) e &quot;atrasado&quot; (vermelho)
              em cada etapa do kanban. Deixe em branco para usar o padrão.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-[1fr_90px_90px] gap-2 text-xs font-bold text-brand-primary/60 uppercase tracking-wider px-1 pb-1 border-b">
              <span>Etapa</span>
              <span className="text-center text-amber-600">Atenção</span>
              <span className="text-center text-rose-600">Atraso</span>
            </div>
            {KANBAN_COLUMNS.map((col) => (
              <div
                key={col.id}
                className="grid grid-cols-[1fr_90px_90px] gap-2 items-center py-1.5 px-1 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <span className="text-sm font-medium text-slate-700 truncate" title={col.title}>
                  {col.title}
                </span>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="3"
                  value={getStageValue(col.id, 'attention')}
                  onChange={(e) => setStageValue(col.id, 'attention', e.target.value)}
                  className="h-8 text-center text-sm"
                />
                <Input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="7"
                  value={getStageValue(col.id, 'delayed')}
                  onChange={(e) => setStageValue(col.id, 'delayed', e.target.value)}
                  className="h-8 text-center text-sm"
                />
              </div>
            ))}
            <div className="flex justify-end pt-3">
              <Button
                onClick={handleSaveStageThresholds}
                disabled={savingStages}
                className="bg-brand-secondary hover:bg-brand-secondary/90"
              >
                {savingStages ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" /> Salvar Limites
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
