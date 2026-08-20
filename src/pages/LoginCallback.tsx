import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Loader2 } from 'lucide-react'
import { getErrorMessage } from '@/lib/pocketbase/errors'

export default function LoginCallback() {
  const { completeOAuth2 } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const state = params.get('state')

    if (!code || !state) {
      setError('Parâmetros de autenticação ausentes.')
      return
    }

    completeOAuth2(code, state).then(({ error: err }) => {
      if (err) {
        setError(getErrorMessage(err))
      } else {
        navigate('/')
      }
    })
  }, [completeOAuth2, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-background p-4">
      {error ? (
        <div className="text-center space-y-3">
          <p className="text-sm text-red-500 font-medium">{error}</p>
          <a href="/login" className="text-sm text-brand-secondary underline">
            Voltar ao login
          </a>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-brand-primary/60">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Autenticando...</span>
        </div>
      )}
    </div>
  )
}
