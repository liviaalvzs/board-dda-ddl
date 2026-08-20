import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import pb from '@/lib/pocketbase/client'

type UserRole = 'admin' | 'negociador'

interface AuthContextType {
  user: any
  isAuthenticated: boolean
  isAdmin: boolean
  role: UserRole
  activateAccount: (email: string, password: string) => Promise<{ error: any }>
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signInWithMicrosoft: () => Promise<{ error: any }>
  completeOAuth2: (code: string, state: string) => Promise<{ error: any }>
  startLogin: (email: string) => Promise<{ requiresPassword: boolean; error: any }>
  signOut: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any>(pb.authStore.isValid ? pb.authStore.record : null)
  const [isAuthenticated, setIsAuthenticated] = useState(pb.authStore.isValid)
  const [isAdmin, setIsAdmin] = useState(pb.authStore.isAdmin || false)
  const [role, setRole] = useState<UserRole>((pb.authStore.record as any)?.role || 'negociador')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = pb.authStore.onChange((_token, record) => {
      setUser(pb.authStore.isValid ? record : null)
      setIsAuthenticated(pb.authStore.isValid)
      setIsAdmin(pb.authStore.isAdmin || false)
      setRole(((record as any)?.role as UserRole) || 'negociador')
    })

    if (pb.authStore.isValid) {
      pb.collection('users')
        .authRefresh()
        .catch(() => pb.authStore.clear())
        .finally(() => setLoading(false))
    } else {
      if (pb.authStore.record) pb.authStore.clear()
      setLoading(false)
    }

    return () => {
      unsubscribe()
    }
  }, [])

  const activateAccount = async (email: string, password: string) => {
    try {
      await pb.send('/backend/v1/activate-account', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
        headers: { 'Content-Type': 'application/json' },
      })
      await pb.collection('users').authWithPassword(email, password)
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      await pb.collection('users').authWithPassword(email, password)
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  // Primeira etapa do login: o backend decide pelo papel do e-mail informado.
  // Negociador volta já autenticado (token); admin volta pedindo a senha;
  // e-mail desconhecido volta como erro.
  const startLogin = async (email: string) => {
    try {
      const res: any = await pb.send('/backend/v1/login-start', {
        method: 'POST',
        body: JSON.stringify({ email }),
        headers: { 'Content-Type': 'application/json' },
      })
      if (res?.token && res?.record) {
        pb.authStore.save(res.token, res.record)
        return { requiresPassword: false, error: null }
      }
      return { requiresPassword: true, error: null }
    } catch (error) {
      return { requiresPassword: false, error }
    }
  }

  const signInWithMicrosoft = async () => {
    try {
      const methods = await pb.collection('users').listAuthMethods()
      const provider = methods.oauth2?.providers?.find((p: any) => p.name === 'oidc')
      if (!provider) throw new Error('Provider Microsoft não configurado')
      const redirectUrl = window.location.origin + '/login/callback'
      localStorage.setItem(
        'oauth_provider',
        JSON.stringify({
          name: provider.name,
          state: provider.state,
          codeVerifier: provider.codeVerifier,
          redirectUrl,
        }),
      )
      window.location.href = provider.authURL + encodeURIComponent(redirectUrl)
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const completeOAuth2 = async (code: string, state: string) => {
    try {
      const raw = localStorage.getItem('oauth_provider')
      if (!raw) throw new Error('OAuth state não encontrado')
      const saved = JSON.parse(raw)
      if (saved.state !== state) throw new Error('State inválido')
      const res: any = await pb.send('/backend/v1/auth/microsoft-callback', {
        method: 'POST',
        body: JSON.stringify({
          code,
          state,
          codeVerifier: saved.codeVerifier,
          redirectUrl: saved.redirectUrl,
        }),
        headers: { 'Content-Type': 'application/json' },
      })
      if (res?.token && res?.record) {
        pb.authStore.save(res.token, res.record)
      }
      localStorage.removeItem('oauth_provider')
      return { error: null }
    } catch (error) {
      localStorage.removeItem('oauth_provider')
      return { error }
    }
  }

  const signOut = () => {
    pb.authStore.clear()
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isAdmin,
        role,
        activateAccount,
        signIn,
        signInWithMicrosoft,
        completeOAuth2,
        startLogin,
        signOut,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
