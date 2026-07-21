import { useState, useEffect } from 'react'
import { Settings as SettingsIcon, Save, Loader2, Clock, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { getDelayedThresholdDays, updateSetting } from '@/services/app-settings'

export default function Settings() {
  const [threshold, setThreshold] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const { toast } = useToast()

  useEffect(() => {
    getDelayedThresholdDays()
      .then((days) => {
        setThreshold(String(days))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    const num = Number(threshold)
    if (isNaN(num) || num <= 0 || !Number.isInteger(num)) {
      setError('O valor deve ser um número inteiro positivo.')
      return
    }
    setError('')
    setSaving(true)
    try {
      await updateSetting('delayed_threshold_days', String(num))
      toast({ title: 'Configuração salva com sucesso!' })
    } catch {
      toast({ title: 'Erro ao salvar configuração', variant: 'destructive' })
    } finally {
      setSaving(false)
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
      <div className="max-w-2xl mx-auto space-y-6">
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
              Limite de Atraso
            </CardTitle>
            <CardDescription>
              Configure o número de dias para que uma terra seja marcada como &quot;atrasada&quot;
              com base na última atualização.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="threshold">
                Dias para terra ser considerada &quot;atrasada&quot;
              </Label>
              <Input
                id="threshold"
                type="number"
                min="1"
                step="1"
                placeholder="30"
                value={threshold}
                onChange={(e) => {
                  setThreshold(e.target.value)
                  setError('')
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                className={error ? 'border-rose-500 focus-visible:ring-rose-500' : ''}
              />
              {error && (
                <p className="text-sm text-rose-500 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {error}
                </p>
              )}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                Terras que não forem atualizadas por mais de {threshold || '0'} dias serão
                automaticamente marcadas com o status &quot;Atrasada&quot; no board.
              </p>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleSave}
                disabled={saving || !threshold}
                className="bg-brand-secondary hover:bg-brand-secondary/90"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar
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
