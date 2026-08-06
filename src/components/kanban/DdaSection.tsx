import { Leaf, Clock, CheckCircle2, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ProcessDateField } from '@/components/kanban/ProcessDateField'
import { OfficeSelector } from '@/components/kanban/OfficeSelector'
import { DDA_MILESTONE, parseDateValue, calculateDdaFlag } from '@/lib/process-dates-helpers'

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
    <div className="bg-white p-5 rounded-xl border border-emerald-200/70 shadow-sm space-y-5 md:col-span-2">
      <div className="flex items-center justify-between gap-3 border-b border-emerald-100 pb-3">
        <h3 className="font-display text-[22px] font-light text-brand-primary flex items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100">
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

      <div className="hidden sm:grid grid-cols-[1fr_28px_1fr] gap-0 items-center pb-2 border-b border-brand-primary/10">
        <div className="flex items-center gap-1.5 text-[12px] text-brand-primary/50 font-semibold">
          <Clock className="w-3.5 h-3.5" /> {DDA_MILESTONE.planned.label}
        </div>
        <div />
        <div className="flex items-center gap-1.5 text-[12px] text-brand-primary/50 font-semibold">
          <CheckCircle2 className="w-3.5 h-3.5" /> {DDA_MILESTONE.actual.label}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_28px_1fr] gap-2 sm:gap-0 sm:items-center">
        <ProcessDateField
          field={DDA_MILESTONE.planned}
          milestoneTitle={DDA_MILESTONE.title}
          columnLabel={DDA_MILESTONE.planned.label}
          value={metadata?.[DDA_MILESTONE.planned.key]}
          externalId={externalId}
          variant="planned"
          onUpdated={onUpdated}
        />
        <div className="hidden sm:flex items-center justify-center text-brand-primary/30">
          <ArrowRight className="w-4 h-4" />
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
  )
}
