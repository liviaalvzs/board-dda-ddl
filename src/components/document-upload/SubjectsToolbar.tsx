import { useState } from 'react'
import { Button } from '@/components/ui/button'
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
import { Plus, X, User, FileStack, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { createLandSubject, deleteLandSubject, countSubjectUploads } from '@/services/land-subjects'
import {
  subjectsOfKind,
  type LandSubject,
  type OwnerType,
  type SubjectKind,
} from '@/lib/document-groups'

interface SubjectsToolbarProps {
  landId: string
  subjects: LandSubject[]
  fallbackOwnerType: OwnerType
  onChanged: () => void
}

const KIND_META: Record<SubjectKind, { title: string; add: string; icon: typeof User }> = {
  owner: { title: 'Proprietários', add: 'Proprietário', icon: User },
  matricula: { title: 'Matrículas', add: 'Matrícula', icon: FileStack },
}

/**
 * Adicionar e remover proprietários e matrículas sem sair da tela de
 * documentos — é ali que a falta de um é percebida.
 *
 * O nome sai automático em sequência; renomear é opcional e fica na aba
 * Informações, junto com a marcação de PF/PJ.
 */
export function SubjectsToolbar({
  landId,
  subjects,
  fallbackOwnerType,
  onChanged,
}: SubjectsToolbarProps) {
  const { toast } = useToast()
  const [busyKind, setBusyKind] = useState<SubjectKind | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<{
    subject: LandSubject
    uploads: number
  } | null>(null)

  const handleAdd = async (kind: SubjectKind) => {
    setBusyKind(kind)
    try {
      await createLandSubject(landId, kind, kind === 'owner' ? fallbackOwnerType : '')
      onChanged()
    } catch (err) {
      toast({
        title: `Erro ao adicionar ${KIND_META[kind].add.toLowerCase()}`,
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setBusyKind(null)
    }
  }

  const askDelete = async (subject: LandSubject) => {
    try {
      setPendingDelete({ subject, uploads: await countSubjectUploads(landId, subject.id) })
    } catch {
      setPendingDelete({ subject, uploads: 0 })
    }
  }

  const handleDelete = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await deleteLandSubject(landId, pendingDelete.subject.id)
      setPendingDelete(null)
      onChanged()
    } catch (err) {
      toast({
        title: 'Erro ao remover',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  const renderKind = (kind: SubjectKind) => {
    const meta = KIND_META[kind]
    const Icon = meta.icon
    const real = subjects.filter((s) => s.kind === kind)
    // Sem nenhum cadastrado, a terra se comporta como tendo um implícito. Ele
    // aparece esmaecido e sem "×": não existe registro para remover.
    const shown = real.length > 0 ? real : subjectsOfKind(subjects, kind, fallbackOwnerType)

    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-brand-primary/50">
          <Icon className="h-3.5 w-3.5" />
          {meta.title}
        </span>

        {shown.map((subject) => (
          <span
            key={subject.id || `implicit-${kind}`}
            className={
              subject.id
                ? 'inline-flex items-center gap-1 rounded-full border border-brand-primary/15 bg-white py-0.5 pl-2.5 pr-1 text-xs font-medium text-brand-primary'
                : 'inline-flex items-center rounded-full border border-dashed border-brand-primary/15 bg-white px-2.5 py-0.5 text-xs font-medium text-brand-primary/40'
            }
          >
            {subject.label}
            {subject.id && (
              <button
                type="button"
                onClick={() => askDelete(subject)}
                className="rounded-full p-0.5 text-brand-primary/35 transition-colors hover:bg-brand-critical/10 hover:text-brand-critical"
                aria-label={`Remover ${subject.label}`}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}

        <Button
          variant="ghost"
          size="sm"
          disabled={busyKind === kind}
          onClick={() => handleAdd(kind)}
          className="h-7 px-2 text-xs font-semibold text-brand-primary/60 hover:text-brand-primary"
        >
          {busyKind === kind ? (
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="mr-1 h-3.5 w-3.5" />
          )}
          {meta.add}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-2 rounded-xl border border-brand-primary/10 bg-white p-4 shadow-sm">
      {renderKind('owner')}
      {renderKind('matricula')}

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover “{pendingDelete?.subject.label}”?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete && pendingDelete.uploads > 0 ? (
                <>
                  Este item tem <strong>{pendingDelete.uploads}</strong>{' '}
                  {pendingDelete.uploads === 1 ? 'documento enviado' : 'documentos enviados'}. Os
                  registros saem da contagem, mas os arquivos{' '}
                  <strong>permanecem armazenados no data lake</strong> — o bucket não permite
                  exclusão. Não há como desfazer pela aplicação.
                </>
              ) : (
                'Nenhum documento foi enviado para este item, então nada será perdido.'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
              disabled={deleting}
              className="bg-brand-critical text-white hover:bg-brand-critical/90"
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
