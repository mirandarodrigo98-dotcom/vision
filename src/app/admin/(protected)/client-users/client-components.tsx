'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { createClientUser, updateClientUser, toggleUserStatus, sendPassword } from '@/app/actions/client-users';
import { toast } from 'sonner';
import { Pencil, Power, PowerOff, Plus, Key, Loader2, Search, X } from 'lucide-react';
import { SearchInput } from '@/components/ui/search-input';
import { ColumnHeader } from '@/components/ui/column-header';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  is_active: number;
  company_ids: string | null; // Comma separated IDs
  company_names: string | null; // Comma separated Names
}

interface Company {
    id: string;
    nome: string;
}

export function UserList({ users, companies }: { users: User[], companies: Company[] }) {
  const [editing, setEditing] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const [sendingPassword, setSendingPassword] = useState<string | null>(null);

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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Usuários Clientes</h2>
        <Button onClick={() => { setEditing(null); setOpen(true); }}>
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
              <TableHead>Empresas</TableHead>
              <TableHead>
                <ColumnHeader column="is_active" title="Status" />
              </TableHead>
              <TableHead className="text-right">Ações</TableHead>
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
                        <div className="flex flex-wrap gap-1">
                            {displayCompanies.map((name, i) => (
                                <Badge key={i} variant="secondary" className="text-xs font-normal">
                                    {name}
                                </Badge>
                            ))}
                            {moreCount > 0 && (
                                <Badge variant="outline" className="text-xs font-normal">
                                    +{moreCount}
                                </Badge>
                            )}
                            {companyList.length === 0 && <span className="text-muted-foreground text-sm">-</span>}
                        </div>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {user.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleSendPassword(user.id)}
                        disabled={!!sendingPassword}
                        title="Enviar nova senha"
                      >
                        {sendingPassword === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => { setEditing(user); setOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <form action={async () => {
                         await toggleUserStatus(user.id, !user.is_active);
                         toast.success('Status atualizado');
                      }} className="inline-block">
                        <Button variant="ghost" size="icon" type="submit" title={user.is_active ? "Desativar" : "Ativar"}>
                          {user.is_active ? <PowerOff className="h-4 w-4 text-red-500" /> : <Power className="h-4 w-4 text-green-500" />}
                        </Button>
                      </form>
                    </TableCell>
                  </TableRow>
                );
            })}
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center">Nenhum usuário cadastrado.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
          </DialogHeader>
          <UserForm 
            user={editing} 
            companies={companies}
            onSuccess={() => setOpen(false)} 
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UserForm({ user, companies, onSuccess }: { user: User | null, companies: Company[], onSuccess: () => void }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Initialize selectedIds when user prop changes
  useEffect(() => {
    if (user && user.company_ids) {
        setSelectedIds(user.company_ids.split(','));
    } else {
        setSelectedIds([]);
    }
  }, [user]);

  const filteredCompanies = useMemo(() => {
      if (!searchTerm) return companies;
      return companies.filter(c => c.nome.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [companies, searchTerm]);

  const toggleCompany = (id: string) => {
      setSelectedIds(prev => 
          prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      );
  };

  const toggleAllFiltered = () => {
      const filteredIds = filteredCompanies.map(c => c.id);
      const allSelected = filteredIds.every(id => selectedIds.includes(id));
      
      if (allSelected) {
          // Deselect all filtered
          setSelectedIds(prev => prev.filter(id => !filteredIds.includes(id)));
      } else {
          // Select all filtered
          const newIds = new Set([...selectedIds, ...filteredIds]);
          setSelectedIds(Array.from(newIds));
      }
  };

  async function handleSubmit(formData: FormData) {
    if (selectedIds.length === 0) {
        toast.error('Selecione pelo menos uma empresa.');
        return;
    }

    // Manually append selected company IDs to formData since they are not in standard inputs
    // We can clear any existing 'company_ids' entries if any were added by accident (unlikely here)
    formData.delete('company_ids'); 
    selectedIds.forEach(id => formData.append('company_ids', id));

    let res;
    if (user) {
      res = await updateClientUser(user.id, formData);
    } else {
      res = await createClientUser(formData);
    }

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(user ? 'Usuário atualizado!' : 'Usuário criado!');
      onSuccess();
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Nome Completo</label>
        <Input name="name" defaultValue={user?.name} required />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Email (Login)</label>
        <Input name="email" type="email" defaultValue={user?.email} required />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Telefone</label>
        <Input name="phone" defaultValue={user?.phone} />
      </div>
      
      <div className="space-y-2">
        <label className="text-sm font-medium">Empresas Vinculadas ({selectedIds.length})</label>
        <div className="border rounded-md p-2 bg-gray-50/50">
            <div className="flex gap-2 mb-2">
                <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Buscar empresa..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 h-9"
                    />
                </div>
                <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={toggleAllFiltered}
                    className="h-9 px-2"
                    title="Selecionar/Deselecionar Todos da Busca"
                >
                    {filteredCompanies.length > 0 && filteredCompanies.every(c => selectedIds.includes(c.id)) ? "Nenhum" : "Todos"}
                </Button>
            </div>
            
            <div className="h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                {filteredCompanies.length === 0 ? (
                    <div className="text-center py-4 text-sm text-muted-foreground">
                        Nenhuma empresa encontrada.
                    </div>
                ) : (
                    filteredCompanies.map(c => (
                        <div key={c.id} className="flex items-center space-x-2 hover:bg-white p-1 rounded transition-colors">
                            <Checkbox 
                                id={`comp-${c.id}`} 
                                checked={selectedIds.includes(c.id)}
                                onCheckedChange={() => toggleCompany(c.id)}
                            />
                            <label 
                                htmlFor={`comp-${c.id}`} 
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1 py-1"
                            >
                                {c.nome}
                            </label>
                        </div>
                    ))
                )}
            </div>
            <div className="mt-2 text-xs text-muted-foreground text-right">
                Mostrando {filteredCompanies.length} de {companies.length} empresas
            </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button type="submit">{user ? 'Salvar Alterações' : 'Criar Usuário'}</Button>
      </div>
    </form>
  );
}
