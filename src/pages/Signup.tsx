import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Leaf, Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react'
import { checkEmail } from '@/services/users'

type Step = 'email' | 'password' | 'active' | 'not-found'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState<Step>('email')
  const { activateAccount } = useAuth()
  const navigate = useNavigate()

  const handleCheckEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const result = await checkEmail(email)
      if (result.status === 'pending') {
        setStep('password')
      } else if (result.status === 'active') {
        setStep('active')
      }
    } catch (err: any) {
      if (err?.status === 404) {
        setStep('not-found')
      } else {
        setError(err?.response?.error || 'Erro ao verificar email.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }

    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.')
      return
    }

    setIsLoading(true)
    const { error: activateError } = await activateAccount(email, password)
    setIsLoading(false)

    if (activateError) {
      setError(activateError?.response?.error || activateError?.message || 'Erro ao ativar conta.')
    } else {
      navigate('/')
    }
  }

  const resetFlow = () => {
    setStep('email')
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setError('')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-background p-4">
      <Card className="w-full max-w-sm shadow-subtle border-brand-secondary/20">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 bg-brand-primary p-2 rounded-xl flex items-center justify-center mb-4">
            <Leaf className="w-8 h-8 text-white" />
          </div>
          {step === 'email' && (
            <>
              <CardTitle className="text-2xl text-brand-primary">Ativar Conta</CardTitle>
              <CardDescription>
                O cadastro é restrito e por convite apenas. Digite seu email para verificar se você
                foi pré-cadastrado.
              </CardDescription>
            </>
          )}
          {step === 'password' && (
            <>
              <CardTitle className="text-2xl text-brand-primary">Definir Senha</CardTitle>
              <CardDescription>Bem-vindo! Defina sua senha para ativar sua conta.</CardDescription>
            </>
          )}
          {step === 'active' && (
            <>
              <CardTitle className="text-2xl text-brand-primary">Conta já ativada</CardTitle>
              <CardDescription>Sua conta já está ativa. Faça login para continuar.</CardDescription>
            </>
          )}
          {step === 'not-found' && (
            <>
              <CardTitle className="text-2xl text-brand-primary">
                Email não pré-cadastrado
              </CardTitle>
              <CardDescription>Entre em contato com um administrador.</CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent>
          {step === 'email' && (
            <form onSubmit={handleCheckEmail} className="space-y-4 pt-4">
              {error && <p className="text-sm text-red-500 font-medium text-center">{error}</p>}
              <div className="space-y-2 text-left">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full mt-6 bg-brand-primary hover:bg-brand-primary/90"
                disabled={isLoading}
              >
                {isLoading ? 'Verificando...' : 'Verificar Email'}
              </Button>
            </form>
          )}

          {step === 'password' && (
            <form onSubmit={handleActivate} className="space-y-4 pt-4">
              {error && <p className="text-sm text-red-500 font-medium text-center">{error}</p>}
              <div className="rounded-lg bg-brand-primary/5 p-3 text-sm text-brand-primary/70 text-center">
                <Mail className="w-4 h-4 inline mr-1" />
                {email}
              </div>
              <div className="space-y-2 text-left">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2 text-left">
                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full mt-6 bg-brand-primary hover:bg-brand-primary/90"
                disabled={isLoading}
              >
                {isLoading ? 'Ativando...' : 'Ativar Conta'}
              </Button>
              <button
                type="button"
                onClick={resetFlow}
                className="w-full text-sm text-muted-foreground hover:text-brand-primary flex items-center justify-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" /> Voltar
              </button>
            </form>
          )}

          {step === 'active' && (
            <div className="space-y-4 pt-4 text-center">
              <div className="mx-auto w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              </div>
              <Button
                onClick={() => navigate('/login')}
                className="w-full bg-brand-primary hover:bg-brand-primary/90"
              >
                Ir para Login
              </Button>
            </div>
          )}

          {step === 'not-found' && (
            <div className="space-y-4 pt-4 text-center">
              <div className="mx-auto w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-rose-500" />
              </div>
              <p className="text-sm text-muted-foreground">
                Access restricted to invited users. Please contact your administrator.
              </p>
              <Button onClick={resetFlow} variant="outline" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" /> Tentar outro email
              </Button>
            </div>
          )}

          {step === 'email' && (
            <div className="mt-4 text-center text-sm">
              <span className="text-muted-foreground">Já tem uma conta? </span>
              <Link to="/login" className="text-brand-primary hover:underline font-medium">
                Entrar
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
