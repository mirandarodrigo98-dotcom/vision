'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toggleTeamUserStatus, deleteTeamUser, generateTempPassword, sendPassword, TeamUser } from '@/app/actions/team';
import { Department } from '@/app/actions/departments';
import { AccessSchedule } from '@/types/access-schedule';
import { toast } from 'sonner';
import { Plus, Trash, Shield, User, Power, PowerOff, Clock, Key, Loader2, Copy, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import TeamForm from './team-form';

export default function TeamManagementPage({ users, departments, schedules }: { users: TeamUser[], departments: Department[], schedules: AccessSchedule[] }) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<TeamUser | undefined>(undefined);
  
  const [tempPasswordOpen, setTempPasswordOpen] = useState(false);
  const [tempPassword, setTempPassword] = useState('');
  const [generatingTemp, setGeneratingTemp] = useState<string | null>(null);
  const [sendingPassword, setSendingPassword] = useState<string | null>(null);

  const handleCreate = () => {
    setEditingUser(undefined);
    setIsFormOpen(true);
  };

  const handleEdit = (user: TeamUser) => {
    setEditingUser(user);
    setIsFormOpen(true);
  };

  const handleSuccess = () => {
    setIsFormOpen(false);
    setEditingUser(undefined);
  };

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
      setSendingPassword(userId);
      try {
          const res = await sendPassword(userId);
          if (res.error) {
              toast.error(res.error);
          } else {
              toast.success('Nova senha enviada por e-mail.');
          }
      } catch (error) {
          toast.error('Erro ao enviar senha.');
      } finally {
          setSendingPassword(null);
      }
  }

  if (isFormOpen) {
    return (
      <TeamForm 
        departments={departments}
        schedules={schedules}
        initialData={editingUser}
        onCancel={() => setIsFormOpen(false)}
        onSuccess={handleSuccess}
      />
    );
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
        <h1 className="text-3xl font-bold tracking-tight">Gestão de Usuários do Escritório</h1>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" /> Novo Membro
        </Button>
      </div>

      <div className="border rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Departamento</TableHead>
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
                      <User className="h-4 w-4 text-primary" />
                    )}
                    <span className="capitalize">
                        {user.role === 'admin' ? 'Administrador' : (user.department_name || 'Sem Departamento')}
                    </span>
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
                      onClick={() => handleEdit(user)}
                      title="Editar"
                      className="text-primary border-primary/20 hover:bg-primary/10"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
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