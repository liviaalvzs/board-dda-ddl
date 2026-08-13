import { useState } from 'react'
import { User, Building2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { upsertLandMetadata } from '@/services/land-metadata'
import { OWNER_TYPE_LABEL, type OwnerType } from '@/lib/document-groups'

interface OwnerTypeSelectorProps {
  metadata: any
  externalId: string
  onUpdated?: (record: any) => void
}

/**
 * Define se o proprietário é pessoa física ou jurídica.
 *
 * Não é só um rótulo: dispensa a lista de documentos da categoria oposta, que
 * some da contagem de progresso no card e na aba Documentos.
 *
 * `<select>` nativo, e não o Select do Radix, porque este bloco vive dentro do
 * painel lateral da terra — que é um Dialog portalado. O Radix também portala a
 * lista e ela não chega a aparecer sobre o modal (mesmo motivo dos filtros do
 * board).
 */
export function OwnerTypeSelector({ metadata, externalId, onUpdated }: OwnerTypeSelectorProps) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)

  const current = (metadata?.owner_type || '') as OwnerType

  const handleChange = async (value: string) => {
    setSaving(true)
    try {
      const result = await upsertLandMetadata(externalId, { ownerType: value || null })
      toast({
        title: value
          ? `Proprietário definido como ${OWNER_TYPE_LABEL[value as 'pf' | 'pj']}`
          : 'Tipo de proprietário removido',
        description: 'A contagem de documentos foi ajustada.',
      })
      onUpdated?.(result)
    } catch (err) {
      toast({
        title: 'Erro ao salvar tipo de proprietário',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col">
      <label
        htmlFor="owner-type"
        className="text-[11px] text-brand-primary/60 font-semibold mb-1 uppercase tracking-wider"
      >
        Tipo de Proprietário
      </label>
      <div className="flex items-center gap-2">
        {saving ? (
          <Loader2 className="w-4 h-4 shrink-0 animate-spin text-brand-primary/40" />
        ) : current === 'pj' ? (
          <Building2 className="w-4 h-4 shrink-0 text-brand-primary/40" />
        ) : (
          <User className="w-4 h-4 shrink-0 text-brand-primary/40" />
        )}
        <select
          id="owner-type"
          value={current}
          disabled={saving}
          onChange={(e) => handleChange(e.target.value)}
          className={cn(
            'flex h-9 flex-1 items-center rounded-lg border border-brand-primary/15 bg-white px-2 text-sm font-medium text-brand-primary',
            'focus:outline-none focus:ring-2 focus:ring-brand-secondary disabled:opacity-50',
          )}
        >
          <option value="">Não informado</option>
          <option value="pf">{OWNER_TYPE_LABEL.pf}</option>
          <option value="pj">{OWNER_TYPE_LABEL.pj}</option>
        </select>
      </div>
      <span className="mt-1 text-[11px] leading-relaxed text-brand-primary/45">
        {current
          ? `Documentos de ${OWNER_TYPE_LABEL[current === 'pf' ? 'pj' : 'pf']} não são exigidos.`
          : 'Sem definição, as duas listas de documentos continuam sendo exigidas.'}
      </span>
    </div>
  )
}
