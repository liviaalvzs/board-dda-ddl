import { useState } from 'react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { History, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { getStatusLabel } from '@/lib/status-mapping'

interface FallbackHistoryItem {
  id: number
  action: string
  date: Date
}

interface ChangeHistoryCardProps {
  historyLogs: any[]
  fallbackHistory: FallbackHistoryItem[]
}

const FIELD_LABELS: Record<string, string> = {
  status: 'Status',
  responsible_user: 'Responsável',
  external_offices: 'Escritório Externo',
  owner_marital_status: 'Estado Civil',
  risk_level: 'Nível de Risco',
  dda_status: 'Status DDA',
}

export function ChangeHistoryCard({ historyLogs, fallbackHistory }: ChangeHistoryCardProps) {
  const [open, setOpen] = useState(true)

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="bg-white rounded-xl p-6 shadow-sm border border-brand-primary/10">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className={cn(
              'flex w-full items-center justify-between gap-3 text-left',
              open ? 'mb-6' : 'mb-0',
            )}
          >
            <h3 className="font-display text-lg text-brand-primary flex items-center gap-2">
              <History className="w-5 h-5 text-brand-secondary" /> Histórico de Alterações
            </h3>
            <ChevronDown
              className={cn(
                'w-4 h-4 shrink-0 text-brand-primary/50 transition-transform',
                open && 'rotate-180',
              )}
            />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="space-y-6 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-brand-primary/10 before:to-transparent">
            {historyLogs.length > 0
              ? historyLogs.map((item) => {
                  const userName =
                    item.expand?.user_id?.name || item.expand?.user_id?.email || 'Sistema'
                  const field =
                    FIELD_LABELS[item.change_details?.field] ||
                    item.change_details?.field ||
                    'Campo'
                  const actionDesc = `${userName} alterou ${field}`

                  return (
                    <div
                      key={item.id}
                      className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
                    >
                      <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-white bg-brand-secondary shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2"></div>
                      <div className="w-[calc(100%-3rem)] md:w-[calc(50%-1.5rem)] bg-white p-4 rounded-xl border border-brand-primary/10 shadow-sm">
                        <div className="flex flex-col mb-1">
                          <span className="font-bold text-sm text-brand-primary">{actionDesc}</span>
                          <span className="text-xs text-brand-primary/70 mt-1">
                            De:{' '}
                            <span className="font-semibold">
                              {item.change_details?.field === 'status'
                                ? getStatusLabel(item.change_details?.old)
                                : item.change_details?.old || 'N/A'}
                            </span>{' '}
                            <br />
                            Para:{' '}
                            <span className="font-semibold">
                              {item.change_details?.field === 'status'
                                ? getStatusLabel(item.change_details?.new)
                                : item.change_details?.new || 'N/A'}
                            </span>
                          </span>
                        </div>
                        <time className="text-xs font-medium text-brand-primary/50 block mt-2">
                          {formatDistanceToNow(new Date(item.created), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </time>
                      </div>
                    </div>
                  )
                })
              : fallbackHistory.map((item) => (
                  <div
                    key={item.id}
                    className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
                  >
                    <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-white bg-brand-secondary shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2"></div>
                    <div className="w-[calc(100%-3rem)] md:w-[calc(50%-1.5rem)] bg-white p-4 rounded-xl border border-brand-primary/10 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm text-brand-primary">{item.action}</span>
                      </div>
                      <time className="text-xs font-medium text-brand-primary/50">
                        {formatDistanceToNow(item.date, { addSuffix: true, locale: ptBR })}
                      </time>
                    </div>
                  </div>
                ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
