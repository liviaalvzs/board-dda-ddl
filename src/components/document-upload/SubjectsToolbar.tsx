import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
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
import { Plus, User, FileStack, Loader2, Trash2, ChevronDown } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import {
  createLandSubject,
  deleteLandSubject,
  updateLandSubject,
  countSubjectUploads,
} from '@/services/land-subjects'
import {
  OWNER_TYPE_LABEL,
  ownerTypeOf,
  subjectsOfKind,
  type LandSubject,
  type OwnerType,
  type SubjectKind,
} from '@/lib/document-groups'

interface SubjectsToolbarProps {
  landId: string
  subjects: LandSubject[]
  onChanged: () => void
}

const KIND_META: Record<SubjectKind, { title: string; add: string; icon: typeof User }> = {
  owner: { title: 'Proprietários', add: 'Proprietário', icon: User },
  matricula: { title: 'Matrículas', add: 'Matrícula', icon: FileStack },
}

/**
 * Proprietários e matrículas, gerenciados de dentro da tela de documentos — é
 * ali que a falta de um é percebida.
 *
 * O nome sai automático em sequência; clicar no chip abre renomear, marcar
 * PF/PJ (proprietários) e remover. Nunca é possível remover o último do tipo:
 * toda terra tem pelo menos um de cada.
 */
export function SubjectsToolbar({ landId, subjects, onChanged }: SubjectsToolbarProps) {
  const { toast } = useToast()
  const [busyKind, setBusyKind] = useState<SubjectKind | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [openChip, setOpenChip] = useState<string | null>(null)
  const [draftLabel, setDraftLabel] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<{
    subject: LandSubject
    uploads: number
  } | null>(null)

  const handleAdd = async (kind: SubjectKind) => {
    setBusyKind(kind)
    try {
      await createLandSubject(landId, kind)
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

  const handleRename = async (subject: LandSubject) => {
    const label = draftLabel.trim()
    if (!label || label === subject.label) {
      setOpenChip(null)
      return
    }
    setSavingId(subject.id)
    try {
      await updateLandSubject(subject.id, { label })
      setOpenChip(null)
      onChanged()
    } catch (err) {
      toast({
        title: 'Erro ao renomear',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setSavingId(null)
    }
  }

  const handleOwnerType = async (subject: LandSubject, ownerType: OwnerType) => {
    setSavingId(subject.id)
    try {
      await updateLandSubject(subject.id, { ownerType })
      onChanged()
    } catch (err) {
      toast({
        title: 'Erro ao alterar o tipo',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setSavingId(null)
    }
  }

  const askDelete = async (subject: LandSubject) => {
    setOpenChip(null)
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
    // Rede de segurança: sem permissão de escrita não há como criar o mínimo,
    // então a terra segue com o sujeito implícito, que não é editável.
    const shown = real.length > 0 ? real : subjectsOfKind(subjects, kind)
    const isLastOfKind = real.length <= 1

    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-brand-primary/50">
          <Icon className="h-3.5 w-3.5" />
          {meta.title}
        </span>

        {shown.map((subject) => {
          if (!subject.id) {
            return (
              <span
                key={`implicit-${kind}`}
                className="inline-flex items-center rounded-full border border-dashed border-brand-primary/15 bg-white px-2.5 py-1 text-xs font-medium text-brand-primary/40"
              >
                {subject.label}
              </span>
            )
          }

          const ownerType = ownerTypeOf(subject)

          return (
            <Popover
              key={subject.id}
              open={openChip === subject.id}
              onOpenChange={(open) => {
                setOpenChip(open ? subject.id : null)
                if (open) setDraftLabel(subject.label)
              }}
            >
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full border border-brand-primary/15 bg-white px-2.5 py-1 text-xs font-medium text-brand-primary transition-colors hover:border-brand-secondary/50"
                >
                  {subject.label}
                  {kind === 'owner' && ownerType && (
                    <span className="rounded bg-brand-primary/5 px-1 text-[10px] font-bold uppercase text-brand-primary/50">
                      {ownerType}
                    </span>
                  )}
                  {savingId === subject.id ? (
                    <Loader2 className="h-3 w-3 animate-spin text-brand-primary/40" />
                  ) : (
                    <ChevronDown className="h-3 w-3 text-brand-primary/35" />
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-64 space-y-3 p-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-brand-primary/50">
                    Nome
                  </label>
                  <div className="flex items-center gap-1.5">
                    <Input
                      value={draftLabel}
                      onChange={(e) => setDraftLabel(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRename(subject)
                        if (e.key === 'Escape') setOpenChip(null)
                      }}
                      className="h-8 text-sm"
                      autoFocus
                    />
                    <Button
                      size="sm"
                      className="h-8 shrink-0 bg-brand-primary text-white hover:bg-brand-primary/90"
                      disabled={savingId === subject.id}
                      onClick={() => handleRename(subject)}
                    >
                      Salvar
                    </Button>
                  </div>
                </div>

                {kind === 'owner' && (
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-brand-primary/50">
                      Tipo
                    </label>
                    <select
                      value={ownerType}
                      disabled={savingId === subject.id}
                      onChange={(e) => handleOwnerType(subject, e.target.value as OwnerType)}
                      className="h-8 w-full rounded-lg border border-brand-primary/15 bg-white px-2 text-sm font-medium text-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-secondary"
                    >
                      <option value="">Não informado</option>
                      <option value="pf">{OWNER_TYPE_LABEL.pf}</option>
                      <option value="pj">{OWNER_TYPE_LABEL.pj}</option>
                    </select>
                    <p className="text-[11px] leading-relaxed text-brand-primary/45">
                      Define qual lista de documentos pessoais é exigida.
                    </p>
                  </div>
                )}

                <div className="border-t border-brand-primary/10 pt-2">
                  {isLastOfKind ? (
                    <p className="text-[11px] leading-relaxed text-brand-primary/45">
                      Não pode ser removido: a terra precisa de pelo menos{' '}
                      {kind === 'owner' ? 'um proprietário' : 'uma matrícula'}.
                    </p>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-full justify-start text-xs font-semibold text-brand-critical hover:bg-brand-critical/10"
                      onClick={() => askDelete(subject)}
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remover
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          )
        })}

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
