import { useState, useEffect, useRef } from 'react'
import { Search, Loader2, X, MapPin, AlertCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { searchLands } from '@/services/document-upload'
import { getStatusLabel } from '@/lib/status-mapping'
import { cn } from '@/lib/utils'

interface LandSearchProps {
  onSelect: (land: any) => void
  selectedLand: any | null
  onClear: () => void
}

export function LandSearch({ onSelect, selectedLand, onClear }: LandSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([])
      setError('')
      return
    }
    const timer = setTimeout(async () => {
      setLoading(true)
      setError('')
      try {
        const lands = await searchLands(query)
        setResults(lands)
        setShowDropdown(true)
      } catch {
        setResults([])
        setError('Não foi possível carregar as terras. Tente novamente.')
        setShowDropdown(true)
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSelect = (land: any) => {
    onSelect(land)
    setQuery('')
    setResults([])
    setError('')
    setShowDropdown(false)
  }

  if (selectedLand) {
    return (
      <div className="bg-white p-5 rounded-xl border border-brand-primary/10 shadow-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand-primary/5 flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5 text-brand-secondary" />
          </div>
          <div>
            <span className="text-[10px] text-brand-primary/60 font-bold uppercase tracking-wider">
              Terra Selecionada
            </span>
            <p className="text-sm font-bold text-brand-primary">
              {selectedLand.cluster_serial}
              {selectedLand.external_id && (
                <span className="ml-1 text-brand-primary/50 font-normal">
                  ({selectedLand.external_id})
                </span>
              )}
            </p>
            {selectedLand.status && (
              <Badge variant="outline" className="mt-1 text-xs font-medium border-brand-primary/10">
                {getStatusLabel(selectedLand.status)}
              </Badge>
            )}
          </div>
        </div>
        <button
          onClick={onClear}
          className="text-brand-primary/40 hover:text-brand-critical transition-colors p-2"
          aria-label="Limpar seleção"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-primary/40" />
        <Input
          placeholder="Buscar terra por código (cluster_serial ou external_id)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => (results.length > 0 || error) && setShowDropdown(true)}
          className={cn(
            'pl-9 bg-white border-brand-primary/20 rounded-xl h-12 text-brand-primary',
            error && 'border-brand-critical/40',
          )}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-brand-secondary" />
        )}
      </div>
      {showDropdown && !loading && (
        <div className="absolute z-50 mt-2 w-full bg-white rounded-xl border border-brand-primary/10 shadow-elevation overflow-hidden max-h-64 overflow-y-auto">
          {error ? (
            <div className="px-4 py-3 text-sm text-brand-critical flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-3 text-sm text-brand-primary/50">
              {query.trim().length >= 2
                ? 'Nenhuma terra encontrada.'
                : 'Digite ao menos 2 caracteres para buscar.'}
            </div>
          ) : (
            results.map((land) => (
              <button
                key={land.id}
                onClick={() => handleSelect(land)}
                className="w-full text-left px-4 py-3 hover:bg-brand-primary/5 transition-colors border-b border-brand-primary/5 last:border-0"
              >
                <span className="text-sm font-semibold text-brand-primary">
                  {land.cluster_serial}
                </span>
                {land.external_id && (
                  <span className="ml-2 text-xs text-brand-primary/50">({land.external_id})</span>
                )}
                {land.status && (
                  <span className="ml-2 text-xs text-brand-primary/50">
                    {getStatusLabel(land.status)}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
