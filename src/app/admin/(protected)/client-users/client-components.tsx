'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toggleUserStatus, sendPassword, generateTempPassword } from '@/app/actions/client-users';
import { toast } from 'sonner';
import { Pencil, Power, PowerOff, Plus, Key, Loader2, Clock } from 'lucide-react';
import { SearchInput } from '@/components/ui/search-input';
import { ColumnHeader } from '@/components/ui/column-header';
import { ClientUserWizard } from './client-user-wizard';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  cell_phone?: string;
  is_active: number;
  company_ids: string | null; // Comma separated IDs
  company_names: string | null; // Comma separated Names
  notification_email?: number;
  notification_whatsapp?: number;
}

interface Company {
    id: string;
    nome: string;
    razao_social?: string;
}

// Department removed as per requirement

export function UserList({ users, companies }: { users: User[], companies: Company[] }) {
  const [editing, setEditing] = useState<User | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  
  const [sendingPassword, setSendingPassword] = useState<string | null>(null);
  
  // Temp password dialog
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [tempPasswordOpen, setTempPasswordOpen] = useState(false);
  const [generatingTemp, setGeneratingTemp] = useState<string | null>(null);

  async function handleSendPassword(userId: string) {
    setSendingPassword(userId);
    const res = await sendPassword(userId);
    setSendingPassword(null);
    
    if (res.error) {
        toast.error(res.error);
    } else {
        toast.success('Senha enviada por e-mail!');
    }
  }

  async function handleGenerateTempPassword(userId: string) {
      setGeneratingTemp(userId);
      const res = await generateTempPassword(userId);
      setGeneratingTemp(null);

      if (res.error) {
          toast.error(res.error);
      } else {
          setTempPassword(res.password || null);
          setTempPasswordOpen(true);
          toast.success('Senha provisória gerada!');
      }
  }

  const handleEdit = (user: User) => {
      setEditing(user);
      setIsWizardOpen(true);
  };

  const handleNew = () => {
      setEditing(null);
      setIsWizardOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Usuários do Cliente</h2>
        <Button onClick={handleNew}>
          <Plus className="mr-2 h-4 w-4" /> Novo Usuário
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <SearchInput placeholder="Buscar por nome ou email..." />
      </div>

      <div className="border rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <ColumnHeader column="name" title="Nome" />
              </TableHead>
              <TableHead>
                <ColumnHeader column="email" title="Email" />
              </TableHead>
              <TableHead>
                <ColumnHeader column="is_active" title="Status" />
              </TableHead>
              <TableHead className="text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => {
                const companyList = user.company_names ? user.company_names.split(', ') : [];
                const displayCompanies = companyList.slice(0, 2);
                const moreCount = companyList.length - 2;

                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {user.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </TableCell>
                    <TableCell className="text-center space-x-2">
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
                        title="Enviar nova senha por e-mail"
                      >
                        {sendingPassword === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleEdit(user)}
                        title="Editar Usuário"
                        className="text-primary border-primary/20 hover:bg-primary/10"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <form action={async () => {
                         await toggleUserStatus(user.id, !user.is_active);
                         toast.success('Status atualizado');
                      }} className="inline-block">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            type="submit" 
                            title={user.is_active ? "Desativar" : "Ativar"}
                            className={user.is_active 
                                ? "text-red-600 border-red-200 hover:bg-red-50" 
                                : "text-green-600 border-green-200 hover:bg-green-50"
                            }
                        >
                          {user.is_active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                        </Button>
                      </form>
                    </TableCell>
                  </TableRow>
                );
            })}
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center">Nenhum usuário cadastrado.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <ClientUserWizard 
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        companies={companies}
        initialData={editing}
        onSuccess={() => setIsWizardOpen(false)}
      />

      <Dialog open={tempPasswordOpen} onOpenChange={setTempPasswordOpen}>
        <DialogContent className="max-w-sm">
            <DialogHeader>
                <DialogTitle>Senha Provisória Gerada</DialogTitle>
            </DialogHeader>
            <div className="py-4 text-center">
                <p className="text-sm text-gray-500 mb-2">Esta senha é válida por 1 hora.</p>
                <div className="p-4 bg-gray-100 rounded-md border border-gray-200">
                    <code className="text-2xl font-mono font-bold tracking-wider select-all">{tempPassword}</code>
                </div>
                <p className="text-xs text-gray-400 mt-2">Clique na senha para selecionar e copiar.</p>
            </div>
            <div className="flex justify-end">
                <Button onClick={() => setTempPasswordOpen(false)}>Fechar</Button>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
