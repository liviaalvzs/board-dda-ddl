import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Leaf } from 'lucide-react'
import { getErrorMessage } from '@/lib/pocketbase/errors'

export default function Login() {
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { signInWithMicrosoft } = useAuth()
  const navigate = useNavigate()

  const handleMicrosoftLogin = async () => {
    setIsLoading(true)
    setError('')
    const { error: msError } = await signInWithMicrosoft()
    setIsLoading(false)
    if (msError) {
      setError(getErrorMessage(msError))
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
          <CardDescription>Entre com sua conta re.green</CardDescription>
        </CardHeader>
        <CardContent>
          {error && <p className="text-sm text-red-500 font-medium text-center mb-4">{error}</p>}

          <Button
            type="button"
            variant="outline"
            className="w-full flex items-center justify-center gap-2 border-brand-primary/15 h-11"
            disabled={isLoading}
            onClick={handleMicrosoftLogin}
          >
            <svg width="18" height="18" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
              <rect x="1" y="1" width="9" height="9" fill="#f25022" />
              <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
              <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
              <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
            </svg>
            {isLoading ? 'Entrando...' : 'Entrar com Microsoft'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
