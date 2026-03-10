'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toggleCompanyStatus, deleteCompany, deleteCompaniesBatch } from '@/app/actions/companies';
import { toast } from 'sonner';
import { Pencil, Power, PowerOff, Plus, Trash2, Eye } from 'lucide-react';
import Link from 'next/link';
import { Checkbox } from '@/components/ui/checkbox';
import { CompanyDetailsDialog } from '@/components/admin/companies/company-details-dialog';
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
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ColumnHeader } from '@/components/ui/column-header';

interface Company {
  id: string;
  nome: string;
  razao_social: string;
  cnpj: string;
  code: string | null;
  filial: string | null;
  municipio: string | null;
  uf: string | null;
  data_abertura: string | null;
  telefone: string;
  email_contato: string;
  is_active: number;
  has_movements: number;
}

export function CompanyList({ companies }: { companies: Company[] }) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);

  // Filter companies that can be deleted
  const deletableCompanies = companies.filter(c => c.has_movements !== 1);
  const allDeletableSelected = deletableCompanies.length > 0 && deletableCompanies.every(c => selectedIds.has(c.id));
  const someDeletableSelected = deletableCompanies.some(c => selectedIds.has(c.id));

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(deletableCompanies.map(c => c.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBatchDelete = async () => {
    const result = await deleteCompaniesBatch(Array.from(selectedIds));
    if (result.success) {
      toast.success(result.message);
      setSelectedIds(new Set());
    } else {
      toast.error(result.error);
    }
    setBatchDeleteDialogOpen(false);
  };

  return (
    <div className="space-y-4">
      {selectedIds.size > 0 && (
        <div className="bg-muted/50 p-2 rounded-md flex items-center justify-between">
          <span className="text-sm text-muted-foreground ml-2">
            {selectedIds.size} empresa(s) selecionada(s)
          </span>
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={() => setBatchDeleteDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Excluir Selecionadas
          </Button>
        </div>
      )}

      <div className="border rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox 
                  checked={allDeletableSelected}
                  onCheckedChange={(checked) => handleSelectAll(!!checked)}
                  aria-label="Selecionar todas"
                  disabled={deletableCompanies.length === 0}
                />
              </TableHead>
              <TableHead>
                <ColumnHeader column="code" title="Código" />
              </TableHead>
              <TableHead>
                <ColumnHeader column="razao_social" title="Razão Social" />
              </TableHead>
              <TableHead>
                <ColumnHeader column="cnpj" title="CNPJ" />
              </TableHead>
              <TableHead>
                <ColumnHeader column="email_contato" title="Email" />
              </TableHead>
              <TableHead>
                <ColumnHeader column="is_active" title="Status" />
              </TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.map((company) => {
              const canDelete = company.has_movements !== 1;
              const isSelected = selectedIds.has(company.id);

              return (
                <TableRow key={company.id} data-state={isSelected ? "selected" : undefined}>
                  <TableCell>
                    <Checkbox 
                      checked={isSelected}
                      onCheckedChange={(checked) => handleSelectOne(company.id, !!checked)}
                      disabled={!canDelete}
                      aria-label={`Selecionar ${company.razao_social}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{company.code || '-'}</TableCell>
                  <TableCell className="font-medium">{company.razao_social}</TableCell>
                  <TableCell>{company.cnpj}</TableCell>
                  <TableCell>{company.email_contato}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${company.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {company.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <CompanyDetailsDialog company={company} />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Visualizar Detalhes</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link href={`/admin/clients/${company.id}/edit`}>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-primary border-primary/20 hover:bg-primary/10"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Editar</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    {canDelete ? (
                       <AlertDialog>
                         <TooltipProvider>
                           <Tooltip>
                             <TooltipTrigger asChild>
                               <AlertDialogTrigger asChild>
                                 <Button 
                                     variant="ghost" 
                                     size="icon"
                                     className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                 >
                                     <Trash2 className="h-4 w-4" />
                                 </Button>
                               </AlertDialogTrigger>
                             </TooltipTrigger>
                             <TooltipContent>
                               <p>Excluir</p>
                             </TooltipContent>
                           </Tooltip>
                         </TooltipProvider>
                         <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir Empresa</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir a empresa <strong>{company.razao_social}</strong>?
                              <br/><br/>
                              Esta ação não pode ser desfeita e removerá permanentemente os dados da empresa.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={async () => {
                                const res = await deleteCompany(company.id);
                                if (res.error) {
                                  toast.error(res.error);
                                } else {
                                  toast.success('Empresa excluída com sucesso');
                                }
                              }}
                              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span tabIndex={0} className="inline-block">
                              <Button 
                                  variant="ghost" 
                                  size="icon"
                                  disabled
                                  className="opacity-50 cursor-not-allowed"
                              >
                                  <Trash2 className="h-4 w-4" />
                              </Button>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Empresa possui movimentações e não pode ser excluída</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    
                    <form action={async () => {
                       await toggleCompanyStatus(company.id, !company.is_active);
                       toast.success('Status atualizado');
                    }} className="inline-block">
                      <Button variant="ghost" size="icon" type="submit" title={company.is_active ? "Desativar" : "Ativar"}>
                        {company.is_active ? <PowerOff className="h-4 w-4 text-red-500" /> : <Power className="h-4 w-4 text-green-500" />}
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
              );
            })}
            {companies.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center">Nenhuma empresa cadastrada.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={batchDeleteDialogOpen} onOpenChange={setBatchDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Empresas Selecionadas</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir as <strong>{selectedIds.size}</strong> empresas selecionadas?
              <br/><br/>
              Esta ação não pode ser desfeita e removerá permanentemente os dados das empresas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBatchDelete}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
