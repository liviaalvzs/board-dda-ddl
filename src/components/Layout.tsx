import { Outlet, useNavigate } from 'react-router-dom'
import { Leaf, LogOut } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'

export default function Layout() {
  const { signOut, user } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    signOut()
    navigate('/login')
  }

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      <header className="bg-white shadow-sm z-10 flex-shrink-0 relative border-b border-brand-primary/10">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-primary p-2 rounded-lg flex items-center justify-center">
              <Leaf className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-brand-primary">
              Diligência - Controle
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {user && (
              <span className="text-sm font-medium text-gray-600 hidden sm:inline-block">
                {user.name || user.email}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-gray-500 hover:text-brand-primary"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col min-h-0 relative">
        <Outlet />
      </main>
    </div>
  )
}
