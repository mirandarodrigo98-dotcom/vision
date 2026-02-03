'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { createTeamUser, toggleTeamUserStatus, deleteTeamUser, TeamUser } from '@/app/actions/team';
import { toast } from 'sonner';
import { Plus, Trash, Shield, User, Ban, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function TeamManagementPage({ users }: { users: TeamUser[] }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'operator' as 'admin' | 'operator'
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await createTeamUser(formData);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Usuário criado com sucesso!');
        setIsDialogOpen(false);
        setFormData({ name: '', email: '', role: 'operator' });
      }
    } catch (error) {
      toast.error('Erro ao criar usuário.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleToggleStatus(user: TeamUser) {
    try {
      const res = await toggleTeamUserStatus(user.id, user.is_active);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(`Usuário ${user.is_active ? 'desativado' : 'ativado'} com sucesso.`);
      }
    } catch (error) {
      toast.error('Erro ao atualizar status.');
    }
  }

  async function handleDelete(user: TeamUser) {
    if (!confirm(`Tem certeza que deseja excluir ${user.name}?`)) return;

    try {
      const res = await deleteTeamUser(user.id);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Usuário excluído com sucesso.');
      }
    } catch (error) {
      toast.error('Erro ao excluir usuário.');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Gestão de Equipe</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Novo Membro
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Membro da Equipe</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome</label>
                <Input 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Nome completo"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">E-mail</label>
                <Input 
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  placeholder="email@nzd.com.br"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Perfil</label>
                <Select 
                  value={formData.role} 
                  onValueChange={(val: 'admin' | 'operator') => setFormData({ ...formData, role: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operator">Operador</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Admins têm acesso total. Operadores acessam empresas e admissões, mas não logs/configurações.
                </p>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Salvando...' : 'Adicionar Membro'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Último Acesso</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {user.role === 'admin' ? (
                      <Shield className="h-4 w-4 text-purple-600" />
                    ) : (
                      <User className="h-4 w-4 text-blue-600" />
                    )}
                    <span className="capitalize">{user.role === 'admin' ? 'Administrador' : 'Operador'}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {user.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {user.last_login_at ? format(new Date(user.last_login_at), 'dd/MM/yyyy HH:mm') : '-'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleToggleStatus(user)}
                      title={user.is_active ? 'Desativar' : 'Ativar'}
                    >
                      {user.is_active ? <Ban className="h-4 w-4 text-orange-600" /> : <CheckCircle className="h-4 w-4 text-green-600" />}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDelete(user)}
                      title="Excluir"
                    >
                      <Trash className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {users.length === 0 && (
               <TableRow>
                 <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                   Nenhum usuário encontrado.
                 </TableCell>
               </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}