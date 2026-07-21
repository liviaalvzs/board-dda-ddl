import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Button } from '@/components/ui/button'
import { Check, Building2, Loader2, Pencil, X } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { upsertLandMetadata } from '@/services/land-metadata'
import { cn } from '@/lib/utils'
import type { ClientResponseError } from 'pocketbase'

interface LawFirmSelectorProps {
  metadata: any
  externalId: string
  onUpdated?: () => void
}

function isAuthError(error: unknown): boolean {
  if (!(error instanceof ClientResponseError)) return false
  return error.status === 401 || error.status === 403
}

export function LawFirmSelector({ metadata, externalId, onUpdated }: LawFirmSelectorProps) {
  const [open, setOpen] = useState(false)
  const [offices, setOffices] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()
  const { isAuthenticated, signOut } = useAuth()
  const navigate = useNavigate()

  const expandedOffice = metadata?.expand?.external_offices
  const currentOfficeId = metadata?.external_offices || null
  const currentOfficeName = Array.isArray(expandedOffice)
    ? expandedOffice[0]?.name
    : expandedOffice?.name

  const redirectToLogin = (reason: string) => {
    signOut()
    toast({
      title: 'Sessão expirada',
      description: reason,
      variant: 'destructive',
    })
    navigate('/login')
  }

  useEffect(() => {
    if (!open) return
    const fetchOffices = async () => {
      setLoading(true)
      try {
        const records = await pb.collection('external_offices').getFullList({ sort: 'name' })
        setOffices(records)
      } catch (e) {
        if (isAuthError(e)) {
          redirectToLogin('Sua sessão expirou. Faça login novamente para continuar.')
          return
        }
        console.error('Failed to fetch offices', e)
      } finally {
        setLoading(false)
      }
    }
    fetchOffices()
  }, [open])

  const handleSelect = async (officeId: string) => {
    if (!isAuthenticated) {
      redirectToLogin('Você precisa estar autenticado para realizar esta ação.')
      return
    }

    if (!externalId) {
      toast({
        title: 'Erro ao atualizar escritório',
        description: 'Identificador da terra não encontrado.',
        variant: 'destructive',
      })
      return
    }

    setOpen(false)
    setSaving(true)
    try {
      await upsertLandMetadata(externalId, { externalOffices: officeId })
      toast({ title: 'Escritório de advocacia atualizado com sucesso' })
      onUpdated?.()
    } catch (error) {
      if (isAuthError(error)) {
        redirectToLogin('Sua sessão expirou. Faça login novamente para continuar.')
        return
      }
      const description =
        error instanceof ClientResponseError && error.status === 400
          ? 'Não foi possível salvar. Verifique sua conexão ou faça login novamente.'
          : 'Verifique sua conexão e tente novamente.'
      toast({
        title: 'Erro ao atualizar escritório de advocacia',
        description,
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleClear = async () => {
    if (!isAuthenticated) {
      redirectToLogin('Você precisa estar autenticado para realizar esta ação.')
      return
    }

    setOpen(false)
    setSaving(true)
    try {
      await upsertLandMetadata(externalId, { externalOffices: null })
      toast({ title: 'Escritório de advocacia removido' })
      onUpdated?.()
    } catch (error) {
      if (isAuthError(error)) {
        redirectToLogin('Sua sessão expirou. Faça login novamente para continuar.')
        return
      }
      const description =
        error instanceof ClientResponseError && error.status === 400
          ? 'Não foi possível remover. Verifique sua conexão ou faça login novamente.'
          : 'Verifique sua conexão e tente novamente.'
      toast({
        title: 'Erro ao remover escritório',
        description,
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-brand-primary/10 shadow-sm">
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 border border-brand-primary/10 shrink-0">
        <Building2 className="w-5 h-5 text-brand-secondary" />
      </div>
      <div className="flex flex-col flex-1 min-w-0">
        <span className="text-[10px] text-brand-primary/60 font-bold uppercase tracking-wider">
          Escritório de Advocacia
        </span>
        {saving ? (
          <span className="text-sm font-semibold text-brand-primary/60 flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" /> Salvando...
          </span>
        ) : (
          <span
            className={cn(
              'text-sm font-semibold truncate',
              currentOfficeName ? 'text-brand-primary' : 'text-brand-primary/40 italic',
            )}
          >
            {currentOfficeName || 'Nenhum escritório atribuído'}
          </span>
        )}
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-brand-primary/60 hover:text-brand-primary shrink-0"
            disabled={saving}
          >
            <Pencil className="w-3.5 h-3.5" />
            <span className="ml-1 text-xs font-semibold">Editar</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="end">
          <Command>
            <CommandInput placeholder="Buscar escritório..." />
            <CommandList>
              <CommandEmpty>
                {loading ? 'Carregando...' : 'Nenhum escritório encontrado.'}
              </CommandEmpty>
              <CommandGroup>
                {offices.map((office) => (
                  <CommandItem
                    key={office.id}
                    value={office.name}
                    onSelect={() => handleSelect(office.id)}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        currentOfficeId === office.id ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    {office.name}
                  </CommandItem>
                ))}
              </CommandGroup>
              {currentOfficeId && (
                <CommandItem
                  onSelect={handleClear}
                  className="text-rose-600 border-t border-brand-primary/10 mt-1"
                >
                  <X className="mr-2 h-4 w-4" />
                  Remover escritório atribuído
                </CommandItem>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
