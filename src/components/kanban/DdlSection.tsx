import { Scale, Clock, CheckCircle2, ArrowRight, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ProcessDateField } from '@/components/kanban/ProcessDateField'
import { OfficeSelector } from '@/components/kanban/OfficeSelector'
import { DDL_MILESTONE, parseDateValue, calculateDiligenceFlag } from '@/lib/process-dates-helpers'
import { DDL_UNLOCK_STAGE_ID, hasReachedStage } from '@/lib/stage-dates-helpers'
import { getKanbanColumnTitle } from '@/lib/kanban-columns'

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
export function DdlSection({ metadata, externalId, onUpdated }: DdlSectionProps) {
  const plannedDate = parseDateValue(metadata?.[DDL_MILESTONE.planned.key])
  const actualDate = parseDateValue(metadata?.[DDL_MILESTONE.actual.key])
  const flag = calculateDiligenceFlag(plannedDate, actualDate, 'Diligência')

  const unlocked = hasReachedStage(metadata?.status, metadata?.stage_dates, DDL_UNLOCK_STAGE_ID)

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

      <div className="hidden sm:grid grid-cols-[1fr_28px_1fr] gap-0 items-center pb-2 border-b border-brand-primary/10">
        <div className="flex items-center gap-1.5 text-[12px] text-brand-primary/50 font-semibold">
          <Clock className="w-3.5 h-3.5" /> {DDL_MILESTONE.planned.label}
        </div>
        <div />
        <div className="flex items-center gap-1.5 text-[12px] text-brand-primary/50 font-semibold">
          <CheckCircle2 className="w-3.5 h-3.5" /> {DDL_MILESTONE.actual.label}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_28px_1fr] gap-2 sm:gap-0 sm:items-center">
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
        <div className="hidden sm:flex items-center justify-center text-brand-primary/30">
          <ArrowRight className="w-4 h-4" />
        </div>
        <ProcessDateField
          field={DDL_MILESTONE.actual}
          milestoneTitle={DDL_MILESTONE.title}
          columnLabel={DDL_MILESTONE.actual.label}
          value={metadata?.[DDL_MILESTONE.actual.key]}
          externalId={externalId}
          variant="actual"
          isPlannedFilled={!!plannedDate}
          disabled={!unlocked}
          onUpdated={onUpdated}
        />
      </div>
    </div>
  )
}
