import { useState, useRef, useEffect } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface ExpandableSearchProps {
  value: string
  onChange: (v: string) => void
}

export function ExpandableSearch({ value, onChange }: ExpandableSearchProps) {
  const [expanded, setExpanded] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (expanded) {
      inputRef.current?.focus()
    }
  }, [expanded])

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-11 h-11 flex items-center justify-center rounded-lg text-brand-primary/60 hover:text-brand-primary hover:bg-brand-primary/5 transition-colors shrink-0"
        aria-label="Buscar documentos"
      >
        <Search className="w-5 h-5" />
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1.5 animate-fade-in">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-primary/40" />
        <Input
          ref={inputRef}
          placeholder="Filtrar..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => {
            if (!value) setExpanded(false)
          }}
          className="pl-8 h-9 w-32 md:w-48 text-sm border-brand-primary/10"
        />
      </div>
      {value && (
        <button
          onClick={() => {
            onChange('')
            setExpanded(false)
          }}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-brand-primary/40 hover:text-rose-500 transition-colors shrink-0"
          aria-label="Limpar busca"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
