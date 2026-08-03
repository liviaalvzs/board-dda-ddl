import { format } from 'date-fns'
import { FileText, User, Clock } from 'lucide-react'
import { getDocumentLabel } from '@/lib/document-labels'
import { DocumentFileActions } from '@/components/document-upload/DocumentFileActions'

interface DocumentHistoryProps {
  records: any[]
}

export function DocumentHistory({ records }: DocumentHistoryProps) {
  const sorted = [...records].sort(
    (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime(),
  )

  if (sorted.length === 0) {
    return (
      <div className="bg-white p-6 rounded-xl border border-dashed border-brand-primary/20 text-center">
        <FileText className="w-8 h-8 text-brand-primary/20 mx-auto mb-2" />
        <p className="text-sm text-brand-primary/50">Nenhum documento enviado ainda.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-brand-primary/10 shadow-sm overflow-hidden">
      <div className="bg-brand-primary/[0.02] px-5 py-4 border-b border-brand-primary/5">
        <h4 className="font-semibold text-brand-primary text-[15px] flex items-center gap-2">
          <FileText className="w-4 h-4 text-brand-primary/50" />
          Histórico de Documentos Enviados
        </h4>
      </div>
      <div className="divide-y divide-brand-primary/5">
        {sorted.map((record, i) => {
          const userName =
            record.expand?.user?.name || record.expand?.user?.email?.split('@')[0] || 'Desconhecido'
          const hasFile = !!record.document_url
          const label = getDocumentLabel(record.document_key)

          return (
            <div
              key={record.id || i}
              className="flex items-center justify-between gap-4 p-4 hover:bg-brand-primary/[0.01] transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <FileText className="w-4 h-4 text-brand-primary/40 shrink-0" />
                <div className="min-w-0">
                  <span className="text-sm font-semibold text-brand-primary block truncate">
                    {label}
                  </span>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="text-[11px] text-brand-primary/60 flex items-center gap-1">
                      <User className="w-3 h-3" /> {userName}
                    </span>
                    <span className="text-[11px] text-brand-primary/60 flex items-center gap-1">
                      <Clock className="w-3 h-3" />{' '}
                      {format(new Date(record.created), 'dd/MM/yyyy HH:mm')}
                    </span>
                  </div>
                </div>
              </div>
              {hasFile && record.id && (
                <DocumentFileActions
                  checkId={record.id}
                  documentLabel={label}
                  className="shrink-0"
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
