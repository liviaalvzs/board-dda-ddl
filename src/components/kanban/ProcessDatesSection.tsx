import { useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarIcon, Loader2, X } from 'lucide-react'
import { upsertLandMetadata } from '@/services/land-metadata'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/pocketbase/errors'

interface DateFieldConfig {
  key: string
  param: string
  label: string
}

const DATE_FIELDS: DateFieldConfig[] = [
  {
    key: 'data_assinatura_carta_proposta',
    param: 'dataAssinaturaCartaProposta',
    label: 'Data da Assinatura da Carta Proposta',
  },
  {
    key: 'data_pedido_inicio_ddl',
    param: 'dataPedidoInicioDdl',
    label: 'Data Pedido de Início de DDL',
  },
  {
    key: 'data_recebimento_preliminar_ddm',
    param: 'dataRecebimentoPreliminarDdm',
    label: 'Data Recebimento Preliminar DDL',
  },
  {
    key: 'data_estimada_recebimento_ddl_conclusiva',
    param: 'dataEstimadaRecebimentoDdlConclusiva',
    label: 'Data Estimada de Recebimento da DDL Conclusiva',
  },
  {
    key: 'data_recebimento_dd_conclusiva',
    param: 'dataRecebimentoDdConclusiva',
    label: 'Data de Recebimento da DD Conclusiva',
  },
]

interface ProcessDatesSectionProps {
  metadata: any
  externalId: string
  onUpdated?: () => void
}

export function ProcessDatesSection({ metadata, externalId, onUpdated }: ProcessDatesSectionProps) {
  const { toast } = useToast()
  const [savingField, setSavingField] = useState<string | null>(null)

  const handleDateChange = async (field: DateFieldConfig, date: Date | undefined) => {
    setSavingField(field.key)
    try {
      const value = date ? date.toISOString() : null
      await upsertLandMetadata(externalId, { [field.param]: value } as any)
      toast({ title: 'Data atualizada com sucesso' })
      onUpdated?.()
    } catch (error) {
      toast({
        title: 'Erro ao atualizar data',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setSavingField(null)
    }
  }

  const parseDate = (value: any): Date | undefined => {
    if (!value) return undefined
    try {
      return parseISO(value)
    } catch {
      return undefined
    }
  }

  return (
    <div className="bg-white p-5 rounded-xl border border-brand-primary/10 shadow-sm space-y-4 md:col-span-2">
      <h3 className="font-display text-lg text-brand-primary flex items-center gap-2 border-b border-brand-primary/5 pb-3">
        <CalendarIcon className="w-5 h-5 text-brand-secondary" /> Datas do Processo
      </h3>
      <div className="space-y-4">
        {DATE_FIELDS.map((field, index) => {
          const selected = parseDate(metadata?.[field.key])
          const isFirst = index === 0
          return (
            <div
              key={field.key}
              className={cn(
                'flex flex-col',
                !isFirst && 'sm:inline-block sm:w-[calc(50%-0.5rem)]',
                !isFirst && index % 2 === 0 && 'sm:mr-4',
              )}
            >
              <span className="text-[11px] text-brand-primary/60 font-semibold mb-1 uppercase tracking-wider">
                {field.label}
              </span>
              <div className="flex items-center gap-1">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'justify-start text-left font-normal h-10 rounded-lg flex-1',
                        !selected && 'text-brand-primary/40',
                      )}
                      disabled={savingField === field.key}
                    >
                      {savingField === field.key ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <CalendarIcon className="w-4 h-4 mr-2" />
                      )}
                      {selected
                        ? format(selected, 'dd/MM/yyyy', { locale: ptBR })
                        : 'Selecione uma data'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selected}
                      onSelect={(d) => handleDateChange(field, d)}
                      locale={ptBR}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {selected && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 shrink-0 text-brand-primary/40 hover:text-brand-critical"
                    disabled={savingField === field.key}
                    onClick={() => handleDateChange(field, undefined)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
