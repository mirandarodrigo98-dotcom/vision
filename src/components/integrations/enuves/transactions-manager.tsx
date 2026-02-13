'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PdfImportDialog } from './pdf-import-dialog';
import { TransactionFilters } from './transaction-filters';
import { TransactionEditDialog } from './transaction-edit-dialog';
import { Loader2, Trash2, Pencil } from 'lucide-react';
import { getTransactions, deleteTransaction, getCategories, getAccounts } from '@/app/actions/integrations/enuves';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface TransactionsManagerProps {
  companyId: string;
}

export function TransactionsManager({ companyId }: TransactionsManagerProps) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({});
  const [editingTransaction, setEditingTransaction] = useState<any>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [transactionsData, categoriesData, accountsData] = await Promise.all([
        getTransactions(companyId, filters),
        getCategories(companyId),
        getAccounts(companyId)
      ]);
      setTransactions(transactionsData);
      setCategories(categoriesData);
      setAccounts(accountsData);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTransactions = async () => {
      // Don't set full loading for just filter changes to avoid flickering everything if we were to separate them,
      // but for now, we can just use fetchData or a specialized fetch.
      // However, categories and accounts only need to be fetched once.
      setIsLoading(true);
      try {
        const data = await getTransactions(companyId, filters);
        setTransactions(data);
      } catch (error) {
        console.error(error);
        toast.error('Erro ao carregar lançamentos');
      } finally {
        setIsLoading(false);
      }
  }

  useEffect(() => {
    const init = async () => {
        setIsLoading(true);
        try {
            const [categoriesData, accountsData] = await Promise.all([
                getCategories(companyId),
                getAccounts(companyId)
            ]);
            setCategories(categoriesData);
            setAccounts(accountsData);
        } catch (error) {
            console.error(error);
            toast.error('Erro ao carregar categorias e contas');
        }
        // Fetch initial transactions
        await fetchTransactions();
    };
    init();
  }, [companyId]);

  // Re-fetch transactions when filters change
  useEffect(() => {
    fetchTransactions();
  }, [filters]);

  const handleDelete = async (id: string) => {
      try {
          await deleteTransaction(id, companyId);
          toast.success('Lançamento removido');
          fetchTransactions();
      } catch (error) {
          toast.error('Erro ao remover lançamento');
      }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Lançamentos Importados</h3>
        <PdfImportDialog companyId={companyId} onSuccess={fetchTransactions} />
      </div>

      <TransactionFilters
        filters={filters}
        onFiltersChange={setFilters}
        categories={categories}
        accounts={accounts}
      />

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Histórico</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Conta</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                  Nenhum lançamento encontrado.
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{format(new Date(t.date), 'dd/MM/yyyy')}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                        <span className="font-medium">{t.category_name}</span>
                        <span className="text-xs text-muted-foreground">{t.category_code}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm truncate max-w-[300px]">{t.description}</TableCell>
                  <TableCell className="text-right font-mono">
                    {Number(t.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </TableCell>
                  <TableCell>{t.account_name || '-'}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => setEditingTransaction(t)}>
                            <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(t.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {editingTransaction && (
        <TransactionEditDialog
          open={!!editingTransaction}
          onOpenChange={(open) => !open && setEditingTransaction(null)}
          transaction={editingTransaction}
          companyId={companyId}
          categories={categories}
          accounts={accounts}
          onSuccess={fetchTransactions}
        />
      )}
    </div>
  );
}
