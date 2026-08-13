import { useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarIcon, CalendarCheck, Loader2, X } from 'lucide-react'
import { upsertLandMetadata } from '@/services/land-metadata'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { parseDateValue, type DateFieldConfig } from '@/lib/process-dates-helpers'

interface ProcessDateFieldProps {
  field: DateFieldConfig
  milestoneTitle: string
  columnLabel: string
  value: any
  externalId: string
  variant: 'planned' | 'actual'
  isPlannedFilled?: boolean
  /** Somente leitura: a terra ainda não chegou na etapa que libera o campo. */
  disabled?: boolean
  onUpdated?: (record: any) => void
}

export function ProcessDateField({
  field,
  milestoneTitle,
  columnLabel,
  value,
  externalId,
  variant,
  isPlannedFilled,
  disabled,
  onUpdated,
}: ProcessDateFieldProps) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false)
  const [localDate, setLocalDate] = useState<Date | undefined>(undefined)
  const [hasLocalOverride, setHasLocalOverride] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const serverDate = parseDateValue(value)
  const selected = hasLocalOverride ? localDate : serverDate
  const fieldId = `field-${field.key}`
  const labelId = `label-${field.key}`
  const isPlanned = variant === 'planned'
  const hasValue = !!selected

  const handleDateChange = async (date: Date | undefined) => {
    setError(null)
    setLocalDate(date)
    setHasLocalOverride(true)
    setOpen(false)
    setSaving(true)
    try {
      const result = await upsertLandMetadata(externalId, {
        [field.param]: date ? format(date, 'yyyy-MM-dd') : null,
      } as any)
      toast({ title: 'Data atualizada com sucesso' })
      onUpdated?.(result)
      setHasLocalOverride(false)
    } catch (err) {
      setHasLocalOverride(false)
      setLocalDate(undefined)
      setError('Erro ao salvar data. Tente novamente.')
      toast({
        title: 'Erro ao salvar data',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col flex-1">
      <span id={labelId} className="sr-only">
        {milestoneTitle} – {columnLabel}
      </span>
      <span className="text-[11px] font-semibold text-brand-primary/50 mb-1 block sm:hidden">
        {columnLabel}
      </span>
      <div className="flex items-center gap-1">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              id={fieldId}
              variant="outline"
              aria-labelledby={labelId}
              className={cn(
                'justify-start text-left font-normal h-10 rounded-lg flex-1 text-sm transition-colors',
                isPlanned
                  ? 'border-dashed border-brand-primary/20 bg-slate-100 text-brand-primary/70'
                  : cn(
                      'bg-white text-brand-primary',
                      isPlannedFilled ? 'border-brand-primary/25' : 'border-brand-primary/10',
                    ),
                !hasValue && 'text-brand-primary/40',
                disabled && 'opacity-60',
              )}
              disabled={saving || disabled}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : !isPlanned && hasValue ? (
                <CalendarCheck className="w-4 h-4 mr-2 text-brand-secondary" />
              ) : (
                <CalendarIcon className="w-4 h-4 mr-2" />
              )}
              {hasValue
                ? format(selected, 'dd/MM/yyyy', { locale: ptBR })
                : isPlanned
                  ? 'selecione uma data'
                  : 'ainda não recebido'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selected}
              onSelect={(date) => {
                handleDateChange(date)
              }}
              locale={ptBR}
              initialFocus
              disabled={saving}
            />
          </PopoverContent>
        </Popover>
        {hasValue && !disabled && (
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0 text-brand-primary/40 hover:text-brand-critical"
            disabled={saving}
            onClick={() => handleDateChange(undefined)}
            aria-label={`Limpar data de ${milestoneTitle} – ${columnLabel}`}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
      {error && (
        <span className="text-[11px] text-red-500 font-medium mt-1 animate-fade-in">{error}</span>
      )}
    </div>
  )
}
