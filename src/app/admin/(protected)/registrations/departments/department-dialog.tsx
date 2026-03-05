
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { createDepartment, updateDepartment } from '@/app/actions/departments';
import { toast } from 'sonner';
import { Department } from '@/app/actions/departments';

const departmentSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    description: z.string().optional(),
});

interface DepartmentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    department?: Department | null;
}

export function DepartmentDialog({ open, onOpenChange, department }: DepartmentDialogProps) {
    const [loading, setLoading] = useState(false);

    const form = useForm<z.infer<typeof departmentSchema>>({
        resolver: zodResolver(departmentSchema),
        defaultValues: {
            name: department?.name || '',
            description: department?.description || '',
        },
    });

    // Reset form when department changes
    useEffect(() => {
        if (department) {
            form.reset({
                name: department.name,
                description: department.description || '',
            });
        } else {
            form.reset({
                name: '',
                description: '',
            });
        }
    }, [department, form]);

    async function onSubmit(values: z.infer<typeof departmentSchema>) {
        setLoading(true);
        try {
            if (department) {
                const result = await updateDepartment(department.id, values);
                if (result.error) {
                    toast.error(result.error);
                } else {
                    toast.success('Departamento atualizado com sucesso!');
                    onOpenChange(false);
                }
            } else {
                const result = await createDepartment(values);
                if (result.error) {
                    toast.error(result.error);
                } else {
                    toast.success('Departamento criado com sucesso!');
                    onOpenChange(false);
                    form.reset();
                }
            }
        } catch (error) {
            toast.error('Ocorreu um erro ao salvar o departamento.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{department ? 'Editar Departamento' : 'Novo Departamento'}</DialogTitle>
                    <DialogDescription>
                        {department ? 'Edite as informações do departamento.' : 'Preencha as informações para criar um novo departamento.'}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nome</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: Financeiro" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Descrição</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Descrição opcional do departamento" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? 'Salvando...' : 'Salvar'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
