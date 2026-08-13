import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'

/**
 * Peças visuais compartilhadas do dashboard.
 *
 * Existem para os cards e os títulos de seção não divergirem entre os quatro
 * arquivos que os usam — o dash inteiro lê como uma coisa só.
 */

/** Card branco da marca, sobre o fundo creme da página. */
export const DASH_CARD_CLASS = 'rounded-2xl border-brand-primary/10 bg-white shadow-rg-card'

/** Bloco interno de detalhe (os mini-cards dentro dos gráficos). */
export const DASH_TILE_CLASS =
  'rounded-xl border border-brand-primary/10 bg-brand-background/40 p-3'

const STORAGE_PREFIX = 'dash-section-open:'

function readStoredOpen(storageKey: string, defaultOpen: boolean): boolean {
  if (typeof window === 'undefined') return defaultOpen
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + storageKey)
    return raw === null ? defaultOpen : raw === '1'
  } catch {
    return defaultOpen
  }
}

/**
 * Seção retrátil do dash: título com barra de acento + chevron, conteúdo
 * dobrável por baixo.
 *
 * O estado fica salvo no localStorage por `title` — quem esconde "Distribuição"
 * porque já sabe o resultado não precisa fechar de novo a cada visita.
 */
export function DashSection({
  title,
  description,
  defaultOpen = true,
  children,
}: {
  title: string
  description?: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const storageKey = title
  const [open, setOpen] = useState(() => readStoredOpen(storageKey, defaultOpen))

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    try {
      window.localStorage.setItem(STORAGE_PREFIX + storageKey, next ? '1' : '0')
    } catch {
      // Sem localStorage (modo privado, por exemplo): a preferência só não persiste.
    }
  }

  return (
    <Collapsible open={open} onOpenChange={handleOpenChange} className="space-y-4">
      <CollapsibleTrigger asChild>
        <button type="button" className="flex w-full items-center gap-3 text-left">
          <span className="h-8 w-1 shrink-0 rounded-full bg-brand-secondary" />
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg font-light leading-tight text-brand-primary">
              {title}
            </h2>
            {description && <p className="text-xs text-brand-primary/50">{description}</p>}
          </div>
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-brand-primary/40 transition-transform',
              open && 'rotate-180',
            )}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-4">{children}</CollapsibleContent>
    </Collapsible>
  )
}
