import {
  MapPin,
  Clock,
  FileText,
  Building2,
  Loader2,
  CheckCircle2,
  Leaf,
  Scale,
} from 'lucide-react'
import { KanbanCardType } from '@/types/kanban'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { useNavigate } from 'react-router-dom'
import { differenceInDays, differenceInHours, format } from 'date-fns'
import { useDelayedThreshold } from '@/hooks/use-delayed-threshold'
import { getDocumentLabel } from '@/lib/document-labels'
import {
  parseDateValue,
  calculateDdaFlag,
  calculateDiligenceFlag,
} from '@/lib/process-dates-helpers'
import {
  getCurrentStageEntry,
  hasReachedStage,
  DDL_UNLOCK_STAGE_ID,
} from '@/lib/stage-dates-helpers'
import {
  DOCUMENT_GROUP_SHORT_LABEL,
  emptyDocumentProgress,
  progressPercent,
  type DocumentGroupProgress,
} from '@/lib/document-groups'

/** Uma linha de progresso — básicos ou certidões. */
function DocProgressRow({
  icon: Icon,
  label,
  progress,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  progress: DocumentGroupProgress
}) {
  const percent = progressPercent(progress)

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-[10px] text-slate-600 font-bold">
        <span className="flex items-center gap-1">
          <Icon className="w-3 h-3 text-brand-primary/60" /> {label}: {progress.completed}/
          {progress.total}
        </span>
        <span className="text-brand-secondary">{Math.round(percent)}%</span>
      </div>
      <Progress
        value={percent}
        className="h-1.5 bg-slate-200"
        indicatorClassName="bg-brand-secondary"
      />
    </div>
  )
}

interface KanbanCardProps {
  card: KanbanCardType
  onDragStart: (e: React.DragEvent<HTMLDivElement>, cardId: string) => void
}

export function KanbanCard({ card, onDragStart }: KanbanCardProps) {
  const navigate = useNavigate()
  const { threshold: delayedThreshold } = useDelayedThreshold()
  const attentionThreshold = Math.max(1, Math.floor(delayedThreshold / 2))

  const createdDate = new Date(card.createdAt || new Date())

  const isNew = differenceInHours(new Date(), createdDate) <= 48

  // Conta a partir da data de entrada na etapa, não de `updated` — aquele campo
  // é bumpado por qualquer edição do registro e zerava o contador sem que a
  // etapa tivesse mudado. A data é editável na tela da terra.
  const stageEntry = getCurrentStageEntry(card.stageDates, card.stageId)
  const daysInStatus = stageEntry ? differenceInDays(new Date(), stageEntry) : null

  const isDelayed = daysInStatus !== null && daysInStatus > delayedThreshold
  const needsAttention = daysInStatus !== null && !isDelayed && daysInStatus > attentionThreshold

  const urgencyClass = isDelayed
    ? 'bg-white border-rose-200'
    : needsAttention
      ? 'bg-white border-amber-200'
      : 'bg-white border-slate-200'
  const hoverClass = isDelayed
    ? 'hover:border-rose-400'
    : needsAttention
      ? 'hover:border-amber-400'
      : 'hover:border-brand-secondary/60'

  const urgencyBadge = isDelayed ? (
    <Badge className="bg-rose-500 hover:bg-rose-600 text-white text-[9px] px-1.5 py-0 border-none font-bold">
      ATRASADO
    </Badge>
  ) : needsAttention ? (
    <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-[9px] px-1.5 py-0 border-none font-bold">
      ATENÇÃO
    </Badge>
  ) : null

  const ddaFlag = calculateDdaFlag(
    parseDateValue(card.ddaEstimatedDate),
    parseDateValue(card.ddaReceivedDate),
  )

  // A DDL só é conduzida a partir de "4. Em auditoria / Escritório externo".
  // Antes disso o selo diria "não solicitada" para toda terra nova, virando
  // ruído em três colunas inteiras do board — a mesma regra que trava a edição
  // do bloco na tela da terra.
  const showDdlFlag = hasReachedStage(card.stageId, card.stageDates, DDL_UNLOCK_STAGE_ID)
  const ddlFlag = calculateDiligenceFlag(
    parseDateValue(card.ddlEstimatedDate),
    parseDateValue(card.ddlReceivedDate),
    'DDL',
  )

  // Os totais vêm dos tipos cadastrados. Enquanto eles não carregam, os dois
  // grupos ficam zerados e as barras não são renderizadas — melhor do que
  // mostrar "0/0" e parecer que nada foi entregue.
  const docProgress = card.docProgress || emptyDocumentProgress()

  return (
    <div
      draggable={!card.isSaving}
      onDragStart={(e) => {
        if (!card.isSaving) onDragStart(e, card.id)
      }}
      onClick={() => {
        if (!card.isSaving) navigate(`/land/${card.id}`)
      }}
      className={cn(
        'relative rounded-xl p-4 shadow-sm border transition-all duration-200 group animate-slide-up flex flex-col gap-3',
        urgencyClass,
        hoverClass,
        card.isSaving ? 'cursor-wait opacity-60' : 'cursor-grab active:cursor-grabbing',
      )}
    >
      {card.isSaving && (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-white/50 backdrop-blur-sm">
          <div className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 shadow-md">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-primary" />
            <span className="text-xs font-semibold text-slate-700">Salvando...</span>
          </div>
        </div>
      )}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-start gap-2">
          <span className="text-slate-500 font-bold text-[10px] tracking-widest uppercase bg-white/60 px-1.5 py-0.5 rounded">
            {card.clusterSerial || card.id}
          </span>
          <div className="flex gap-1 flex-wrap justify-end">
            {urgencyBadge}
            {isNew && (
              <Badge className="bg-brand-primary text-white hover:bg-brand-primary/90 text-[9px] px-1.5 py-0">
                NOVO
              </Badge>
            )}
          </div>
        </div>

        <h4 className="font-semibold text-sm text-slate-800 leading-snug group-hover:text-brand-secondary transition-colors line-clamp-2">
          {card.name ? card.name : card.title}
        </h4>
      </div>

      <div className="flex items-center flex-wrap gap-1.5">
        <Badge
          variant="outline"
          className="bg-white/60 text-slate-700 font-bold text-[10px] px-2 py-0 border-slate-200 shadow-sm"
        >
          {card.area.toLocaleString('pt-BR')} ha
        </Badge>
        <Badge
          variant="outline"
          className={cn(
            'font-bold text-[10px] px-2 py-0 border-none shadow-sm inline-flex items-center gap-1',
            ddaFlag.badgeClassName,
          )}
        >
          <Leaf className="w-2.5 h-2.5" />
          {ddaFlag.text}
        </Badge>
        {showDdlFlag && (
          <Badge
            variant="outline"
            className={cn(
              'font-bold text-[10px] px-2 py-0 border-none shadow-sm inline-flex items-center gap-1',
              ddlFlag.badgeClassName,
            )}
          >
            <Scale className="w-2.5 h-2.5" />
            {ddlFlag.text}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-1.5 text-xs text-slate-600">
        <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
        <span
          className="truncate font-medium"
          title={`${card.location.city}, ${card.location.state}`}
        >
          {card.location.city}, {card.location.state}
        </span>
      </div>

      <div className="bg-white/60 p-2.5 rounded-lg border border-slate-200/60 space-y-2.5 mt-1">
        {docProgress.basicos.total > 0 && (
          <DocProgressRow
            icon={FileText}
            label={DOCUMENT_GROUP_SHORT_LABEL.basicos}
            progress={docProgress.basicos}
          />
        )}
        {docProgress.certidoes.total > 0 && (
          <DocProgressRow
            icon={Award}
            label={DOCUMENT_GROUP_SHORT_LABEL.certidoes}
            progress={docProgress.certidoes}
          />
        )}
        {card.documentChecks && card.documentChecks.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {card.documentChecks.slice(0, 4).map((doc, i) => (
              <Tooltip key={i}>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    {getDocumentLabel(doc.documentKey)}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  <p className="font-semibold">Enviado por: {doc.userName}</p>
                  <p className="text-muted-foreground">
                    {format(new Date(doc.createdAt), 'dd/MM/yyyy HH:mm')}
                  </p>
                </TooltipContent>
              </Tooltip>
            ))}
            {card.documentChecks.length > 4 && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                +{card.documentChecks.length - 4}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 mt-1">
        <div
          className={cn(
            'flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-md',
            daysInStatus === null
              ? 'bg-slate-100 text-slate-500'
              : isDelayed
                ? 'bg-rose-100 text-rose-700'
                : needsAttention
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-emerald-100 text-emerald-700',
          )}
        >
          <Clock className="w-3 h-3" />
          <span>
            {daysInStatus === null
              ? 'Data da etapa não informada'
              : `${daysInStatus} ${daysInStatus === 1 ? 'dia' : 'dias'} na etapa`}
          </span>
        </div>

        <div
          className={cn(
            'flex items-center gap-1.5 font-bold text-[10px] px-2 py-1 rounded-md transition-colors max-w-[120px] shadow-sm',
            !card.externalOffice ||
              card.externalOffice === 'Sem Escritório' ||
              card.externalOffice === 'Pendente'
              ? 'bg-slate-100 text-slate-500 border border-slate-200'
              : 'bg-white text-slate-700 border border-slate-200',
          )}
        >
          <Building2 className="w-3 h-3 shrink-0" />
          <span className="truncate" title={card.externalOffice || 'Sem Escritório'}>
            {card.externalOffice || 'Sem Escritório'}
          </span>
        </div>
      </div>
    </div>
  )
}
