import { useState, useEffect, useRef } from 'react'
import { Search, Loader2, X, MapPin } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { searchLands } from '@/services/document-upload'
import { getStatusLabel } from '@/lib/status-mapping'

interface CompactLandSearchProps {
  onSelect: (land: any) => void
  selectedLand: any | null
  onClear: () => void
}

export function CompactLandSearch({ onSelect, selectedLand, onClear }: CompactLandSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([])
      return
    }
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const lands = await searchLands(query)
        setResults(lands)
        setShowDropdown(true)
      } catch {
        setResults([])
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

  if (selectedLand) {
    return (
      <div className="bg-white p-3 rounded-xl border border-brand-primary/10 shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-brand-primary/5 flex items-center justify-center shrink-0">
            <MapPin className="w-4 h-4 text-brand-secondary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-brand-primary truncate">
              {selectedLand.cluster_serial}
            </p>
            {selectedLand.status && (
              <Badge
                variant="outline"
                className="text-[10px] font-medium border-brand-primary/10 mt-0.5"
              >
                {getStatusLabel(selectedLand.status)}
              </Badge>
            )}
          </div>
        </div>
        <button
          onClick={onClear}
          className="w-11 h-11 flex items-center justify-center text-brand-primary/40 hover:text-rose-500 transition-colors shrink-0"
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
          placeholder="Buscar terra por código (ex: CAM-0193)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setShowDropdown(true)}
          className="pl-9 bg-white border-brand-primary/10 rounded-xl h-11 text-brand-primary placeholder:text-brand-primary/40 shadow-sm"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-brand-secondary" />
        )}
      </div>
      {showDropdown && !loading && (
        <div className="absolute z-50 mt-2 w-full bg-white rounded-xl border border-brand-primary/10 shadow-md overflow-hidden max-h-64 overflow-y-auto">
          {results.length === 0 ? (
            <div className="px-4 py-3 text-sm text-brand-primary/50">
              {query.trim().length >= 2
                ? 'Nenhuma terra encontrada.'
                : 'Digite ao menos 2 caracteres para buscar.'}
            </div>
          ) : (
            results.map((land) => (
              <button
                key={land.id}
                onClick={() => {
                  onSelect(land)
                  setQuery('')
                  setResults([])
                  setShowDropdown(false)
                }}
                className="w-full text-left px-4 py-3 hover:bg-brand-primary/[0.02] transition-colors border-b border-brand-primary/5 last:border-0 min-h-[44px]"
              >
                <span className="text-sm font-semibold text-brand-primary">
                  {land.cluster_serial}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
