import { Outlet } from 'react-router-dom'
import { Leaf } from 'lucide-react'

export default function Layout() {
  return (
    <div className="flex flex-col h-screen bg-brand-background overflow-hidden">
      <header className="bg-white shadow-sm z-10 flex-shrink-0 relative border-b border-brand-primary/10">
        <div className="flex items-center gap-3 px-6 py-4">
          <div className="w-10 h-10 bg-brand-primary p-2 rounded-lg flex items-center justify-center">
            <Leaf className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-brand-primary">
            Diligência - Controle
          </h1>
        </div>
      </header>

      <main className="flex-1 flex flex-col min-h-0 relative">
        <Outlet />
      </main>
    </div>
  )
}
