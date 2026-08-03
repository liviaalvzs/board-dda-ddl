import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Leaf } from 'lucide-react'
import { getErrorMessage } from '@/lib/pocketbase/errors'

type LoginMode = 'password' | 'negociador'

export default function Login() {
  const [mode, setMode] = useState<LoginMode>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { signIn, signInAsNegociador } = useAuth()
  const navigate = useNavigate()

  const switchMode = (next: LoginMode) => {
    setMode(next)
    setError('')
    setPassword('')
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    if (mode === 'negociador') {
      const { error: loginError } = await signInAsNegociador(email)
      setIsLoading(false)
      if (loginError) {
        setError(getErrorMessage(loginError))
      } else {
        navigate('/documents')
      }
      return
    }

    const { error: signInError } = await signIn(email, password)
    setIsLoading(false)

    if (signInError) {
      setError('Credenciais inválidas')
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
            {mode === 'negociador'
              ? 'Informe o e-mail cadastrado para enviar documentos'
              : 'Faça login para acessar o painel de controle'}
          </CardDescription>
          <p className="text-xs text-muted-foreground mt-1">
            O cadastro é restrito e por convite apenas.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-1 p-1 bg-brand-primary/5 rounded-lg">
            <button
              type="button"
              onClick={() => switchMode('password')}
              className={`text-xs font-semibold py-2 rounded-md transition-colors ${
                mode === 'password'
                  ? 'bg-white text-brand-primary shadow-sm'
                  : 'text-brand-primary/60 hover:text-brand-primary'
              }`}
            >
              Equipe re.green
            </button>
            <button
              type="button"
              onClick={() => switchMode('negociador')}
              className={`text-xs font-semibold py-2 rounded-md transition-colors ${
                mode === 'negociador'
                  ? 'bg-white text-brand-primary shadow-sm'
                  : 'text-brand-primary/60 hover:text-brand-primary'
              }`}
            >
              Negociador
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 pt-4">
            {error && <p className="text-sm text-red-500 font-medium text-center">{error}</p>}

            <div className="space-y-2 text-left">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder={mode === 'negociador' ? 'negociador@re.green' : 'admin@regreen.earth'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {mode === 'password' && (
              <div className="space-y-2 text-left">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            )}

            <Button
              type="submit"
              className="w-full mt-6 bg-brand-primary hover:bg-brand-primary/90"
              disabled={isLoading}
            >
              {isLoading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
