import { Info } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface DocumentInfoProps {
  label: string
  description?: string
}

/**
 * Ícone (i) que abre a descrição oficial do documento (Anexos I e II da Carta
 * Proposta). Usa Popover em vez de Tooltip para funcionar no toque, já que a
 * tela de Documentos é usada no celular.
 */
export function DocumentInfo({ label, description }: DocumentInfoProps) {
  if (!description) return null

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="w-7 h-7 -mt-0.5 flex items-center justify-center shrink-0 text-brand-primary/40 hover:text-brand-secondary transition-colors"
          aria-label={`Sobre o documento ${label}`}
        >
          <Info className="w-4 h-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        collisionPadding={12}
        className="w-72 max-w-[calc(100vw-2rem)] text-xs leading-relaxed text-brand-primary/80"
      >
        <p className="font-semibold text-brand-primary mb-1">{label}</p>
        <p>{description}</p>
      </PopoverContent>
    </Popover>
  )
}
