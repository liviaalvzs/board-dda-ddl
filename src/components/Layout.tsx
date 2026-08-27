import { useState, useEffect } from 'react'
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom'
import {
  Leaf,
  LogOut,
  Building2,
  KanbanSquare,
  LayoutDashboard,
  Settings,
  FileText,
  Map as MapIcon,
  Menu,
  X,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import ChatWidget from './ChatWidget'
import NotificationBell from './NotificationBell'

export default function Layout() {
  const { signOut, user, role } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isAdmin = role === 'admin'

  const handleLogout = () => {
    signOut()
    navigate('/login')
  }

  const navItems = isAdmin
    ? [
        {
          to: '/',
          label: 'Board',
          icon: KanbanSquare,
          match: (p: string) => p === '/' || p.startsWith('/land/'),
        },
        {
          to: '/dash',
          label: 'Dash',
          icon: LayoutDashboard,
          match: (p: string) => p === '/dash',
        },
        {
          to: '/mapa',
          label: 'Mapa',
          icon: MapIcon,
          match: (p: string) => p === '/mapa',
        },
        {
          to: '/external-offices',
          label: 'Escritórios',
          icon: Building2,
          match: (p: string) => p === '/external-offices',
        },
        {
          to: '/documents',
          label: 'Documentos',
          icon: FileText,
          match: (p: string) => p === '/documents',
        },
        {
          to: '/settings',
          label: 'Configurações',
          icon: Settings,
          match: (p: string) => p === '/settings',
        },
      ]
    : [
        {
          to: '/documents',
          label: 'Documentos',
          icon: FileText,
          match: (p: string) => p === '/documents',
        },
      ]

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      <header className="bg-white shadow-sm z-20 flex-shrink-0 relative border-b border-brand-primary/10">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center gap-4 sm:gap-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-primary p-2 rounded-lg flex items-center justify-center">
                <Leaf className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-brand-primary hidden sm:block">
                Diligência - Controle
              </h1>
            </div>

            <nav className="hidden md:flex items-center gap-6">
              {navItems.map((item) => {
                const isActive = item.match(location.pathname)
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      'flex items-center gap-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'text-brand-secondary'
                        : 'text-brand-primary/60 hover:text-brand-primary',
                    )}
                  >
                    <item.icon className="w-4 h-4" /> {item.label}
                  </Link>
                )
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {isAdmin && <NotificationBell />}
            {user && (
              <span className="text-sm font-medium text-gray-600 hidden sm:inline-block">
                {user.name || user.email}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-gray-500 hover:text-brand-primary hidden sm:flex"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="md:hidden text-brand-primary"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {mobileMenuOpen && (
          <nav className="md:hidden border-t border-brand-primary/10 bg-white pb-2">
            {navItems.map((item) => {
              const isActive = item.match(location.pathname)
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    'flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors',
                    isActive
                      ? 'text-brand-secondary bg-brand-secondary/5'
                      : 'text-brand-primary/70 active:bg-gray-50',
                  )}
                >
                  <item.icon className="w-4 h-4" /> {item.label}
                </Link>
              )
            })}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-6 py-3 text-sm font-medium text-gray-500 active:bg-gray-50 w-full"
            >
              <LogOut className="w-4 h-4" /> Sair
            </button>
          </nav>
        )}
      </header>

      <main className="flex-1 flex flex-col min-h-0 relative">
        <Outlet />
      </main>

      <ChatWidget />
    </div>
  )
}
