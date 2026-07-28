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
  Plus,
  X,
  FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import {
  getDelayedThresholdDays,
  updateSetting,
  getRequiredDocumentTypes,
  updateRequiredDocumentTypes,
} from '@/services/app-settings'
import { getDocumentLabel } from '@/services/document-upload'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { extractFieldErrors, type FieldErrors } from '@/lib/pocketbase/errors'

export default function Settings() {
  const [threshold, setThreshold] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const { toast } = useToast()
  const { user } = useAuth()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordErrors, setPasswordErrors] = useState<FieldErrors>({})
  const [passwordFormError, setPasswordFormError] = useState('')
  const [docTypes, setDocTypes] = useState<string[]>([])
  const [newDocType, setNewDocType] = useState('')
  const [savingDocTypes, setSavingDocTypes] = useState(false)

  useEffect(() => {
    getDelayedThresholdDays()
      .then((days) => {
        setThreshold(String(days))
        setLoading(false)
      })
      .catch(() => setLoading(false))
    getRequiredDocumentTypes()
      .then(setDocTypes)
      .catch(() => {})
  }, [])

  const handleAddDocType = async () => {
    if (!newDocType.trim()) return
    const updated = [...docTypes, newDocType.trim().toLowerCase()]
    setDocTypes(updated)
    setNewDocType('')
    setSavingDocTypes(true)
    try {
      await updateRequiredDocumentTypes(updated)
      toast({ title: 'Tipo de documento adicionado!' })
    } catch {
      toast({ title: 'Erro ao salvar', variant: 'destructive' })
    } finally {
      setSavingDocTypes(false)
    }
  }

  const handleRemoveDocType = async (type: string) => {
    const updated = docTypes.filter((t) => t !== type)
    setDocTypes(updated)
    try {
      await updateRequiredDocumentTypes(updated)
      toast({ title: 'Tipo de documento removido!' })
    } catch {
      toast({ title: 'Erro ao salvar', variant: 'destructive' })
    }
  }

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

        <Card className="border-brand-primary/10 shadow-sm">
          <CardHeader>
            <CardTitle className="text-brand-primary flex items-center gap-2">
              <FileText className="w-5 h-5 text-brand-secondary" />
              Tipos de Documentos
            </CardTitle>
            <CardDescription>
              Gerencie os tipos de documentos exigidos no upload de documentos. Use slugs separados
              por hífens (ex: cpf, rg, certidao-nascimento).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {docTypes.map((type) => (
                <div
                  key={type}
                  className="flex items-center gap-2 bg-brand-primary/5 px-3 py-1.5 rounded-lg"
                >
                  <span className="text-sm font-medium text-brand-primary">
                    {getDocumentLabel(type)}
                  </span>
                  <button
                    onClick={() => handleRemoveDocType(type)}
                    className="text-brand-primary/40 hover:text-brand-critical transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {docTypes.length === 0 && (
                <p className="text-sm text-brand-primary/50">
                  Nenhum tipo de documento configurado.
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="novo-tipo-documento"
                value={newDocType}
                onChange={(e) => setNewDocType(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddDocType()}
                className="flex-1"
              />
              <Button
                onClick={handleAddDocType}
                disabled={!newDocType.trim() || savingDocTypes}
                className="bg-brand-secondary hover:bg-brand-secondary/90"
              >
                {savingDocTypes ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-1" />
                )}
                Adicionar
              </Button>
            </div>
          </CardContent>
        </Card>

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
