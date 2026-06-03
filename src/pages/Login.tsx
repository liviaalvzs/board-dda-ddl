import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function Login() {
  const [error, setError] = useState('')
  const { signInWith } = useAuth()
  const navigate = useNavigate()

  const handleMicrosoftLogin = async () => {
    setError('')
    const { error: signInError } = await signInWith('microsoft')
    if (signInError) {
      setError('Falha na autenticação com a Microsoft. Tente novamente.')
    } else {
      navigate('/')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50/50 p-4">
      <Card className="w-full max-w-sm shadow-subtle border-brand-secondary/20">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl text-brand-primary">Board DDL DDA</CardTitle>
          <CardDescription>Acesse o sistema utilizando sua conta corporativa</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 pt-4">
            {error && <p className="text-sm text-brand-red font-medium text-center">{error}</p>}
            <Button
              type="button"
              onClick={handleMicrosoftLogin}
              variant="outline"
              className="w-full flex items-center justify-center gap-3 h-12 text-base font-medium hover:bg-gray-100"
            >
              <svg viewBox="0 0 21 21" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
              </svg>
              Microsoft
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
