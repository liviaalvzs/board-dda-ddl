import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import { Plus, Shield, Loader2, CheckCircle2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
import { preRegisterUser } from '@/services/users'

export default function UsersManagement() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const fetchUsers = async () => {
    try {
      const res = await pb.send('/backend/v1/users', { method: 'GET' })
      setUsers(res.items || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handlePreRegister = async () => {
    if (!email.trim()) return
    setIsSubmitting(true)
    try {
      await preRegisterUser(email, name)
      toast({ title: 'Usuário pré-cadastrado com sucesso' })
      setDialogOpen(false)
      setEmail('')
      setName('')
      fetchUsers()
    } catch (error: any) {
      toast({ title: error?.response?.error || 'Erro ao pré-cadastrar', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
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
              <Shield className="w-6 h-6 text-brand-secondary" />
              Gerenciar Usuários
            </h1>
            <p className="text-sm text-brand-primary/60">
              Pré-cadastre emails para que usuários possam ativar suas contas.
            </p>
          </div>
          <Button
            onClick={() => setDialogOpen(true)}
            className="bg-brand-secondary hover:bg-brand-secondary/90"
          >
            <Plus className="w-4 h-4 mr-2" /> Pré-cadastrar Usuário
          </Button>
        </div>

        <div className="bg-white rounded-xl border border-brand-primary/10 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-brand-primary/5 hover:bg-brand-primary/5">
                <TableHead className="font-semibold text-brand-primary">Nome</TableHead>
                <TableHead className="font-semibold text-brand-primary">Email</TableHead>
                <TableHead className="font-semibold text-brand-primary">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-brand-primary/50">
                    Nenhum usuário cadastrado
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium text-brand-primary">
                      {u.name || '—'}
                    </TableCell>
                    <TableCell className="text-brand-primary/60 text-sm">{u.email}</TableCell>
                    <TableCell>
                      {u.verified ? (
                        <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Ativo
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50">
                          <Clock className="w-3 h-3 mr-1" /> Pendente
                        </Badge>
                      )}
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
              <DialogTitle>Pré-cadastrar Usuário</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome (opcional)</Label>
                <Input
                  id="name"
                  placeholder="Nome do usuário"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handlePreRegister()}
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
              <Button onClick={handlePreRegister} disabled={!email.trim() || isSubmitting}>
                {isSubmitting ? 'Pré-cadastrando...' : 'Pré-cadastrar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
