import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import { Cloud } from 'lucide-react'

export default function Login() {
  const [error, setError] = useState('')
  const { signInWith } = useAuth()
  const navigate = useNavigate()

  const handleAzureLogin = async () => {
    setError('')
    const { error: signInError } = await signInWith('oidc')
    if (signInError) {
      setError('Falha na autenticação com Azure. Tente novamente.')
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
              onClick={handleAzureLogin}
              variant="outline"
              className="w-full flex items-center justify-center gap-3 h-12 text-base font-medium hover:bg-gray-100"
            >
              <Cloud className="w-5 h-5 text-[#0089D6]" />
              Azure
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
