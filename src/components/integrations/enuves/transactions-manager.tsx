'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PdfImportDialog } from './pdf-import-dialog';
import { TransactionFilters } from './transaction-filters';
import { TransactionEditDialog } from './transaction-edit-dialog';
import { Loader2, Trash2, Pencil, RefreshCw } from 'lucide-react';
import { getTransactions, deleteTransaction, getCategories, getAccounts, exportTransactionsCsv } from '@/app/actions/integrations/enuves';
import { syncTransactionsToQuestor, checkQuestorSyncStatus } from '@/app/actions/integrations/questor';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Download } from 'lucide-react';

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
  
  // Export state
  const [isExporting, setIsExporting] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  
  // Sync Confirmation
  const [showConfirmSyncDialog, setShowConfirmSyncDialog] = useState(false);
  const [syncStats, setSyncStats] = useState<{ 
    total: number, 
    synced: number, 
    pending: number, 
    hasPriorSync: boolean,
    minDate?: string,
    maxDate?: string
  } | null>(null);

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
    };
    init();
    // Reset filters when company changes (optional, but safer)
    setFilters({});
  }, [companyId]);

  // Re-fetch transactions when filters or company changes
  useEffect(() => {
    fetchTransactions();
  }, [filters, companyId]);

  const handleDelete = async (id: string) => {
      try {
          await deleteTransaction(id, companyId);
          toast.success('Lançamento removido');
          fetchTransactions();
      } catch (error) {
          toast.error('Erro ao remover lançamento');
      }
  }

  const handleExport = async () => {
    setShowExportDialog(true);
    setIsExporting(true);
    
    try {
      const result = await exportTransactionsCsv(companyId, filters);
      
      if (result.error) {
        toast.error(result.error);
        setIsExporting(false);
        setShowExportDialog(false);
        return;
      }
      
      if (result.csv) {
        // Create a blob and download
        const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `enuves_export_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success('Arquivo gerado com sucesso!');
      }
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Erro ao gerar exportação');
    } finally {
      setIsExporting(false);
      // Keep dialog open for a moment or close it immediately?
      // User asked for "popup com progresso... até a chamada da tela para salvar".
      // Since browser handles "save as" dialog, we can close our progress dialog now.
      setShowExportDialog(false);
    }
  };

  const handleSyncClick = async () => {
    setIsSyncing(true);
    try {
      const stats = await checkQuestorSyncStatus(companyId, filters);
      if (stats.error) {
        toast.error(stats.error);
        setIsSyncing(false);
        return;
      }
      setSyncStats(stats as any);
      setIsSyncing(false); // Reset loading state before showing confirmation
      setShowConfirmSyncDialog(true);
    } catch (error) {
        console.error(error);
        toast.error('Erro ao verificar status da sincronização');
        setIsSyncing(false);
    }
  };

  const confirmSync = async () => {
    setShowConfirmSyncDialog(false);
    setShowSyncDialog(true);
    setIsSyncing(true);
    setSyncResult(null);
    try {
        const result = await syncTransactionsToQuestor(companyId, filters);
        setSyncResult(result);
        if (result.success) {
            toast.success('Sincronização concluída');
            fetchTransactions();
        } else {
            // Check if error is "no transactions" to show info instead of error
            if (result.error && result.error.includes('Nenhum lançamento')) {
                toast.info(result.error);
            } else {
                toast.error('Erro na sincronização');
            }
        }
    } catch (e) {
        setSyncResult({ error: 'Erro inesperado' });
    } finally {
        setIsSyncing(false);
    }
  };

  const getPeriodText = () => {
    const f = filters as any;
    if (f.startDate && f.endDate) {
        return `${format(new Date(f.startDate), 'dd/MM/yyyy')} a ${format(new Date(f.endDate), 'dd/MM/yyyy')}`;
    }
    if (syncStats?.minDate && syncStats?.maxDate) {
        // Parse dates which might come as strings from DB
        const min = new Date(syncStats.minDate);
        const max = new Date(syncStats.maxDate);
        return `${format(min, 'dd/MM/yyyy')} a ${format(max, 'dd/MM/yyyy')}`;
    }
    return 'Todos os lançamentos filtrados';
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Lançamentos Importados</h3>
        <div className="flex gap-2">
            <Button onClick={handleSyncClick} variant="outline" disabled={isLoading || isSyncing || isExporting}>
                <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                Sincronizar Questor
            </Button>
            <Button onClick={handleExport} variant="outline" disabled={isLoading || isExporting || isSyncing}>
                <Download className="mr-2 h-4 w-4" />
                Exportar CSV
            </Button>
            <PdfImportDialog companyId={companyId} onSuccess={fetchTransactions} />
        </div>
      </div>

      <AlertDialog open={showConfirmSyncDialog} onOpenChange={(open) => {
        setShowConfirmSyncDialog(open);
        if (!open) setIsSyncing(false);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Sincronização</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div><strong>Período:</strong> {getPeriodText()}</div>
                <div><strong>Total de lançamentos no período:</strong> {syncStats?.total}</div>
                
                {syncStats?.hasPriorSync && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800">
                    <strong>Atenção:</strong> Já existem lançamentos integrados neste período.
                    <br />
                    Apenas os <strong>{syncStats?.pending}</strong> lançamentos novos ou modificados serão enviados para evitar duplicação.
                  </div>
                )}
                
                {!syncStats?.hasPriorSync && (
                   <div>Serão enviados {syncStats?.pending} lançamentos.</div>
                )}

                {syncStats?.pending === 0 && (
                   <div className="text-red-500 font-medium">Não há novos lançamentos para sincronizar.</div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSyncing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
                disabled={isSyncing || syncStats?.pending === 0} 
                onClick={(e) => {
                    e.preventDefault(); 
                    confirmSync();
                }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showSyncDialog} onOpenChange={setShowSyncDialog}>
        <DialogContent className="max-w-md">
            <DialogHeader>
                <DialogTitle>Sincronização com Questor</DialogTitle>
                <DialogDescription>
                    Enviando lançamentos para o módulo Contábil...
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                {isSyncing ? (
                     <div className="flex flex-col items-center gap-4">
                         <Loader2 className="h-8 w-8 animate-spin text-primary" />
                         <p>Processando...</p>
                     </div>
                ) : syncResult ? (
                    <div className="space-y-4">
                        {syncResult.success ? (
                            <div className="text-green-600 font-medium text-center">
                                {syncResult.message || 'Sucesso!'}
                            </div>
                        ) : (
                            <div className="text-red-600 text-sm">
                                <p className="font-bold">Erro:</p>
                                <p>{syncResult.error}</p>
                                {syncResult.details && (
                                    <ul className="list-disc pl-5 mt-2 max-h-[200px] overflow-y-auto">
                                        {syncResult.details.map((d: string, i: number) => (
                                            <li key={i}>{d}</li>
                                        ))}
                                    </ul>
                                )}
                                {syncResult.preview && (
                                    <div className="mt-2 text-xs text-muted-foreground bg-muted p-2 rounded">
                                        <p className="font-semibold">Preview (Simulação):</p>
                                        <pre>{syncResult.preview.join('\n')}</pre>
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="flex justify-end">
                            <Button onClick={() => setShowSyncDialog(false)}>Fechar</Button>
                        </div>
                    </div>
                ) : null}
            </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Gerando Arquivo de Exportação</DialogTitle>
                <DialogDescription>
                    Por favor, aguarde enquanto o sistema processa os lançamentos e gera o arquivo CSV.
                </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center justify-center py-6 space-y-4">
                {isExporting ? (
                    <>
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">Processando dados...</p>
                    </>
                ) : (
                    <p className="text-sm text-green-600 font-medium">Arquivo gerado!</p>
                )}
            </div>
        </DialogContent>
      </Dialog>

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
