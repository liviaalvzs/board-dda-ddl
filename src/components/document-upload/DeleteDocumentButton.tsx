import { useState } from 'react'
import { Trash2, Loader2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-9 shrink-0 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
        aria-label={`Excluir ${documentLabel}`}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Button>

      <AlertDialog open={open} onOpenChange={(v) => !deleting && setOpen(v)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir documento?</AlertDialogTitle>
            <AlertDialogDescription>
              O arquivo de <strong>{documentLabel}</strong> será apagado definitivamente do S3 e o
              registro de envio será removido. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(ev) => {
                ev.preventDefault()
                handleDelete()
              }}
              disabled={deleting}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Excluir'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
