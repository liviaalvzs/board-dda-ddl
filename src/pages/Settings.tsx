import { useState, useEffect } from 'react'
import {
  Settings as SettingsIcon,
  Save,
  Loader2,
  Clock,
  AlertTriangle,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import {
  getDelayedThresholdDays,
  updateSetting,
  getStageThresholds,
  updateStageThresholds,
  type StageThreshold,
} from '@/services/app-settings'
import { invalidateThresholdCache } from '@/hooks/use-delayed-threshold'
import { KANBAN_COLUMNS } from '@/lib/kanban-columns'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { extractFieldErrors, type FieldErrors } from '@/lib/pocketbase/errors'
import { UsersSection } from '@/components/settings/UsersSection'

export default function Settings() {
  const [threshold, setThreshold] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const { toast } = useToast()
  const { user } = useAuth()

  const [stageThresholds, setStageThresholds] = useState<Record<string, StageThreshold>>({})
  const [savingStages, setSavingStages] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordErrors, setPasswordErrors] = useState<FieldErrors>({})
  const [passwordFormError, setPasswordFormError] = useState('')

  useEffect(() => {
    Promise.all([getDelayedThresholdDays(), getStageThresholds()])
      .then(([days, stages]) => {
        setThreshold(String(days))
        setStageThresholds(stages)
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
      invalidateThresholdCache()
      toast({ title: 'Configuração salva com sucesso!' })
    } catch {
      toast({ title: 'Erro ao salvar configuração', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

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

  const validatePasswordForm = (): boolean => {
    const errors: FieldErrors = {}
    if (!currentPassword) {
      errors.oldPassword = 'Informe sua senha atual.'
    }
    if (!newPassword) {
      errors.password = 'Informe a nova senha.'
    } else if (newPassword.length < 8) {
      errors.password = 'A nova senha deve ter no mínimo 8 caracteres.'
    }
    if (!confirmPassword) {
      errors.passwordConfirm = 'Confirme a nova senha.'
    } else if (newPassword !== confirmPassword) {
      errors.passwordConfirm = 'As senhas não coincidem.'
    }
    setPasswordErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleChangePassword = async () => {
    setPasswordFormError('')
    setPasswordErrors({})

    if (!validatePasswordForm()) return
    if (!user?.id) return

    setSavingPassword(true)
    try {
      await pb.collection('users').update(user.id, {
        oldPassword: currentPassword,
        password: newPassword,
        passwordConfirm: confirmPassword,
      })
      toast({ title: 'Senha alterada com sucesso.' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      const fieldErrors = extractFieldErrors(err)
      if (fieldErrors.oldPassword) {
        setPasswordFormError('Senha atual incorreta.')
      } else if (Object.keys(fieldErrors).length > 0) {
        setPasswordErrors(fieldErrors)
      } else {
        setPasswordFormError('Erro ao alterar senha, tente novamente.')
      }
    } finally {
      setSavingPassword(false)
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
              Limite Padrão de Atraso
            </CardTitle>
            <CardDescription>
              Dias padrão para etapas sem configuração individual abaixo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="space-y-1 flex-1">
                <Label htmlFor="threshold">Dias para &quot;atrasada&quot; (padrão)</Label>
                <Input
                  id="threshold"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="7"
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
                    <AlertTriangle className="w-3.5 h-3.5" /> {error}
                  </p>
                )}
              </div>
              <Button
                onClick={handleSave}
                disabled={saving || !threshold}
                className="bg-brand-secondary hover:bg-brand-secondary/90 mt-5"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

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
                  placeholder={String(Math.max(1, Math.floor(Number(threshold || 7) / 2)))}
                  value={getStageValue(col.id, 'attention')}
                  onChange={(e) => setStageValue(col.id, 'attention', e.target.value)}
                  className="h-8 text-center text-sm"
                />
                <Input
                  type="number"
                  min="0"
                  step="1"
                  placeholder={threshold || '7'}
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

        <UsersSection />

        <Card className="border-brand-primary/10 shadow-sm">
          <CardHeader>
            <CardTitle className="text-brand-primary flex items-center gap-2">
              <Lock className="w-5 h-5 text-brand-secondary" />
              Alterar Senha
            </CardTitle>
            <CardDescription>
              Atualize sua senha de acesso. A nova senha deve ter no mínimo 8 caracteres.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {passwordFormError && (
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <p className="text-sm text-rose-700">{passwordFormError}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="currentPassword">Senha Atual</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-primary/40" />
                <Input
                  id="currentPassword"
                  type={showCurrent ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value)
                    setPasswordErrors((prev) => ({ ...prev, oldPassword: '' }))
                    setPasswordFormError('')
                  }}
                  className={`pl-9 pr-9 ${passwordErrors.oldPassword ? 'border-rose-500 focus-visible:ring-rose-500' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-primary/40 hover:text-brand-primary/60 transition-colors"
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passwordErrors.oldPassword && (
                <p className="text-sm text-rose-500">{passwordErrors.oldPassword}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-primary/40" />
                <Input
                  id="newPassword"
                  type={showNew ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value)
                    setPasswordErrors((prev) => ({ ...prev, password: '' }))
                    setPasswordFormError('')
                  }}
                  className={`pl-9 pr-9 ${passwordErrors.password ? 'border-rose-500 focus-visible:ring-rose-500' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-primary/40 hover:text-brand-primary/60 transition-colors"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passwordErrors.password && (
                <p className="text-sm text-rose-500">{passwordErrors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-primary/40" />
                <Input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value)
                    setPasswordErrors((prev) => ({ ...prev, passwordConfirm: '' }))
                    setPasswordFormError('')
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleChangePassword()}
                  className={`pl-9 pr-9 ${passwordErrors.passwordConfirm ? 'border-rose-500 focus-visible:ring-rose-500' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-primary/40 hover:text-brand-primary/60 transition-colors"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passwordErrors.passwordConfirm && (
                <p className="text-sm text-rose-500">{passwordErrors.passwordConfirm}</p>
              )}
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleChangePassword}
                disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
                className="bg-brand-secondary hover:bg-brand-secondary/90"
              >
                {savingPassword ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Senha
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
