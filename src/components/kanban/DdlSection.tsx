import { useState } from 'react'
import {
  Scale,
  Clock,
  CheckCircle2,
  ArrowRight,
  Lock,
  Info,
  CalendarIcon,
  Loader2,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { ProcessDateField } from '@/components/kanban/ProcessDateField'
import { OfficeSelector } from '@/components/kanban/OfficeSelector'
import { DDL_MILESTONE, parseDateValue, calculateDiligenceFlag } from '@/lib/process-dates-helpers'
import { DDL_UNLOCK_STAGE_ID, hasReachedStage, parseStageDates } from '@/lib/stage-dates-helpers'
import { getKanbanColumnTitle } from '@/lib/kanban-columns'
import { upsertLandMetadata } from '@/services/land-metadata'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface DdlSectionProps {
  metadata: any
  externalId: string
  onUpdated?: (record: any) => void
}

/**
 * Bloco da Diligência (DDL), no mesmo formato da Diligência Ambiental: data
 * estimada, data de recebimento, sinalização de prazo e o prestador — que aqui
 * é o próprio escritório externo, e não um prestador à parte como na DDA.
 *
 * Fica somente leitura até a terra chegar em "4. Em auditoria / Escritório
 * externo": antes disso a diligência ainda não foi enviada ao escritório, então
 * não existe prazo a informar e preencher ali só geraria dado inventado.
 */
const STAGE_4_ID = 'auditoria-escritorio-externo'
const STAGE_5_ID = 'recebimento-ddl-preliminar'

export function DdlSection({ metadata, externalId, onUpdated }: DdlSectionProps) {
  const { toast } = useToast()
  const [savingRecebimento, setSavingRecebimento] = useState(false)
  const [recebimentoOpen, setRecebimentoOpen] = useState(false)

  const plannedDate = parseDateValue(metadata?.[DDL_MILESTONE.planned.key])
  const actualDate = parseDateValue(metadata?.[DDL_MILESTONE.actual.key])
  const flag = calculateDiligenceFlag(plannedDate, actualDate, 'Diligência')

  const unlocked = hasReachedStage(metadata?.status, metadata?.stage_dates, DDL_UNLOCK_STAGE_ID)

  const stageDates = parseStageDates(metadata?.stage_dates)
  const dataPedido = parseDateValue(stageDates[STAGE_4_ID])
  const dataRecebimentoEtapa = parseDateValue(stageDates[STAGE_5_ID])

  const handleRecebimentoChange = async (date: Date | undefined) => {
    setRecebimentoOpen(false)
    setSavingRecebimento(true)
    const next = { ...stageDates }
    if (date) {
      next[STAGE_5_ID] = date.toISOString()
    } else {
      delete next[STAGE_5_ID]
    }
    try {
      const result = await upsertLandMetadata(externalId, { stageDates: next })
      toast({ title: 'Data de recebimento atualizada' })
      onUpdated?.(result)
    } catch (err) {
      toast({ title: 'Erro ao salvar', description: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setSavingRecebimento(false)
    }
  }

  return (
    <div
      className={cn(
        'p-5 rounded-xl border-2 shadow-sm space-y-5 md:col-span-2 ring-1',
        unlocked
          ? 'bg-indigo-50/40 border-indigo-300 ring-indigo-200/50'
          : 'bg-slate-50/60 border-slate-200 ring-slate-100',
      )}
    >
      <div
        className={cn(
          'flex items-center justify-between gap-3 border-b pb-3',
          unlocked ? 'border-indigo-200' : 'border-slate-200',
        )}
      >
        <h3 className="font-display text-[22px] font-light text-brand-primary flex items-center gap-2">
          <span
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-2',
              unlocked ? 'bg-indigo-100 ring-indigo-300/60' : 'bg-slate-200 ring-slate-300/60',
            )}
          >
            {unlocked ? (
              <Scale className="h-4 w-4 text-indigo-700" />
            ) : (
              <Lock className="h-4 w-4 text-slate-500" />
            )}
          </span>
          Diligência
        </h3>
        <span
          className={cn(
            'text-[12px] px-[10px] py-[3px] rounded-lg font-medium shrink-0',
            unlocked ? flag.className : 'bg-slate-200 text-slate-600',
          )}
          aria-live="polite"
        >
          {unlocked ? flag.text : 'Bloqueada'}
        </span>
      </div>

      {!unlocked && (
        <p className="text-[13px] leading-relaxed text-brand-primary/60">
          Os campos são liberados quando a terra chega em{' '}
          <strong className="font-semibold text-brand-primary/80">
            {getKanbanColumnTitle(DDL_UNLOCK_STAGE_ID)}
          </strong>{' '}
          ou em uma etapa posterior.
        </p>
      )}

      <OfficeSelector
        metadata={metadata}
        externalId={externalId}
        fieldName="externalOffices"
        expandKey="external_offices"
        label="Escritório externo"
        disabled={!unlocked}
        onUpdated={onUpdated}
      />

      {/* 3 datas: Pedido → Estimada → Recebimento */}
      {unlocked && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* 1. Data do pedido — read-only */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-[12px] text-brand-primary/50 font-semibold">
              <CalendarIcon className="w-3.5 h-3.5" />
              Data do pedido
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3 h-3 text-brand-primary/30 cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs max-w-[220px]">
                  Data em que a terra entrou na etapa 4 (Em auditoria). Alterável apenas em Prazos e
                  Etapas.
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="h-10 flex items-center rounded-lg bg-slate-100 px-3 text-sm text-brand-primary">
              {dataPedido ? format(dataPedido, 'dd/MM/yyyy', { locale: ptBR }) : '—'}
            </div>
          </div>

          {/* 2. Data estimada — editável (campo existente) */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-[12px] text-brand-primary/50 font-semibold">
              <Clock className="w-3.5 h-3.5" />
              {DDL_MILESTONE.planned.label}
            </div>
            <ProcessDateField
              field={DDL_MILESTONE.planned}
              milestoneTitle={DDL_MILESTONE.title}
              columnLabel={DDL_MILESTONE.planned.label}
              value={metadata?.[DDL_MILESTONE.planned.key]}
              externalId={externalId}
              variant="planned"
              disabled={!unlocked}
              onUpdated={onUpdated}
            />
          </div>

          {/* 3. Data de recebimento — read-only (stage 4→5) */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-[12px] text-brand-primary/50 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Data de recebimento
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3 h-3 text-brand-primary/30 cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs max-w-[220px]">
                  Data em que a terra passou para a etapa 5 (Recebimento DDL preliminar). Alterável
                  apenas em Prazos e Etapas.
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="h-10 flex items-center rounded-lg bg-slate-100 px-3 text-sm text-brand-primary">
              {dataRecebimentoEtapa
                ? format(dataRecebimentoEtapa, 'dd/MM/yyyy', { locale: ptBR })
                : '—'}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
