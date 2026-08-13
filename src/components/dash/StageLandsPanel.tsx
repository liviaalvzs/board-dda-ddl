import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarDays, ArrowRight, Timer } from 'lucide-react'
import { calculateStageLandSpans } from '@/lib/dash-utils'
import { getKanbanColumnColor, getKanbanColumnTitle } from '@/lib/kanban-columns'

interface StageLandsPanelProps {
  /** Etapa a detalhar. `null` fecha o painel. */
  stageId: string | null
  lands: unknown
  onClose: () => void
}

/**
 * Detalhamento da média de uma etapa: cada passagem que entrou na conta, da
 * mais longa para a mais curta.
 *
 * Existe para a média ser auditável — o número do gráfico sozinho não diz se
 * veio de duas terras ou de vinte, nem se uma sozinha está puxando tudo.
 */
export function StageLandsPanel({ stageId, lands, onClose }: StageLandsPanelProps) {
  const spans = useMemo(
    () => (stageId ? calculateStageLandSpans(lands, stageId) : []),
    [lands, stageId],
  )

  const summary = useMemo(() => {
    if (spans.length === 0) return null
    const total = spans.reduce((s, i) => s + i.days, 0)
    return {
      average: Math.round((total / spans.length) * 10) / 10,
      openCount: spans.filter((i) => i.isOpen).length,
      longest: spans[0].days,
      shortest: spans[spans.length - 1].days,
    }
  }, [spans])

  const stageColor = getKanbanColumnColor(stageId) || '#94a3b8'

  return (
    <Sheet open={!!stageId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-hidden bg-white p-0 sm:max-w-[520px]">
        <SheetHeader className="space-y-3 border-b border-brand-primary/10 p-6 pr-12">
          <div className="flex items-center gap-2.5">
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: stageColor }}
            />
            <SheetTitle className="font-display text-[22px] font-light leading-tight text-brand-primary">
              {getKanbanColumnTitle(stageId)}
            </SheetTitle>
          </div>
          <SheetDescription className="text-brand-primary/60">
            Cada passagem por esta etapa que entrou no cálculo da média. Uma terra que voltou para a
            etapa aparece mais de uma vez — é assim que a média é somada.
          </SheetDescription>

          {summary && (
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div className="rounded-xl border border-brand-primary/10 bg-brand-background/40 p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-primary/50">
                  Média
                </span>
                <p className="mt-1 font-display text-xl font-light leading-none text-brand-primary">
                  {summary.average}d
                </p>
              </div>
              <div className="rounded-xl border border-brand-primary/10 bg-brand-background/40 p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-primary/50">
                  Passagens
                </span>
                <p className="mt-1 font-display text-xl font-light leading-none text-brand-primary">
                  {spans.length}
                </p>
              </div>
              <div className="rounded-xl border border-brand-primary/10 bg-brand-background/40 p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-primary/50">
                  Faixa
                </span>
                <p className="mt-1 font-display text-xl font-light leading-none text-brand-primary">
                  {summary.shortest}–{summary.longest}d
                </p>
              </div>
            </div>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {spans.length === 0 ? (
            <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-brand-primary/15 text-sm text-brand-primary/50">
              Nenhuma passagem registrada nesta etapa.
            </div>
          ) : (
            <ul className="space-y-2">
              {spans.map((span, idx) => (
                <li key={`${span.externalId}-${idx}`}>
                  <Link
                    to={`/land/${span.externalId}`}
                    className="flex flex-col gap-2 rounded-xl border border-brand-primary/10 bg-white p-3.5 shadow-sm transition-colors hover:border-brand-secondary/50 hover:bg-brand-background/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-brand-primary">
                          {span.clusterSerial || span.name}
                        </p>
                        {span.clusterSerial && span.name !== span.clusterSerial && (
                          <p className="truncate text-xs text-brand-primary/50">{span.name}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {span.isOpen && (
                          <Badge className="border-none bg-brand-secondary/15 text-[9px] font-bold text-brand-primary">
                            EM CURSO
                          </Badge>
                        )}
                        <span className="text-sm font-bold tabular-nums text-brand-primary">
                          {span.days}d
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-brand-primary/55">
                      <CalendarDays className="h-3 w-3" />
                      <span>{format(span.start, 'dd/MM/yyyy', { locale: ptBR })}</span>
                      <ArrowRight className="h-3 w-3" />
                      {span.end ? (
                        <span>{format(span.end, 'dd/MM/yyyy', { locale: ptBR })}</span>
                      ) : (
                        <span className="italic">hoje</span>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {spans.length > 0 && (
            <p className="mt-4 flex items-start gap-2 text-[11px] leading-relaxed text-brand-primary/45">
              <Timer className="mt-0.5 h-3 w-3 shrink-0" />
              As passagens em curso contam com o tempo até hoje, então a média sobe sozinha enquanto
              a terra não sai da etapa.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
