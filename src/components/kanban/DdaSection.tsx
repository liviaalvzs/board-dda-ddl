import { Leaf, Clock, CheckCircle2, CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ProcessDateField } from '@/components/kanban/ProcessDateField'
import { OfficeSelector } from '@/components/kanban/OfficeSelector'
import {
  DDA_MILESTONE,
  DATA_SOLICITACAO_DD,
  parseDateValue,
  calculateDdaFlag,
} from '@/lib/process-dates-helpers'

interface DdaSectionProps {
  metadata: any
  externalId: string
  onUpdated?: (record: any) => void
}

/**
 * Bloco próprio da Diligência Ambiental: data estimada, data de recebimento,
 * sinalização de prazo e o prestador responsável.
 *
 * Separado das demais datas do processo porque a DDA é conduzida por um
 * prestador distinto do escritório de advocacia e tem acompanhamento próprio —
 * a mesma sinalização aparece no card do board.
 */
export function DdaSection({ metadata, externalId, onUpdated }: DdaSectionProps) {
  const plannedDate = parseDateValue(metadata?.[DDA_MILESTONE.planned.key])
  const actualDate = parseDateValue(metadata?.[DDA_MILESTONE.actual.key])
  const flag = calculateDdaFlag(plannedDate, actualDate)

  return (
    <div className="bg-emerald-50/40 p-5 rounded-xl border-2 border-emerald-300 shadow-sm space-y-5 md:col-span-2 ring-1 ring-emerald-200/50">
      <div className="flex items-center justify-between gap-3 border-b border-emerald-200 pb-3">
        <h3 className="font-display text-[22px] font-light text-brand-primary flex items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 ring-2 ring-emerald-300/60">
            <Leaf className="h-4 w-4 text-emerald-700" />
          </span>
          Diligência Ambiental
        </h3>
        <span
          className={cn(
            'text-[12px] px-[10px] py-[3px] rounded-lg font-medium shrink-0',
            flag.className,
          )}
          aria-live="polite"
        >
          {flag.text}
        </span>
      </div>

      <OfficeSelector
        metadata={metadata}
        externalId={externalId}
        fieldName="prestadorDda"
        expandKey="prestador_dda"
        label="Prestador DDA"
        onUpdated={onUpdated}
      />

      {/* 3 datas: Pedido → Estimada → Recebimento */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* 1. Data do pedido */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[12px] text-brand-primary/50 font-semibold">
            <CalendarIcon className="w-3.5 h-3.5" />
            Data do pedido
          </div>
          <ProcessDateField
            field={DATA_SOLICITACAO_DD}
            milestoneTitle={DDA_MILESTONE.title}
            columnLabel="Data do pedido"
            value={metadata?.[DATA_SOLICITACAO_DD.key]}
            externalId={externalId}
            variant="planned"
            onUpdated={onUpdated}
          />
        </div>

        {/* 2. Data estimada */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[12px] text-brand-primary/50 font-semibold">
            <Clock className="w-3.5 h-3.5" />
            {DDA_MILESTONE.planned.label}
          </div>
          <ProcessDateField
            field={DDA_MILESTONE.planned}
            milestoneTitle={DDA_MILESTONE.title}
            columnLabel={DDA_MILESTONE.planned.label}
            value={metadata?.[DDA_MILESTONE.planned.key]}
            externalId={externalId}
            variant="planned"
            onUpdated={onUpdated}
          />
        </div>

        {/* 3. Data de recebimento */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[12px] text-brand-primary/50 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {DDA_MILESTONE.actual.label}
          </div>
          <ProcessDateField
            field={DDA_MILESTONE.actual}
            milestoneTitle={DDA_MILESTONE.title}
            columnLabel={DDA_MILESTONE.actual.label}
            value={metadata?.[DDA_MILESTONE.actual.key]}
            externalId={externalId}
            variant="actual"
            isPlannedFilled={!!plannedDate}
            onUpdated={onUpdated}
          />
        </div>
      </div>
    </div>
  )
}
