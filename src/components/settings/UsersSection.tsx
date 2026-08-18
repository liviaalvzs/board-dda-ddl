import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { Plus, Users, Loader2, UserCog, Trash2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { preRegisterUser, deleteUser } from '@/services/users'

export function UsersSection() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<'admin' | 'negociador'>('negociador')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()

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
      await preRegisterUser(email, name, role)
      toast({ title: 'Usuário cadastrado com sucesso' })
      setDialogOpen(false)
      setEmail('')
      setName('')
      setRole('negociador')
      fetchUsers()
    } catch (error: any) {
      toast({ title: error?.response?.error || 'Erro ao cadastrar', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await deleteUser(deleteTarget.id)
      toast({ title: 'Usuário excluído com sucesso' })
      setDeleteTarget(null)
      fetchUsers()
    } catch (error: any) {
      const msg = error?.response?.error || error?.response?.message || 'Erro ao excluir usuário'
      toast({ title: msg, variant: 'destructive' })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Card className="border-brand-primary/10 shadow-sm">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <CardTitle className="text-brand-primary flex items-center gap-2">
              <Users className="w-5 h-5 text-brand-secondary" />
              Usuários
            </CardTitle>
            <CardDescription>
              Cadastre os e-mails com acesso ao sistema. Negociadores entram apenas com o e-mail e
              só acessam a página de documentos.
            </CardDescription>
          </div>
          <Button
            onClick={() => setDialogOpen(true)}
            className="bg-brand-secondary hover:bg-brand-secondary/90 shrink-0"
          >
            <Plus className="w-4 h-4 mr-2" /> Cadastrar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-brand-secondary" />
          </div>
        ) : (
          <div className="rounded-lg border border-brand-primary/10 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-brand-primary/5 hover:bg-brand-primary/5">
                  <TableHead className="font-semibold text-brand-primary">Nome</TableHead>
                  <TableHead className="font-semibold text-brand-primary">Email</TableHead>
                  <TableHead className="font-semibold text-brand-primary">Função</TableHead>
                  <TableHead className="font-semibold text-brand-primary text-right">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-brand-primary/50">
                      Nenhum usuário cadastrado
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((u) => {
                    const isSelf = user?.id === u.id
                    return (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium text-brand-primary">
                          {u.name || '—'}
                        </TableCell>
                        <TableCell className="text-brand-primary/60 text-sm">{u.email}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              u.role === 'admin'
                                ? 'bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/10'
                                : 'bg-blue-50 text-blue-700 hover:bg-blue-50'
                            }
                          >
                            <UserCog className="w-3 h-3 mr-1" />
                            {u.role === 'admin' ? 'Administrador' : 'Negociador'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isSelf}
                            onClick={() => setDeleteTarget(u)}
                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 disabled:opacity-40 disabled:hover:bg-transparent"
                            title={
                              isSelf
                                ? 'Você não pode excluir o seu próprio usuário'
                                : 'Excluir usuário'
                            }
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cadastrar Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="user-name">Nome</Label>
              <Input
                id="user-name"
                placeholder="Nome do usuário"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-email">Email</Label>
              <Input
                id="user-email"
                type="email"
                placeholder="usuario@re.green"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePreRegister()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-role">Função</Label>
              <Select value={role} onValueChange={(v) => setRole(v as 'admin' | 'negociador')}>
                <SelectTrigger id="user-role">
                  <SelectValue placeholder="Selecione a função" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="negociador">Negociador</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-brand-primary/50">
                Negociadores entram apenas com o e-mail e só enviam documentos. Administradores
                definem a própria senha ao ativar a conta.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button onClick={handlePreRegister} disabled={!email.trim() || isSubmitting}>
              {isSubmitting ? 'Cadastrando...' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-5 h-5" />
              Excluir Usuário
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          {deleteTarget && (
            <div className="rounded-lg border border-brand-primary/10 bg-brand-primary/5 p-3 text-sm">
              <p className="font-medium text-brand-primary">{deleteTarget.name || 'Usuário'}</p>
              <p className="text-brand-primary/60">{deleteTarget.email}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
