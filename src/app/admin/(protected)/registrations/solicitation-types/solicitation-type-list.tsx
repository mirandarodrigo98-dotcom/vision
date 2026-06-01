'use client';

import { useState } from 'react';
import { MoreHorizontal, Pencil, Trash } from 'lucide-react';
import { toast } from 'sonner';
import {
  deleteSolicitationType,
  SolicitationType,
} from '@/app/actions/solicitation-types';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { SolicitationTypeDialog } from './solicitation-type-dialog';

interface DepartmentOption {
  id: string;
  name: string;
}

interface SolicitationTypeListProps {
  solicitationTypes: SolicitationType[];
  departments: DepartmentOption[];
}

export function SolicitationTypeList({
  solicitationTypes,
  departments,
}: SolicitationTypeListProps) {
  const [open, setOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<SolicitationType | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function handleDelete() {
    if (!deleteId) return;

    const result = await deleteSolicitationType(deleteId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Tipo de solicitacao excluido com sucesso!');
    }
    setDeleteId(null);
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tipos de Solicitacao</h1>
          <p className="text-sm text-muted-foreground">
            Cadastre os tipos exibidos no modal do cliente e vincule cada um ao departamento correto.
          </p>
        </div>
        <Button
          onClick={() => {
            setSelectedType(null);
            setOpen(true);
          }}
        >
          Novo Tipo
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Departamento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Descricao</TableHead>
              <TableHead className="w-[100px]">Acoes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {solicitationTypes.map((solicitationType) => (
              <TableRow key={solicitationType.id}>
                <TableCell className="font-medium">{solicitationType.name}</TableCell>
                <TableCell>{solicitationType.department_name}</TableCell>
                <TableCell>
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                    solicitationType.is_active
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-gray-200 text-gray-700'
                  }`}>
                    {solicitationType.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                </TableCell>
                <TableCell>{solicitationType.description || '-'}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Abrir menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Acoes</DropdownMenuLabel>
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedType(solicitationType);
                          setOpen(true);
                        }}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600 focus:text-red-600"
                        onClick={() => setDeleteId(solicitationType.id)}
                      >
                        <Trash className="mr-2 h-4 w-4" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {solicitationTypes.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Nenhum tipo de solicitacao encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <SolicitationTypeDialog
        open={open}
        onOpenChange={setOpen}
        solicitationType={selectedType}
        departments={departments}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(nextOpen) => !nextOpen && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Voce tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acao nao pode ser desfeita. O tipo so podera ser excluido se ainda nao tiver sido usado em solicitacoes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
