
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
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
import { updateDepartment, Department } from '@/app/actions/departments';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const departmentSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    description: z.string().optional(),
});

interface DepartmentDetailsFormProps {
    department: Department;
}

export function DepartmentDetailsForm({ department }: DepartmentDetailsFormProps) {
    const [loading, setLoading] = useState(false);

    const form = useForm<z.infer<typeof departmentSchema>>({
        resolver: zodResolver(departmentSchema),
        defaultValues: {
            name: department.name,
            description: department.description || '',
        },
    });

    async function onSubmit(values: z.infer<typeof departmentSchema>) {
        setLoading(true);
        try {
            const result = await updateDepartment(department.id, values);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success('Departamento atualizado com sucesso!');
            }
        } catch (error) {
            toast.error('Ocorreu um erro ao salvar o departamento.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
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
                <div className="flex justify-end">
                    <Button type="submit" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Salvar Alterações
                    </Button>
                </div>
            </form>
        </Form>
    );
}
