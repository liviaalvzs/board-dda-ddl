import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarIcon, Clock, CheckCircle2, Loader2, X, ArrowRight } from 'lucide-react'
import { upsertLandMetadata } from '@/services/land-metadata'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { ProcessDateField } from '@/components/kanban/ProcessDateField'
import {
  MARCO_INICIAL,
  MILESTONES,
  parseDateValue,
  calculateChipStatus,
} from '@/lib/process-dates-helpers'

interface ProcessDatesSectionProps {
  metadata: any
  externalId: string
  onUpdated?: (record: any) => void
}

export function ProcessDatesSection({ metadata, externalId, onUpdated }: ProcessDatesSectionProps) {
  const { toast } = useToast()
  const [savingMarco, setSavingMarco] = useState(false)
  const [marcoOpen, setMarcoOpen] = useState(false)
  const [localMarco, setLocalMarco] = useState<Date | undefined>(undefined)
  const [hasLocalMarcoOverride, setHasLocalMarcoOverride] = useState(false)
  const [marcoError, setMarcoError] = useState<string | null>(null)

  const serverMarco = parseDateValue(metadata?.[MARCO_INICIAL.key])
  const marcoSelected = hasLocalMarcoOverride ? localMarco : serverMarco
  const marcoFieldId = `field-${MARCO_INICIAL.key}`
  const marcoLabelId = `label-${MARCO_INICIAL.key}`

  const handleMarcoChange = async (date: Date | undefined) => {
    setMarcoError(null)
    setLocalMarco(date)
    setHasLocalMarcoOverride(true)
    setMarcoOpen(false)
    setSavingMarco(true)
    try {
      const result = await upsertLandMetadata(externalId, {
        [MARCO_INICIAL.param]: date ? format(date, 'yyyy-MM-dd') : null,
      } as any)
      toast({ title: 'Data atualizada com sucesso' })
      onUpdated?.(result)
      setHasLocalMarcoOverride(false)
    } catch (err) {
      setHasLocalMarcoOverride(false)
      setLocalMarco(undefined)
      setMarcoError('Erro ao salvar data. Tente novamente.')
      toast({
        title: 'Erro ao salvar data',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setSavingMarco(false)
    }
  }

  return (
    <div className="bg-white p-5 rounded-xl border border-brand-primary/10 shadow-sm space-y-5 md:col-span-2">
      <h3 className="font-display text-[22px] font-light text-brand-primary border-b border-brand-primary/5 pb-3">
        Datas do processo
      </h3>

      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col flex-1">
          <span
            id={marcoLabelId}
            className="text-[11px] font-semibold text-brand-primary/60 mb-1 block"
          >
            {MARCO_INICIAL.label}
          </span>
          <div className="flex items-center gap-1">
            <Popover open={marcoOpen} onOpenChange={setMarcoOpen}>
              <PopoverTrigger asChild>
                <Button
                  id={marcoFieldId}
                  variant="outline"
                  aria-labelledby={marcoLabelId}
                  className={cn(
                    'justify-start text-left font-normal h-10 rounded-lg flex-1 border-0 bg-surface-1 text-brand-primary text-sm transition-colors',
                    !marcoSelected && 'text-brand-primary/40',
                  )}
                  disabled={savingMarco}
                >
                  {savingMarco ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CalendarIcon className="w-4 h-4 mr-2" />
                  )}
                  {marcoSelected
                    ? format(marcoSelected, 'dd/MM/yyyy', { locale: ptBR })
                    : 'selecione uma data'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={marcoSelected}
                  onSelect={(date) => {
                    handleMarcoChange(date)
                  }}
                  locale={ptBR}
                  initialFocus
                  disabled={savingMarco}
                />
              </PopoverContent>
            </Popover>
            {marcoSelected && (
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 shrink-0 text-brand-primary/40 hover:text-brand-critical"
                disabled={savingMarco}
                onClick={() => handleMarcoChange(undefined)}
                aria-label="Limpar data de assinatura da carta proposta"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
          {marcoError && (
            <span className="text-[11px] text-red-500 font-medium mt-1 animate-fade-in">
              {marcoError}
            </span>
          )}
        </div>
        <span className="text-[11px] font-semibold text-brand-primary/50 bg-white px-2.5 py-1 rounded-full border border-brand-primary/10 whitespace-nowrap shrink-0 mb-1">
          ponto de partida
        </span>
      </div>

      <div className="hidden sm:grid grid-cols-[1fr_28px_1fr] gap-0 items-center pb-2 border-b border-brand-primary/10">
        <div className="flex items-center gap-1.5 text-[12px] text-brand-primary/50 font-semibold">
          <Clock className="w-3.5 h-3.5" /> Previsto
        </div>
        <div />
        <div className="flex items-center gap-1.5 text-[12px] text-brand-primary/50 font-semibold">
          <CheckCircle2 className="w-3.5 h-3.5" /> Realizado
        </div>
      </div>

      <div>
        {MILESTONES.map((milestone, index) => {
          const plannedDate = parseDateValue(metadata?.[milestone.planned.key])
          const actualDate = parseDateValue(metadata?.[milestone.actual.key])
          const chip = calculateChipStatus(plannedDate, actualDate)

          return (
            <div
              key={milestone.title}
              className={cn('py-4', index > 0 && 'border-t border-brand-primary/10')}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-brand-primary">{milestone.title}</span>
                <div aria-live="polite">
                  {chip && (
                    <span
                      className={cn(
                        'text-[12px] px-[10px] py-[3px] rounded-lg font-medium transition-all',
                        chip.className,
                      )}
                    >
                      {chip.text}
                    </span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_28px_1fr] gap-2 sm:gap-0 sm:items-center">
                <ProcessDateField
                  field={milestone.planned}
                  milestoneTitle={milestone.title}
                  columnLabel="Previsto"
                  value={metadata?.[milestone.planned.key]}
                  externalId={externalId}
                  variant="planned"
                  onUpdated={onUpdated}
                />
                <div className="hidden sm:flex items-center justify-center text-brand-primary/30">
                  <ArrowRight className="w-4 h-4" />
                </div>
                <ProcessDateField
                  field={milestone.actual}
                  milestoneTitle={milestone.title}
                  columnLabel="Realizado"
                  value={metadata?.[milestone.actual.key]}
                  externalId={externalId}
                  variant="actual"
                  isPlannedFilled={!!plannedDate}
                  onUpdated={onUpdated}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
