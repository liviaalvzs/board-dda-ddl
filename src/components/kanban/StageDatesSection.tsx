import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarIcon, Loader2, X, Settings2, Info } from 'lucide-react'
import { upsertLandMetadata } from '@/services/land-metadata'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { parseDateValue } from '@/lib/process-dates-helpers'
import { parseStageDates, getEditableStages, buildStageSpans } from '@/lib/stage-dates-helpers'

interface StageDatesSectionProps {
  metadata: any
  externalId: string
  onUpdated?: (record: any) => void
}

/**
 * Ajuste das datas de entrada em cada etapa.
 *
 * Só as etapas até a atual aparecem: a terra ainda não passou pelas seguintes,
 * então não há data de entrada a informar. Alterar aqui muda a contagem de dias
 * no card do board e as médias do dashboard, que leem do mesmo campo.
 */
export function StageDatesSection({ metadata, externalId, onUpdated }: StageDatesSectionProps) {
  const { toast } = useToast()
  const [savingStage, setSavingStage] = useState<string | null>(null)
  const [openStage, setOpenStage] = useState<string | null>(null)

  const currentStage = metadata?.status || ''
  const stageDates = parseStageDates(metadata?.stage_dates)
  const editableStages = getEditableStages(currentStage)
  const spans = buildStageSpans(metadata?.stage_dates)
  const daysByStage = new Map(spans.map((s) => [s.stageId, s.days]))

  const handleChange = async (stageId: string, date: Date | undefined) => {
    setOpenStage(null)
    setSavingStage(stageId)

    const next = { ...stageDates }
    if (date) {
      next[stageId] = date.toISOString()
    } else {
      delete next[stageId]
    }

    try {
      const result = await upsertLandMetadata(externalId, { stageDates: next })
      toast({ title: 'Data da etapa atualizada' })
      onUpdated?.(result)
    } catch (err) {
      toast({
        title: 'Erro ao salvar data da etapa',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setSavingStage(null)
    }
  }

  if (editableStages.length === 0) {
    return (
      <div className="bg-white p-5 rounded-xl border border-brand-primary/10 shadow-sm md:col-span-2">
        <h3 className="font-display text-[22px] font-light text-brand-primary flex items-center gap-2 border-b border-brand-primary/5 pb-3">
          <Settings2 className="w-5 h-5 text-brand-secondary" />
          Datas das etapas
        </h3>
        <p className="text-sm text-brand-primary/60 mt-4">
          Esta terra ainda não está em nenhuma etapa do board.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white p-5 rounded-xl border border-brand-primary/10 shadow-sm space-y-4 md:col-span-2">
      <h3 className="font-display text-[22px] font-light text-brand-primary flex items-center gap-2 border-b border-brand-primary/5 pb-3">
        <Settings2 className="w-5 h-5 text-brand-secondary" />
        Datas das etapas
      </h3>

      <div className="flex items-start gap-2 rounded-lg bg-slate-50 border border-brand-primary/10 p-3">
        <Info className="w-4 h-4 text-brand-primary/40 shrink-0 mt-0.5" />
        <p className="text-xs text-brand-primary/70 leading-relaxed">
          Quando a terra entrou em cada etapa. A data é preenchida automaticamente ao mover o card,
          e pode ser corrigida aqui. Isso altera a contagem de dias no board e as médias do
          dashboard.
        </p>
      </div>

      <div className="divide-y divide-brand-primary/10">
        {editableStages.map((stage) => {
          const selected = parseDateValue(stageDates[stage.id])
          const isCurrent = stage.id === currentStage
          const days = daysByStage.get(stage.id)
          const saving = savingStage === stage.id

          return (
            <div key={stage.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
              <div className="flex flex-1 items-center gap-2 min-w-0">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: stage.color }}
                />
                <span className="text-sm font-medium text-brand-primary truncate">
                  {stage.title}
                </span>
                {isCurrent && (
                  <span className="shrink-0 rounded-full bg-brand-secondary/10 px-2 py-0.5 text-[10px] font-bold text-brand-secondary">
                    ATUAL
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {selected && typeof days === 'number' && (
                  <span className="mr-1 text-[11px] font-medium text-brand-primary/50">
                    {days} {days === 1 ? 'dia' : 'dias'}
                  </span>
                )}
                <Popover
                  open={openStage === stage.id}
                  onOpenChange={(v) => !saving && setOpenStage(v ? stage.id : null)}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      disabled={saving}
                      className={cn(
                        'h-10 justify-start rounded-lg border-0 bg-slate-100 text-left text-sm font-normal text-brand-primary sm:w-[190px]',
                        !selected && 'text-brand-primary/40',
                      )}
                      aria-label={`Data de entrada em ${stage.title}`}
                    >
                      {saving ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CalendarIcon className="mr-2 h-4 w-4" />
                      )}
                      {selected
                        ? format(selected, 'dd/MM/yyyy', { locale: ptBR })
                        : 'selecione uma data'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={selected}
                      onSelect={(date) => handleChange(stage.id, date)}
                      locale={ptBR}
                      initialFocus
                      disabled={saving}
                    />
                  </PopoverContent>
                </Popover>
                {selected && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 shrink-0 text-brand-primary/40 hover:text-brand-critical"
                    disabled={saving}
                    onClick={() => handleChange(stage.id, undefined)}
                    aria-label={`Limpar data de ${stage.title}`}
                  >
                    <X className="h-4 w-4" />
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
