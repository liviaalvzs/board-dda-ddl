import { useState } from 'react'
import { Eye, Download, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { getDocumentFileUrl } from '@/services/document-upload'
import { cn } from '@/lib/utils'

interface DocumentFileActionsProps {
  checkId: string
  documentLabel: string
  className?: string
}

/**
 * Botões de visualizar e baixar. Os arquivos vivem só no S3, num bucket privado,
 * então não há URL fixa que o navegador consiga abrir: a cada clique o backend
 * assina um acesso temporário àquele objeto e nós redirecionamos para ele.
 */
export function DocumentFileActions({
  checkId,
  documentLabel,
  className,
}: DocumentFileActionsProps) {
  const [loading, setLoading] = useState<'inline' | 'attachment' | null>(null)
  const { toast } = useToast()

  const open = async (disposition: 'inline' | 'attachment') => {
    // A aba precisa ser aberta no clique, antes do await: se abrisse depois da
    // resposta, o navegador trataria como popup e bloquearia.
    const tab = disposition === 'inline' ? window.open('', '_blank') : null
    setLoading(disposition)
    try {
      const url = await getDocumentFileUrl(checkId, disposition)
      if (disposition === 'inline') {
        if (tab) tab.location.href = url
        else window.location.href = url
      } else {
        window.location.href = url
      }
    } catch (err) {
      if (tab) tab.close()
      toast({ title: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setLoading(null)
    }
  }

  const buttonClass =
    'h-10 px-3 rounded-lg border border-brand-primary/15 text-brand-primary/70 hover:text-brand-secondary hover:border-brand-secondary/40 flex items-center gap-1.5 text-xs font-semibold transition-colors disabled:opacity-50'

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <button
        type="button"
        onClick={() => open('inline')}
        disabled={loading !== null}
        className={buttonClass}
        aria-label={`Visualizar ${documentLabel}`}
      >
        {loading === 'inline' ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Eye className="w-4 h-4" />
        )}
        Ver
      </button>
      <button
        type="button"
        onClick={() => open('attachment')}
        disabled={loading !== null}
        className={buttonClass}
        aria-label={`Baixar ${documentLabel}`}
      >
        {loading === 'attachment' ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        Baixar
      </button>
    </div>
  )
}
