import { useState } from 'react'
import { User, Lock, KeyRound, Eye, EyeOff, Save, Loader2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { extractFieldErrors, type FieldErrors } from '@/lib/pocketbase/errors'
import pb from '@/lib/pocketbase/client'

export default function Profile() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setFormError('')

    const fieldErrors: FieldErrors = {}
    if (!currentPassword) fieldErrors.oldPassword = 'Informe sua senha atual.'
    if (!newPassword) fieldErrors.password = 'Informe a nova senha.'
    else if (newPassword.length < 8)
      fieldErrors.password = 'A senha deve ter no mínimo 8 caracteres.'
    if (!confirmPassword) fieldErrors.passwordConfirm = 'Confirme a nova senha.'
    else if (newPassword !== confirmPassword)
      fieldErrors.passwordConfirm = 'As senhas não coincidem.'

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors)
      return
    }
    if (!user?.id) return

    setSaving(true)
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
      const fe = extractFieldErrors(err)
      if (fe.oldPassword) {
        setFormError('Senha atual incorreta.')
      } else if (Object.keys(fe).length > 0) {
        setErrors(fe)
      } else {
        setFormError('Erro ao alterar senha, tente novamente.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex-1 overflow-auto bg-gray-50 p-4 md:p-8">
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-primary flex items-center gap-2">
            <User className="w-6 h-6 text-brand-secondary" />
            Perfil
          </h1>
          <p className="text-sm text-brand-primary/60">Gerencie suas informações de acesso.</p>
        </div>

        <Card className="border-brand-primary/10 shadow-sm">
          <CardHeader>
            <CardTitle className="text-brand-primary text-lg">Informações da Conta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-brand-primary/60">Email:</span>
              <span className="text-sm text-brand-primary">{user?.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-brand-primary/60">Nome:</span>
              <span className="text-sm text-brand-primary">{user?.name || '—'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-brand-primary/60">Função:</span>
              <span className="text-sm text-brand-primary capitalize">
                {user?.role === 'admin' ? 'Administrador' : 'Negociador'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-brand-primary/10 shadow-sm">
          <CardHeader>
            <CardTitle className="text-brand-primary flex items-center gap-2">
              <Lock className="w-5 h-5 text-brand-secondary" />
              Alterar Senha
            </CardTitle>
            <CardDescription>A nova senha deve ter no mínimo 8 caracteres.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {formError && (
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-rose-700">{formError}</p>
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
                      setErrors((prev) => ({ ...prev, oldPassword: '' }))
                      setFormError('')
                    }}
                    className={`pl-9 pr-9 ${errors.oldPassword ? 'border-rose-500 focus-visible:ring-rose-500' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-primary/40 hover:text-brand-primary/60 transition-colors"
                  >
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.oldPassword && (
                  <p className="text-sm text-rose-500">{errors.oldPassword}</p>
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
                      setErrors((prev) => ({ ...prev, password: '' }))
                      setFormError('')
                    }}
                    className={`pl-9 pr-9 ${errors.password ? 'border-rose-500 focus-visible:ring-rose-500' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-primary/40 hover:text-brand-primary/60 transition-colors"
                  >
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-sm text-rose-500">{errors.password}</p>}
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
                      setErrors((prev) => ({ ...prev, passwordConfirm: '' }))
                      setFormError('')
                    }}
                    className={`pl-9 pr-9 ${errors.passwordConfirm ? 'border-rose-500 focus-visible:ring-rose-500' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-primary/40 hover:text-brand-primary/60 transition-colors"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.passwordConfirm && (
                  <p className="text-sm text-rose-500">{errors.passwordConfirm}</p>
                )}
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={saving || !currentPassword || !newPassword || !confirmPassword}
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
                      Salvar Senha
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
