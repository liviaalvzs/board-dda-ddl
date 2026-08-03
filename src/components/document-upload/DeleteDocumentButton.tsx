import { useState } from 'react'
import { Trash2, Loader2, AlertTriangle } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { deleteDocument } from '@/services/document-upload'

interface DeleteDocumentButtonProps {
  checkId: string
  documentLabel: string
  onDeleted: () => void
}

/**
 * Exclui o documento enviado (arquivo no S3 + registro). Só aparece para
 * administradores — o hook também valida o papel no backend, já que esconder o
 * botão não é controle de acesso.
 *
 * A confirmação usa Popover, e não AlertDialog, de propósito: este botão é
 * renderizado dentro do Sheet de detalhe da terra, e dois modais Radix
 * aninhados empilham os overlays e deixam `pointer-events: none` preso no body,
 * travando a página inteira.
 */
export function DeleteDocumentButton({
  checkId,
  documentLabel,
  onDeleted,
}: DeleteDocumentButtonProps) {
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const { role } = useAuth()
  const { toast } = useToast()

  if (role !== 'admin') return null

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteDocument(checkId)
      toast({ title: `Documento ${documentLabel} excluído.` })
      setOpen(false)
      onDeleted()
    } catch (err) {
      toast({ title: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={(v) => !deleting && setOpen(v)}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 shrink-0 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
          aria-label={`Excluir ${documentLabel}`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="top" align="end" className="w-72">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-brand-primary">Excluir documento?</p>
            <p className="text-xs text-brand-primary/70 leading-relaxed">
              O arquivo de <strong>{documentLabel}</strong> será apagado definitivamente do S3 e o
              registro de envio será removido. Não é possível desfazer.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
            disabled={deleting}
            className="h-8 text-xs"
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
            className="h-8 text-xs bg-rose-600 hover:bg-rose-700 text-white"
          >
            {deleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Excluindo...
              </>
            ) : (
              'Excluir'
            )}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
