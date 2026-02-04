'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { createTeamUser, toggleTeamUserStatus, deleteTeamUser, generateTempPassword, sendPassword, TeamUser } from '@/app/actions/team';
import { toast } from 'sonner';
import { Plus, Trash, Shield, User, Power, PowerOff, Clock, Key, Loader2, Copy } from 'lucide-react';
import { format } from 'date-fns';

export default function TeamManagementPage({ users }: { users: TeamUser[] }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [tempPasswordOpen, setTempPasswordOpen] = useState(false);
  const [tempPassword, setTempPassword] = useState('');
  const [generatingTemp, setGeneratingTemp] = useState<string | null>(null);
  const [sendingPassword, setSendingPassword] = useState<string | null>(null);

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

  async function handleGenerateTempPassword(userId: string) {
      setGeneratingTemp(userId);
      try {
          const res = await generateTempPassword(userId);
          if (res.error) {
              toast.error(res.error);
          } else {
              setTempPassword(res.password!);
              setTempPasswordOpen(true);
              toast.success('Senha provisória gerada.');
          }
      } catch (error) {
          toast.error('Erro ao gerar senha.');
      } finally {
          setGeneratingTemp(null);
      }
  }

  async function handleSendPassword(userId: string) {
      if (!confirm('Deseja gerar uma nova senha e enviar por e-mail? A senha atual será invalidada.')) return;
      
      setSendingPassword(userId);
      try {
          const res = await sendPassword(userId);
          if (res.error) {
              toast.error(res.error);
          } else {
              toast.success('Senha enviada por e-mail.');
          }
      } catch (error) {
          toast.error('Erro ao enviar senha.');
      } finally {
          setSendingPassword(null);
      }
  }

  return (
    <div className="space-y-6">
      <Dialog open={tempPasswordOpen} onOpenChange={setTempPasswordOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Senha Provisória Gerada</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col items-center justify-center space-y-4 py-4">
                  <div className="text-4xl font-mono font-bold tracking-widest bg-gray-100 px-6 py-3 rounded-lg border">
                      {tempPassword}
                  </div>
                  <p className="text-sm text-muted-foreground text-center">
                      Esta senha é válida por 1 hora.<br/>
                      Copie e envie para o usuário.
                  </p>
                  <Button 
                      className="w-full" 
                      variant="outline"
                      onClick={() => {
                          navigator.clipboard.writeText(tempPassword);
                          toast.success('Senha copiada!');
                      }}
                  >
                      <Copy className="mr-2 h-4 w-4" /> Copiar Senha
                  </Button>
              </div>
          </DialogContent>
      </Dialog>

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
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleGenerateTempPassword(user.id)}
                      disabled={!!generatingTemp}
                      title="Gerar Senha Provisória (1h)"
                      className="text-amber-600 border-amber-200 hover:bg-amber-50"
                    >
                      {generatingTemp === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleSendPassword(user.id)}
                      disabled={!!sendingPassword}
                      title="Enviar Nova Senha por Email"
                      className="text-slate-600 border-slate-200 hover:bg-slate-50"
                    >
                      {sendingPassword === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleToggleStatus(user)}
                      title={user.is_active ? 'Desativar' : 'Ativar'}
                      className={user.is_active 
                        ? "text-red-600 border-red-200 hover:bg-red-50" 
                        : "text-green-600 border-green-200 hover:bg-green-50"
                      }
                    >
                      {user.is_active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDelete(user)}
                      title="Excluir"
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <Trash className="h-4 w-4" />
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