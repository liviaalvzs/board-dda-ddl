import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarIcon, Loader2, X } from 'lucide-react'
import { upsertLandMetadata } from '@/services/land-metadata'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { ProcessDateField } from '@/components/kanban/ProcessDateField'
import { MARCO_INICIAL, DATA_SOLICITACAO_DD, parseDateValue } from '@/lib/process-dates-helpers'

interface ProcessDatesSectionProps {
  metadata: any
  externalId: string
  onUpdated?: (record: any) => void
}

/**
 * Marco inicial e solicitação da DD. Hoje não está renderizado em lugar nenhum
 * — foi ocultado a pedido, e a tela da terra mostra os blocos de Diligência
 * (DDL) e Diligência Ambiental no lugar. Para reexibir, importar e renderizar
 * na aba Informações do LandDetailSheet.
 *
 * Os pares "DDL preliminar" e "DDL conclusiva" que ficavam aqui saíram na
 * migration 0058: viraram o par único do bloco de Diligência (DDL).
 */
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
                    'justify-start text-left font-normal h-10 rounded-lg flex-1 border-0 bg-slate-100 text-brand-primary text-sm transition-colors',
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

      <div className="py-4 border-t border-brand-primary/10">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-brand-primary">Solicitação da DD</span>
        </div>
        <ProcessDateField
          field={DATA_SOLICITACAO_DD}
          milestoneTitle="Solicitação da DD"
          columnLabel="Data"
          value={metadata?.[DATA_SOLICITACAO_DD.key]}
          externalId={externalId}
          variant="planned"
          onUpdated={onUpdated}
        />
      </div>
    </div>
  )
}
