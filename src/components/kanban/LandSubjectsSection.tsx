import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { User, Building2, FileStack, Plus, Trash2, Check, X, Pencil, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import {
  createLandSubject,
  deleteLandSubject,
  getLandSubjects,
  updateLandSubject,
  countSubjectUploads,
} from '@/services/land-subjects'
import {
  OWNER_TYPE_LABEL,
  type LandSubject,
  type OwnerType,
  type SubjectKind,
} from '@/lib/document-groups'

interface LandSubjectsSectionProps {
  externalId: string
  /** Tipo de proprietário da terra: herdado por quem não tiver marcação própria. */
  fallbackOwnerType: OwnerType
  onChanged?: () => void
}

const KIND_CONFIG: Record<
  SubjectKind,
  { title: string; singular: string; placeholder: string; empty: string }
> = {
  owner: {
    title: 'Proprietários',
    singular: 'proprietário',
    placeholder: 'Nome do proprietário',
    empty: 'Nenhum proprietário cadastrado. A terra é tratada como tendo um só.',
  },
  matricula: {
    title: 'Matrículas',
    singular: 'matrícula',
    placeholder: 'Ex.: Matrícula 12.345',
    empty: 'Nenhuma matrícula cadastrada. A terra é tratada como tendo uma só.',
  },
}

/**
 * Cadastro dos proprietários e matrículas da terra.
 *
 * Cada um multiplica a lista de documentos do seu escopo: proprietário leva os
 * documentos pessoais (PF ou PJ, conforme a marcação dele), matrícula leva os
 * do imóvel e as certidões.
 *
 * Enquanto nada é cadastrado, a terra se comporta como tendo um proprietário e
 * uma matrícula — é o que preserva a contagem das terras antigas.
 */
export function LandSubjectsSection({
  externalId,
  fallbackOwnerType,
  onChanged,
}: LandSubjectsSectionProps) {
  const { toast } = useToast()
  const [subjects, setSubjects] = useState<LandSubject[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingLabel, setEditingLabel] = useState('')
  const [addingKind, setAddingKind] = useState<SubjectKind | null>(null)
  const [newLabel, setNewLabel] = useState('')
  const [pendingDelete, setPendingDelete] = useState<{
    subject: LandSubject
    uploads: number
  } | null>(null)

  const load = async () => {
    if (!externalId) return
    try {
      setSubjects(await getLandSubjects(externalId))
    } catch (err) {
      console.error('[LandSubjectsSection] falha ao carregar', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [externalId])

  const refresh = async () => {
    await load()
    onChanged?.()
  }

  const handleAdd = async (kind: SubjectKind) => {
    const label = newLabel.trim()
    if (!label) return
    setSavingId('new')
    try {
      await createLandSubject(externalId, kind, label, kind === 'owner' ? fallbackOwnerType : '')
      setNewLabel('')
      setAddingKind(null)
      await refresh()
    } catch (err) {
      toast({
        title: `Erro ao adicionar ${KIND_CONFIG[kind].singular}`,
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setSavingId(null)
    }
  }

  const handleRename = async (subject: LandSubject) => {
    const label = editingLabel.trim()
    if (!label || label === subject.label) {
      setEditingId(null)
      return
    }
    setSavingId(subject.id)
    try {
      await updateLandSubject(subject.id, { label })
      setEditingId(null)
      await refresh()
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
      await refresh()
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
    try {
      const uploads = await countSubjectUploads(externalId, subject.id)
      setPendingDelete({ subject, uploads })
    } catch {
      setPendingDelete({ subject, uploads: 0 })
    }
  }

  const handleDelete = async () => {
    if (!pendingDelete) return
    const { subject } = pendingDelete
    setSavingId(subject.id)
    try {
      await deleteLandSubject(externalId, subject.id)
      setPendingDelete(null)
      await refresh()
    } catch (err) {
      toast({ title: 'Erro ao remover', description: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setSavingId(null)
    }
  }

  const renderKind = (kind: SubjectKind) => {
    const config = KIND_CONFIG[kind]
    const items = subjects.filter((s) => s.kind === kind)
    const Icon = kind === 'owner' ? User : FileStack

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-brand-primary/60">
            <Icon className="h-3.5 w-3.5" /> {config.title}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs font-semibold text-brand-primary/60 hover:text-brand-primary"
            onClick={() => {
              setAddingKind(kind)
              setNewLabel('')
            }}
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar
          </Button>
        </div>

        {items.length === 0 && addingKind !== kind && (
          <p className="rounded-lg border border-dashed border-brand-primary/15 px-3 py-2 text-[11px] leading-relaxed text-brand-primary/45">
            {config.empty}
          </p>
        )}

        {items.map((subject) => {
          const isSaving = savingId === subject.id
          const ownerType = (subject.owner_type || fallbackOwnerType) as OwnerType

          return (
            <div
              key={subject.id}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-brand-primary/10 bg-white px-3 py-2"
            >
              {editingId === subject.id ? (
                <>
                  <Input
                    value={editingLabel}
                    onChange={(e) => setEditingLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRename(subject)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    className="h-8 flex-1 text-sm"
                    autoFocus
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-emerald-600"
                    disabled={isSaving}
                    onClick={() => handleRename(subject)}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-brand-primary/40"
                    onClick={() => setEditingId(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1 truncate text-sm font-medium text-brand-primary">
                    {subject.label}
                  </span>

                  {kind === 'owner' && (
                    <select
                      value={ownerType}
                      disabled={isSaving}
                      onChange={(e) => handleOwnerType(subject, e.target.value as OwnerType)}
                      className="h-8 rounded-lg border border-brand-primary/15 bg-white px-2 text-xs font-medium text-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-secondary"
                    >
                      <option value="">Não informado</option>
                      <option value="pf">{OWNER_TYPE_LABEL.pf}</option>
                      <option value="pj">{OWNER_TYPE_LABEL.pj}</option>
                    </select>
                  )}

                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin text-brand-primary/40" />
                  ) : (
                    <>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-brand-primary/40 hover:text-brand-primary"
                        onClick={() => {
                          setEditingId(subject.id)
                          setEditingLabel(subject.label)
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-brand-primary/40 hover:text-brand-critical"
                        onClick={() => askDelete(subject)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </>
              )}
            </div>
          )
        })}

        {addingKind === kind && (
          <div className="flex items-center gap-2">
            <Input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd(kind)
                if (e.key === 'Escape') setAddingKind(null)
              }}
              placeholder={config.placeholder}
              className="h-8 flex-1 text-sm"
              autoFocus
            />
            <Button
              size="sm"
              className="h-8 bg-brand-primary text-white hover:bg-brand-primary/90"
              disabled={!newLabel.trim() || savingId === 'new'}
              onClick={() => handleAdd(kind)}
            >
              {savingId === 'new' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Salvar'}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-brand-primary/40"
              onClick={() => setAddingKind(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-5 rounded-xl border border-brand-primary/10 bg-white p-5 shadow-sm md:col-span-2">
      <h3 className="flex items-center gap-2 border-b border-brand-primary/5 pb-3 font-display text-lg text-brand-primary">
        <Building2 className="h-5 w-5 text-brand-secondary" /> Proprietários e Matrículas
      </h3>

      <p className="text-[11px] leading-relaxed text-brand-primary/45">
        Cada proprietário recebe a sua lista de documentos pessoais, e cada matrícula a sua lista do
        imóvel e certidões. O progresso na aba Documentos é somado por sujeito.
      </p>

      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-brand-primary/30" />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {renderKind('owner')}
          {renderKind('matricula')}
        </div>
      )}

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
            <AlertDialogCancel disabled={!!savingId}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
              disabled={!!savingId}
              className={cn('bg-brand-critical text-white hover:bg-brand-critical/90')}
            >
              {savingId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
