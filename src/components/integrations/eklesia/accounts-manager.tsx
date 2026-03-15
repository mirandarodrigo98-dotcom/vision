'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { 
  createAccount, 
  Account, 
  deleteAccount, 
  getNextAccountCode, 
  updateAccount,
  getAccounts,
  toggleAccountStatus
} from '@/app/actions/integrations/eklesia';
import { AccountsImportDialog } from './accounts-import-dialog';
import { Loader2, Trash2, Database, RefreshCcw, Pencil, Plus, Filter } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useRouter } from 'next/navigation';
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const accountSchema = z.object({
  description: z.string().max(100, 'Máximo 100 caracteres').min(1, 'Obrigatório'),
  integration_code: z.string().max(20, 'Máximo 20 caracteres').optional(),
});

type AccountFormValues = z.infer<typeof accountSchema>;

interface AccountsManagerProps {
    initialAccounts: Account[];
    companyId: string;
}

export function AccountsManager({ initialAccounts, companyId }: AccountsManagerProps) {
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nextCode, setNextCode] = useState<string>('Calculando...');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Filter states
  const [isFilterLoading, setIsFilterLoading] = useState(false);
  const [filters, setFilters] = useState({
      code: '',
      description: '',
      integration_code: ''
  });

  const router = useRouter();

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      description: '',
      integration_code: '',
    },
  });

  useEffect(() => {
    if (editingId) return; // Don't fetch next code if editing
    if (!isDialogOpen) return; // Don't fetch if dialog is closed

    async function fetchNextCode() {
        setNextCode('Calculando...');
        const result = await getNextAccountCode(companyId);
        if (result.nextCode) {
            setNextCode(result.nextCode);
        } else if (result.error) {
            setNextCode('Erro');
        }
    }
    fetchNextCode();
  }, [companyId, accounts, editingId, isDialogOpen]);

  const handleOpenCreate = () => {
      setEditingId(null);
      form.reset();
      setIsDialogOpen(true);
  };

  const handleEdit = (account: Account) => {
    setEditingId(account.id);
    form.setValue('description', account.description);
    form.setValue('integration_code', account.integration_code || '');
    setNextCode(account.code);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingId(null);
    form.reset();
  };

  const onSubmit = async (data: AccountFormValues) => {
    setIsSubmitting(true);
    try {
      if (editingId) {
        const result = await updateAccount({ ...data, id: editingId }, companyId);
        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success('Conta atualizada com sucesso!');
          handleCloseDialog();
          handleFilter();
        }
      } else {
        const result = await createAccount(data, companyId);
        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success('Conta criada com sucesso!');
          form.reset();
          handleCloseDialog();
          handleFilter();
        }
      }
    } catch (error) {
      toast.error('Erro inesperado ao salvar conta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
      try {
          const result = await deleteAccount(id, companyId);
          if (result.success) {
              toast.success("Conta removida");
              setAccounts(prev => prev.filter(c => c.id !== id));
              router.refresh();
          } else {
              toast.error(result.error);
          }
      } catch (error) {
          toast.error("Erro ao remover conta");
      }
  }

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
        const result = await toggleAccountStatus(id, !currentStatus, companyId);
        if (result.success) {
            toast.success(`Conta ${!currentStatus ? 'ativada' : 'desativada'}`);
            setAccounts(prev => prev.map(c => c.id === id ? { ...c, is_active: !currentStatus } : c));
        } else {
            toast.error(result.error);
        }
    } catch (error) {
        toast.error("Erro ao alterar status");
    }
  };

  const handleFilter = async () => {
    setIsFilterLoading(true);
    try {
        const data = await getAccounts(companyId, filters);
        setAccounts(data);
    } catch (error) {
        toast.error("Erro ao filtrar contas");
    } finally {
        setIsFilterLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Filtros de Pesquisa</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="space-y-1">
                    <label className="text-xs font-medium">Código</label>
                    <Input 
                        placeholder="Ex: 1" 
                        value={filters.code} 
                        onChange={(e) => setFilters(prev => ({ ...prev, code: e.target.value }))}
                    />
                </div>
                <div className="space-y-1 md:col-span-2">
                    <label className="text-xs font-medium">Descrição</label>
                    <Input 
                        placeholder="Descrição da conta" 
                        value={filters.description} 
                        onChange={(e) => setFilters(prev => ({ ...prev, description: e.target.value }))}
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-medium">Cód. Interno</label>
                    <Input 
                        placeholder="Cód. Integração" 
                        value={filters.integration_code} 
                        onChange={(e) => setFilters(prev => ({ ...prev, integration_code: e.target.value }))}
                    />
                </div>
            </div>
            <div className="mt-4 flex justify-end">
                <Button onClick={handleFilter} disabled={isFilterLoading} size="sm">
                    {isFilterLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Filter className="mr-2 h-4 w-4" />}
                    Filtrar
                </Button>
            </div>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Listagem de Contas</h3>
        <div className="flex gap-2">
            <AccountsImportDialog companyId={companyId} onSuccess={handleFilter} />
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                    <Button onClick={handleOpenCreate}>
                        <Plus className="mr-2 h-4 w-4" />
                        Incluir
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingId ? 'Editar Conta' : 'Nova Conta'}</DialogTitle>
                        <DialogDescription>
                            Preencha os dados abaixo para {editingId ? 'editar' : 'criar'} a conta.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                        
                        {/* Código (Read Only) */}
                        <div className="grid grid-cols-4 gap-4 items-center">
                            <label className="text-sm font-medium text-right">Código:</label>
                            <div className="col-span-3">
                                <div className="flex items-center space-x-2">
                                    <Input 
                                        value={nextCode}
                                        readOnly
                                        disabled
                                        className="bg-muted font-mono w-32"
                                    />
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                        (Automático)
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        {/* Descrição */}
                        <div className="grid grid-cols-4 gap-4 items-center">
                            <label className="text-sm font-medium text-right">Descrição:</label>
                            <div className="col-span-3">
                                <Input 
                                    {...form.register('description')} 
                                    placeholder="Descrição da conta" 
                                    maxLength={100}
                                />
                                {form.formState.errors.description && (
                                    <span className="text-xs text-red-500">{form.formState.errors.description.message}</span>
                                )}
                            </div>
                        </div>

                        {/* Código de Integração */}
                        <div className="grid grid-cols-4 gap-4 items-center">
                            <label className="text-sm font-medium text-right">Cód. Int.:</label>
                            <div className="col-span-3">
                                <Input 
                                    {...form.register('integration_code')} 
                                    placeholder="Opcional" 
                                    maxLength={20}
                                />
                                {form.formState.errors.integration_code && (
                                    <span className="text-xs text-red-500">{form.formState.errors.integration_code.message}</span>
                                )}
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={handleCloseDialog} disabled={isSubmitting}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (editingId ? <RefreshCcw className="mr-2 h-4 w-4" /> : <Database className="mr-2 h-4 w-4" />)}
                                {editingId ? 'Salvar' : 'Adicionar'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
      </div>
      
      <div className="rounded-md border bg-white">
          <Table>
              <TableHeader>
                  <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Descrição da Conta</TableHead>
                      <TableHead>Cód. Int.</TableHead>
                      <TableHead className="w-[100px] text-center">Status</TableHead>
                      <TableHead className="w-[120px] text-right">Ações</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                  {isFilterLoading ? (
                      <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                              <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                          </TableCell>
                      </TableRow>
                  ) : accounts.length === 0 ? (
                      <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                              Nenhuma conta encontrada.
                          </TableCell>
                      </TableRow>
                  ) : (
                      accounts.map((account) => (
                          <TableRow key={account.id} className={!account.is_active ? 'opacity-60 bg-gray-50' : ''}>
                              <TableCell className="font-mono">{account.code}</TableCell>
                              <TableCell className="font-medium">{account.description}</TableCell>
                              <TableCell className="font-mono text-xs text-muted-foreground">{account.integration_code || '-'}</TableCell>
                              <TableCell className="text-center">
                                  <div className="flex justify-center">
                                      <Switch 
                                          checked={account.is_active} 
                                          onCheckedChange={() => handleToggleStatus(account.id, account.is_active)}
                                      />
                                  </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(account)} title="Editar">
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" title="Excluir">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Excluir Conta</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Tem certeza que deseja excluir a conta <strong>{account.description}</strong>?
                                                <br/><br/>
                                                <span className="text-red-600 font-medium text-xs">Atenção: Não é possível excluir contas que possuem lançamentos vinculados.</span>
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDelete(account.id)} className="bg-red-600 hover:bg-red-700">
                                                Excluir
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                              </TableCell>
                          </TableRow>
                      ))
                  )}
              </TableBody>
          </Table>
      </div>
    </div>
  );
}
