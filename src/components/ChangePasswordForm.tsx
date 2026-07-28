import { useState } from 'react'
import { Lock, KeyRound, Eye, EyeOff, Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { extractFieldErrors, getErrorMessage, type FieldErrors } from '@/lib/pocketbase/errors'
import pb from '@/lib/pocketbase/client'

export function ChangePasswordForm() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [localError, setLocalError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const resetForm = () => {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setLocalError('')
    setFieldErrors({})
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError('')
    setFieldErrors({})

    if (!newPassword || newPassword.length < 8) {
      setLocalError('A nova senha deve ter pelo menos 8 caracteres.')
      return
    }
    if (newPassword !== confirmPassword) {
      setLocalError('A confirmação de senha não corresponde.')
      return
    }
    if (!user?.id) {
      setLocalError('Usuário não encontrado.')
      return
    }

    setSaving(true)
    try {
      await pb.collection('users').update(user.id, {
        oldPassword: currentPassword,
        password: newPassword,
        passwordConfirm: confirmPassword,
      })
      toast({ title: 'Senha alterada com sucesso.' })
      resetForm()
    } catch (err) {
      const errors = extractFieldErrors(err)
      setFieldErrors(errors)
      const msg = getErrorMessage(err)
      if (msg.toLowerCase().includes('old') || msg.toLowerCase().includes('atual')) {
        setLocalError('Senha atual incorreta.')
      } else if (Object.keys(errors).length === 0) {
        setLocalError('Erro ao alterar senha, tente novamente.')
      } else {
        setLocalError(msg)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="border-brand-primary/10 shadow-sm">
      <CardHeader>
        <CardTitle className="text-brand-primary flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-brand-secondary" />
          Alterar Senha
        </CardTitle>
        <CardDescription>
          Mantenha sua conta segura definindo uma nova senha de acesso.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Senha Atual</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrent ? 'text' : 'password'}
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">Nova Senha</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNew ? 'text' : 'password'}
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {fieldErrors.password && (
              <p className="text-sm text-rose-500">{fieldErrors.password}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {fieldErrors.passwordConfirm && (
              <p className="text-sm text-rose-500">{fieldErrors.passwordConfirm}</p>
            )}
          </div>

          {localError && (
            <p className="text-sm text-rose-500 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5" />
              {localError}
            </p>
          )}

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
  )
}
