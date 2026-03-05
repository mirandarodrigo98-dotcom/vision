
'use client';

import { useState } from 'react';
import { Department, deleteDepartment } from '@/app/actions/departments';
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
import { DepartmentDialog } from './department-dialog';
import { toast } from 'sonner';
import { MoreHorizontal, Pencil, Trash, Lock } from 'lucide-react';
import Link from 'next/link';
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

interface DepartmentListProps {
    departments: Department[];
}

export function DepartmentList({ departments }: DepartmentListProps) {
    const [open, setOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    async function handleDelete() {
        if (!deleteId) return;

        const result = await deleteDepartment(deleteId);
        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success('Departamento excluído com sucesso!');
        }
        setDeleteId(null);
    }

    return (
        <>
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Departamentos</h1>
                <Button onClick={() => setOpen(true)}>Novo Departamento</Button>
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead className="w-[100px]">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {departments.map((department) => (
                            <TableRow key={department.id}>
                                <TableCell className="font-medium">{department.name}</TableCell>
                                <TableCell>{department.description}</TableCell>
                                <TableCell>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                <span className="sr-only">Abrir menu</span>
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                            <DropdownMenuItem asChild>
                                                <Link href={`/admin/registrations/departments/${department.id}/edit`}>
                                                    <Pencil className="mr-2 h-4 w-4" />
                                                    Editar
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem 
                                                className="text-red-600 focus:text-red-600"
                                                onClick={() => setDeleteId(department.id)}
                                            >
                                                <Trash className="mr-2 h-4 w-4" />
                                                Excluir
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                        {departments.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                                    Nenhum departamento encontrado.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <DepartmentDialog open={open} onOpenChange={setOpen} />

            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação não pode ser desfeita. Isso excluirá permanentemente o departamento.
                            Certifique-se de que não há usuários vinculados a este departamento antes de excluir.
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
