'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { createAccount, Account, deleteAccount, getNextAccountCode, updateAccount } from '@/app/actions/integrations/eklesia';
import { Loader2, Trash2, Database, RefreshCcw, Pencil, X } from 'lucide-react';
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
import { useRouter } from 'next/navigation';

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
  }, [companyId, accounts, editingId]);

  const handleEdit = (account: Account) => {
    setEditingId(account.id);
    form.setValue('description', account.description);
    form.setValue('integration_code', account.integration_code || '');
    setNextCode(account.code);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    form.reset();
    // nextCode will be updated by useEffect
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
          handleCancelEdit();
          window.location.reload();
        }
      } else {
        const result = await createAccount(data, companyId);
        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success('Conta criada com sucesso!');
          form.reset();
          router.refresh(); 
          window.location.reload();
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

  return (
    <div className="space-y-8">
      <div className="p-4 border rounded-md bg-gray-50">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">{editingId ? 'Editar Conta' : 'Nova Conta'}</h3>
        </div>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          
          {/* Código (Read Only) */}
          <div className="grid grid-cols-12 gap-4 items-center">
            <label className="col-span-3 text-sm font-medium text-right">
              Código:
            </label>
            <div className="col-span-9 md:col-span-4">
                <div className="flex items-center space-x-2">
                    <Input 
                        value={nextCode}
                        readOnly
                        disabled
                        className="bg-muted font-mono"
                    />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                        (Automático)
                    </span>
                </div>
            </div>
          </div>
          
          {/* Descrição */}
          <div className="grid grid-cols-12 gap-4 items-center">
            <label className="col-span-3 text-sm font-medium text-right">
              Descrição da Conta:
            </label>
            <div className="col-span-9 md:col-span-6">
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
          <div className="grid grid-cols-12 gap-4 items-center">
            <label className="col-span-3 text-sm font-medium text-right">
              Cód. Integração:
            </label>
            <div className="col-span-9 md:col-span-4">
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

          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-3"></div>
            <div className="col-span-9 flex gap-2">
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (editingId ? <RefreshCcw className="mr-2 h-4 w-4" /> : <Database className="mr-2 h-4 w-4" />)}
                    {editingId ? 'Salvar Alterações' : 'Adicionar Conta'}
                </Button>
                {editingId && (
                    <Button type="button" variant="outline" onClick={handleCancelEdit} disabled={isSubmitting}>
                        <X className="mr-2 h-4 w-4" />
                        Cancelar
                    </Button>
                )}
            </div>
          </div>

        </form>
      </div>

      <div className="rounded-md border">
          <Table>
              <TableHeader>
                  <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Descrição da Conta</TableHead>
                      <TableHead>Cód. Int.</TableHead>
                      <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                  {accounts.length === 0 ? (
                      <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                              Nenhuma conta cadastrada.
                          </TableCell>
                      </TableRow>
                  ) : (
                      accounts.map((account) => (
                          <TableRow key={account.id}>
                              <TableCell className="font-mono">{account.code}</TableCell>
                              <TableCell>{account.description}</TableCell>
                              <TableCell className="font-mono text-xs">{account.integration_code || '-'}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(account)}>
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Excluir Conta</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Tem certeza que deseja excluir a conta <strong>{account.description}</strong>?
                                                Essa ação não pode ser desfeita.
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
