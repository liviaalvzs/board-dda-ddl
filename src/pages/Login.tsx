import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Leaf, ArrowLeft } from 'lucide-react'
import { getErrorMessage } from '@/lib/pocketbase/errors'

type Step = 'email' | 'password'

export default function Login() {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { startLogin, signIn } = useAuth()
  const navigate = useNavigate()
  const passwordRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (step === 'password') passwordRef.current?.focus()
  }, [step])

  const backToEmail = () => {
    setStep('email')
    setPassword('')
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    if (step === 'email') {
      const { requiresPassword, error: startError } = await startLogin(email)
      setIsLoading(false)

      if (startError) {
        setError(getErrorMessage(startError))
        return
      }
      if (requiresPassword) {
        setStep('password')
        return
      }
      // Negociador já veio autenticado da primeira etapa.
      navigate('/documents')
      return
    }

    const { error: signInError } = await signIn(email, password)
    setIsLoading(false)

    if (signInError) {
      setError('Senha incorreta')
    } else {
      navigate('/')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-background p-4">
      <Card className="w-full max-w-sm shadow-subtle border-brand-secondary/20">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 bg-brand-primary p-2 rounded-xl flex items-center justify-center mb-4">
            <Leaf className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl text-brand-primary">Board DDL DDA</CardTitle>
          <CardDescription>
            {step === 'email' ? 'Informe seu e-mail para continuar' : 'Informe sua senha'}
          </CardDescription>
          <p className="text-xs text-muted-foreground mt-1">
            O acesso é restrito e por convite apenas.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            {error && <p className="text-sm text-red-500 font-medium text-center">{error}</p>}

            {step === 'email' ? (
              <div className="space-y-2 text-left">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="voce@re.green"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                  required
                />
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={backToEmail}
                  className="flex items-center gap-1.5 text-xs font-medium text-brand-primary/60 hover:text-brand-primary transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  {email}
                </button>

                <div className="space-y-2 text-left">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    ref={passwordRef}
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </>
            )}

            <Button
              type="submit"
              className="w-full mt-6 bg-brand-primary hover:bg-brand-primary/90"
              disabled={isLoading}
            >
              {isLoading ? 'Entrando...' : step === 'email' ? 'Continuar' : 'Entrar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
