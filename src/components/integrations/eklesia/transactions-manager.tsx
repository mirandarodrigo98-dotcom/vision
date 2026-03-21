'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CsvImportDialog } from './csv-import-dialog';
import { TransactionFilters } from './transaction-filters';
import { TransactionEditDialog } from './transaction-edit-dialog';
import { Loader2, Trash2, Pencil, RefreshCw } from 'lucide-react';
import { getTransactions, deleteTransaction, deleteTransactionsBatch, getCategories, getAccounts, exportTransactionsCsv } from '@/app/actions/integrations/eklesia';
import { syncEklesiaTransactionsToQuestor, checkEklesiaQuestorSyncStatus } from '@/app/actions/integrations/questor';
import { format, isValid, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CircularProgress } from '@/components/ui/circular-progress';
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);
  const [showBatchDeleteDialog, setShowBatchDeleteDialog] = useState(false);
  
  // Export state
  const [isExporting, setIsExporting] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [resync, setResync] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSyncing && !syncResult) {
      setSyncProgress(0);
      
      // Estima o tempo baseado na quantidade de registros (ex: 300ms por registro), mínimo de 2s, máximo de 45s
      const pendingCount = syncStats?.pending || 10;
      const estimatedTimeMs = Math.min(Math.max(2000, pendingCount * 300), 45000); 
      
      // Atualiza a cada 100ms para uma animação mais fluida
      const intervalMs = 100;
      const totalStepsTo90 = estimatedTimeMs / intervalMs;
      const incrementPerStep = 90 / totalStepsTo90;

      interval = setInterval(() => {
        setSyncProgress((prev) => {
          if (prev < 90) {
            // Cresce proporcionalmente ao tempo estimado até 90%
            return Math.min(90, prev + incrementPerStep);
          } else if (prev < 98) {
            // Se passar do tempo estimado e a resposta ainda não chegou, continua subindo bem devagar até 98%
            return prev + 0.05;
          }
          return prev; // Trava em 98% aguardando o servidor
        });
      }, intervalMs);
    } else if (syncResult) {
      setSyncProgress(100);
    }
    return () => clearInterval(interval);
  }, [isSyncing, syncResult, syncStats]);
  
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

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id) 
        : [...prev, id]
    );
  };

  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(transactions.map(t => t.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    
    setIsBatchDeleting(true);
    try {
      const result = await deleteTransactionsBatch(selectedIds, companyId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`${selectedIds.length} lançamentos removidos com sucesso`);
        setSelectedIds([]);
        fetchTransactions();
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro ao excluir lançamentos');
    } finally {
      setIsBatchDeleting(false);
      setShowBatchDeleteDialog(false);
    }
  };

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
        link.setAttribute('download', `eklesia_export_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`);
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
      // Safely serialize dates before sending to Server Action
      const safeFilters = {
          ...filters,
          startDate: (filters as any).startDate ? ((filters as any).startDate instanceof Date ? (filters as any).startDate.toISOString() : (filters as any).startDate) : undefined,
          endDate: (filters as any).endDate ? ((filters as any).endDate instanceof Date ? (filters as any).endDate.toISOString() : (filters as any).endDate) : undefined,
      };
      
      const stats = await checkEklesiaQuestorSyncStatus(companyId, safeFilters);
      if (stats.error) {
        toast.error(stats.error);
        setIsSyncing(false);
        return;
      }
      setSyncStats(stats as any);
      setResync(false);
      setIsSyncing(false); // Reset loading state before showing confirmation
      setShowConfirmSyncDialog(true);
    } catch (error: any) {
        console.error('Error in handleSyncClick:', error);
        toast.error(`Erro ao verificar status: ${error.message || 'Erro desconhecido'}`);
        setIsSyncing(false);
    }
  };

  const confirmSync = async () => {
    setShowConfirmSyncDialog(false);
    setShowSyncDialog(true);
    setIsSyncing(true);
    setSyncResult(null);
    try {
        const safeFilters = {
            ...filters,
            startDate: (filters as any).startDate ? ((filters as any).startDate instanceof Date ? (filters as any).startDate.toISOString() : (filters as any).startDate) : undefined,
            endDate: (filters as any).endDate ? ((filters as any).endDate instanceof Date ? (filters as any).endDate.toISOString() : (filters as any).endDate) : undefined,
        };
        const result = await syncEklesiaTransactionsToQuestor(companyId, { ...safeFilters, resync });
        
        // Force 100% and wait a moment for the user to see it complete
        setSyncProgress(100);
        await new Promise(resolve => setTimeout(resolve, 600));

        setSyncResult(result);
        if (result.success) {
            toast.success('Sincronização concluída');
            fetchTransactions();
        } else {
            if (result.error && result.error.includes('Nenhum lançamento')) {
                toast.info(result.error);
            } else {
                toast.error('Erro na sincronização');
            }
        }
    } catch (e) {
        setSyncProgress(100);
        await new Promise(resolve => setTimeout(resolve, 600));
        setSyncResult({ error: 'Erro inesperado' });
    } finally {
        setIsSyncing(false);
    }
  };

  const safeFormatDate = (dateVal: any) => {
    if (!dateVal) return '-';
    try {
      let parsed: Date;
      if (dateVal instanceof Date) {
        // Prevent timezone shift for midnight UTC dates
        parsed = new Date(dateVal.getUTCFullYear(), dateVal.getUTCMonth(), dateVal.getUTCDate());
      } else if (typeof dateVal === 'string') {
        const cleanDateStr = dateVal.trim();
        if (cleanDateStr.includes('T')) {
          // Extract just the date part to avoid timezone shift
          const datePart = cleanDateStr.split('T')[0];
          parsed = new Date(datePart + 'T12:00:00');
        } else if (cleanDateStr.length === 10) {
          // YYYY-MM-DD
          parsed = new Date(cleanDateStr + 'T12:00:00');
        } else {
          parsed = new Date(cleanDateStr.replace(' ', 'T'));
        }
      } else {
        parsed = new Date(dateVal);
      }
      return isValid(parsed) ? format(parsed, 'dd/MM/yyyy') : '-';
    } catch (e) {
      return '-';
    }
  };

  const getPeriodText = () => {
    const f = filters as any;
    
    if (f.startDate && f.endDate) {
        return `${safeFormatDate(f.startDate)} a ${safeFormatDate(f.endDate)}`;
    }
    if (syncStats?.minDate && syncStats?.maxDate) {
        return `${safeFormatDate(syncStats.minDate)} a ${safeFormatDate(syncStats.maxDate)}`;
    }
    return 'Todos os lançamentos filtrados';
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
            <h3 className="text-lg font-medium">Lançamentos Importados</h3>
            {selectedIds.length > 0 && (
                <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded">
                    {selectedIds.length} selecionado(s)
                </span>
            )}
        </div>
        <div className="flex gap-2">
            {selectedIds.length > 0 && (
                <Button 
                    variant="destructive" 
                    onClick={() => setShowBatchDeleteDialog(true)}
                    disabled={isBatchDeleting}
                >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir Selecionados ({selectedIds.length})
                </Button>
            )}
            <Button onClick={handleSyncClick} variant="outline" disabled={isLoading || isSyncing || isExporting || transactions.length === 0}>
                <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                Sincronizar Questor
            </Button>
            <Button onClick={handleExport} variant="outline" disabled={isLoading || isExporting || isSyncing || transactions.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                Exportar CSV
            </Button>
            <CsvImportDialog companyId={companyId} onSuccess={fetchTransactions} />
        </div>
      </div>

      <AlertDialog open={showBatchDeleteDialog} onOpenChange={setShowBatchDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Lançamentos</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir os {selectedIds.length} lançamentos selecionados?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBatchDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              onClick={(e) => {
                e.preventDefault();
                handleBatchDelete();
              }}
              disabled={isBatchDeleting}
            >
              {isBatchDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

                <div className="flex items-center space-x-2 pt-4 border-t mt-4">
                  <Checkbox 
                    id="resync" 
                    checked={resync} 
                    onCheckedChange={(checked) => setResync(checked === true)} 
                  />
                  <Label 
                    htmlFor="resync" 
                    className="text-sm font-medium leading-none cursor-pointer"
                  >
                    Reenviar lançamentos já sincronizados (Forçar envio)
                  </Label>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSyncing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
                disabled={isSyncing || (syncStats?.pending === 0 && !resync)} 
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
            <div className="py-8">
                {isSyncing ? (
                     <div className="flex flex-col items-center gap-6">
                         <CircularProgress value={syncProgress} size={140} strokeWidth={8} />
                         <p className="text-lg font-medium text-muted-foreground animate-pulse">Processando...</p>
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
              <TableHead className="w-[40px]">
                <Checkbox 
                  checked={transactions.length > 0 && selectedIds.length === transactions.length}
                  onCheckedChange={(checked) => handleToggleSelectAll(checked === true)}
                  aria-label="Select all"
                />
              </TableHead>
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
                <TableCell colSpan={7} className="text-center h-24">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                  Nenhum lançamento encontrado.
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((t) => (
                <TableRow key={t.id} data-state={selectedIds.includes(t.id) && "selected"}>
                  <TableCell>
                    <Checkbox 
                      checked={selectedIds.includes(t.id)}
                      onCheckedChange={() => handleToggleSelect(t.id)}
                      aria-label="Select row"
                    />
                  </TableCell>
                  <TableCell>
                    {safeFormatDate(t.date)}
                  </TableCell>
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
