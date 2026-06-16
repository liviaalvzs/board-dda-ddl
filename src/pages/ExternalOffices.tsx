import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Plus, Edit2, Trash2, Building2, AlertTriangle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
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
import { Label } from '@/components/ui/label'

export default function ExternalOffices() {
  const [offices, setOffices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedOffice, setSelectedOffice] = useState<any>(null)
  const [name, setName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const fetchOffices = async () => {
    try {
      const records = await pb.collection('external_offices').getFullList({ sort: '-created' })
      setOffices(records)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOffices()
  }, [])

  useRealtime('external_offices', () => fetchOffices())

  const handleSave = async () => {
    if (!name.trim()) return
    setIsSubmitting(true)
    try {
      if (selectedOffice) {
        await pb.collection('external_offices').update(selectedOffice.id, { name })
        toast({ title: 'Escritório atualizado com sucesso' })
      } else {
        await pb.collection('external_offices').create({ name })
        toast({ title: 'Escritório adicionado com sucesso' })
      }
      setDialogOpen(false)
    } catch (error) {
      toast({ title: 'Erro ao salvar escritório', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedOffice) return
    setIsSubmitting(true)
    try {
      await pb.collection('external_offices').delete(selectedOffice.id)
      toast({ title: 'Escritório removido com sucesso' })
      setDeleteOpen(false)
    } catch (error) {
      toast({ title: 'Erro ao remover escritório', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEdit = (office: any) => {
    setSelectedOffice(office)
    setName(office.name)
    setDialogOpen(true)
  }

  const openCreate = () => {
    setSelectedOffice(null)
    setName('')
    setDialogOpen(true)
  }

  const openDelete = (office: any) => {
    setSelectedOffice(office)
    setDeleteOpen(true)
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-brand-secondary" />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-brand-primary flex items-center gap-2">
              <Building2 className="w-6 h-6 text-brand-secondary" />
              Escritórios Externos
            </h1>
            <p className="text-sm text-brand-primary/60">
              Gerencie os escritórios de advocacia associados às terras.
            </p>
          </div>
          <Button onClick={openCreate} className="bg-brand-secondary hover:bg-brand-secondary/90">
            <Plus className="w-4 h-4 mr-2" /> Adicionar Escritório
          </Button>
        </div>

        <div className="bg-white rounded-xl border border-brand-primary/10 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-brand-primary/5 hover:bg-brand-primary/5">
                <TableHead className="font-semibold text-brand-primary">Nome</TableHead>
                <TableHead className="font-semibold text-brand-primary">Adicionado em</TableHead>
                <TableHead className="text-right font-semibold text-brand-primary">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {offices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-brand-primary/50">
                    Nenhum escritório cadastrado
                  </TableCell>
                </TableRow>
              ) : (
                offices.map((office) => (
                  <TableRow key={office.id}>
                    <TableCell className="font-medium text-brand-primary">{office.name}</TableCell>
                    <TableCell className="text-brand-primary/60 text-sm">
                      {format(new Date(office.created), "dd 'de' MMM, yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(office)}
                          className="h-8 w-8 text-brand-primary/60 hover:text-brand-primary"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDelete(office)}
                          className="h-8 w-8 text-rose-500/80 hover:text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedOffice ? 'Editar Escritório' : 'Adicionar Escritório'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Escritório</Label>
                <Input
                  id="name"
                  placeholder="Ex: Pinheiro Neto Advogados"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={!name.trim() || isSubmitting}>
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                Remover Escritório
              </AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja remover <strong>{selectedOffice?.name}</strong>? Esta ação
                não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isSubmitting}
                className="bg-rose-500 hover:bg-rose-600"
              >
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
