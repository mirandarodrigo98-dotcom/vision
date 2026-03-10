'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { 
  Trash2, 
  Edit, 
  Eye, 
  Power,
  AlertCircle
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import { ColumnHeader } from '@/components/ui/column-header';
import { toggleEmployeeStatus, deleteEmployee, deleteEmployeesBatch } from '@/app/actions/employees';

interface Employee {
  id: string;
  code: string;
  name: string;
  company_name: string;
  cpf: string;
  admission_date: string;
  created_at: string;
  is_active: number;
  status: string;
  has_movements: number; // 0 or 1
}

interface EmployeeTableProps {
  employees: Employee[];
}

export function EmployeeTable({ employees }: EmployeeTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<string | null>(null);

  // Filter employees that can be deleted (no movements)
  const deletableEmployees = employees.filter(e => !e.has_movements);
  const deletableEmployeeIds = new Set(deletableEmployees.map(e => e.id));

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Select only those that can be deleted
      setSelectedIds(deletableEmployeeIds);
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

  const handleDeleteOne = (id: string) => {
    setEmployeeToDelete(id);
    setShowDeleteDialog(true);
  };

  const confirmDeleteOne = () => {
    if (!employeeToDelete) return;

    startTransition(async () => {
      const result = await deleteEmployee(employeeToDelete);
      if (result.success) {
        toast.success('Funcionário excluído com sucesso.');
        setSelectedIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(employeeToDelete);
          return newSet;
        });
        router.refresh();
      } else {
        toast.error(result.error || 'Erro ao excluir funcionário.');
      }
      setShowDeleteDialog(false);
      setEmployeeToDelete(null);
    });
  };

  const handleDeleteBatch = () => {
    if (selectedIds.size === 0) return;

    startTransition(async () => {
      const result = await deleteEmployeesBatch(Array.from(selectedIds));
      if (result.success) {
        toast.success(result.message);
        setSelectedIds(new Set());
        router.refresh();
      } else {
        toast.error(result.error || 'Erro ao excluir funcionários.');
      }
    });
  };

  const handleToggleStatus = (id: string, currentStatus: boolean) => {
    startTransition(async () => {
      const result = await toggleEmployeeStatus(id, !currentStatus);
      if (result.success) {
        toast.success(`Funcionário ${currentStatus ? 'desativado' : 'ativado'} com sucesso.`);
        router.refresh();
      } else {
        toast.error(result.error || 'Erro ao alterar status.');
      }
    });
  };

  return (
    <div className="space-y-4">
      {selectedIds.size > 0 && (
        <div className="bg-muted/50 p-2 rounded-md flex items-center justify-between">
          <span className="text-sm text-muted-foreground ml-2">
            {selectedIds.size} funcionário(s) selecionado(s)
          </span>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={isPending}>
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir Selecionados
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir Funcionários</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir {selectedIds.size} funcionário(s)? 
                  Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteBatch} className="bg-red-600 hover:bg-red-700">
                  Confirmar Exclusão
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      <div className="border rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox 
                  checked={deletableEmployees.length > 0 && selectedIds.size === deletableEmployees.length}
                  onCheckedChange={handleSelectAll}
                  disabled={deletableEmployees.length === 0}
                />
              </TableHead>
              <TableHead>
                <ColumnHeader column="code" title="Código" />
              </TableHead>
              <TableHead>
                <ColumnHeader column="name" title="Nome" />
              </TableHead>
              <TableHead>
                <ColumnHeader column="company_name" title="Empresa" />
              </TableHead>
              <TableHead>
                <ColumnHeader column="cpf" title="CPF" />
              </TableHead>
              <TableHead>
                <ColumnHeader column="admission_date" title="Admissão" />
              </TableHead>
              <TableHead>
                <ColumnHeader column="status" title="Status" />
              </TableHead>
              <TableHead>
                <ColumnHeader column="created_at" title="Criado em" />
              </TableHead>
              <TableHead className="w-[140px] text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  Nenhum funcionário encontrado com os filtros selecionados.
                </TableCell>
              </TableRow>
            ) : (
              employees.map((employee) => {
                let admissionDate = '-';
                try {
                   if (employee.admission_date) {
                     // Check if it's already in DD/MM/YYYY format or YYYY-MM-DD
                     if (employee.admission_date.includes('/')) {
                        admissionDate = employee.admission_date;
                     } else {
                        const date = new Date(employee.admission_date);
                        if (!isNaN(date.getTime())) {
                          // Adjust for timezone offset if needed, but usually YYYY-MM-DD string is better handled by split
                          const [y, m, d] = employee.admission_date.split('-');
                          if (y && m && d) admissionDate = `${d}/${m}/${y}`;
                          else admissionDate = format(date, 'dd/MM/yyyy');
                        }
                     }
                   }
                } catch (e) {}

                let createdAt = '-';
                try {
                   if (employee.created_at) {
                     const date = new Date(employee.created_at);
                     if (!isNaN(date.getTime())) {
                       createdAt = format(date, 'dd/MM/yyyy HH:mm');
                     }
                   }
                } catch (e) {}
                
                const canDelete = !employee.has_movements;
                const isActive = employee.is_active === 1;

                return (
                <TableRow key={employee.id}>
                  <TableCell>
                    <Checkbox 
                      checked={selectedIds.has(employee.id)}
                      onCheckedChange={(checked) => handleSelectOne(employee.id, !!checked)}
                      disabled={!canDelete}
                    />
                  </TableCell>
                  <TableCell>{employee.code || '-'}</TableCell>
                  <TableCell className="font-medium">{employee.name}</TableCell>
                  <TableCell>{employee.company_name}</TableCell>
                  <TableCell>{employee.cpf || '-'}</TableCell>
                  <TableCell suppressHydrationWarning>
                    {admissionDate}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      employee.status === 'Admitido' ? 'bg-green-100 text-green-800' :
                      employee.status === 'Desligado' ? 'bg-red-100 text-red-800' :
                      employee.status === 'Transferido' ? 'bg-primary/10 text-primary' :
                      employee.status === 'Férias' ? 'bg-yellow-100 text-yellow-800' :
                      employee.status === 'Afastado' ? 'bg-orange-100 text-orange-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {employee.status || 'Admitido'}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm" suppressHydrationWarning>
                    {createdAt}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 justify-center">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => router.push(`/admin/employees/${employee.id}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Visualizar</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                              onClick={() => router.push(`/admin/employees/${employee.id}/edit`)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Editar</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-8 w-8 ${isActive ? 'text-green-600 hover:text-green-700 hover:bg-green-50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
                              onClick={() => handleToggleStatus(employee.id, isActive)}
                            >
                              <Power className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{isActive ? 'Desativar' : 'Ativar'}</TooltipContent>
                        </Tooltip>

                        {canDelete ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDeleteOne(employee.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Excluir</TooltipContent>
                          </Tooltip>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="cursor-not-allowed opacity-50">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  disabled
                                >
                                  <AlertCircle className="h-4 w-4" />
                                </Button>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>Não é possível excluir (possui movimentações)</TooltipContent>
                          </Tooltip>
                        )}
                      </TooltipProvider>
                    </div>
                  </TableCell>
                </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Funcionário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este funcionário? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEmployeeToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteOne} className="bg-red-600 hover:bg-red-700">
              Confirmar Exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
