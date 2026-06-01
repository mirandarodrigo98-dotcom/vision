'use client';

import { useEffect, useState } from 'react';
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
import { Switch } from '@/components/ui/switch';
import {
  createSolicitationType,
  SolicitationType,
  updateSolicitationType,
} from '@/app/actions/solicitation-types';
import { toast } from 'sonner';

const solicitationTypeSchema = z.object({
  name: z.string().min(1, 'Nome e obrigatorio'),
  description: z.string().optional(),
  department_id: z.string().min(1, 'Departamento e obrigatorio'),
  is_active: z.boolean(),
});

interface DepartmentOption {
  id: string;
  name: string;
}

interface SolicitationTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  solicitationType?: SolicitationType | null;
  departments: DepartmentOption[];
}

export function SolicitationTypeDialog({
  open,
  onOpenChange,
  solicitationType,
  departments,
}: SolicitationTypeDialogProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof solicitationTypeSchema>>({
    resolver: zodResolver(solicitationTypeSchema),
    defaultValues: {
      name: solicitationType?.name || '',
      description: solicitationType?.description || '',
      department_id: solicitationType?.department_id || '',
      is_active: solicitationType?.is_active ?? true,
    },
  });

  useEffect(() => {
    if (solicitationType) {
      form.reset({
        name: solicitationType.name,
        description: solicitationType.description || '',
        department_id: solicitationType.department_id,
        is_active: solicitationType.is_active,
      });
    } else {
      form.reset({
        name: '',
        description: '',
        department_id: '',
        is_active: true,
      });
    }
  }, [solicitationType, form]);

  async function onSubmit(values: z.infer<typeof solicitationTypeSchema>) {
    setLoading(true);
    try {
      const result = solicitationType
        ? await updateSolicitationType(solicitationType.id, values)
        : await createSolicitationType(values);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(solicitationType ? 'Tipo atualizado com sucesso!' : 'Tipo criado com sucesso!');
        onOpenChange(false);
        form.reset();
      }
    } catch (error) {
      toast.error('Ocorreu um erro ao salvar o tipo de solicitacao.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{solicitationType ? 'Editar Tipo de Solicitacao' : 'Novo Tipo de Solicitacao'}</DialogTitle>
          <DialogDescription>
            Defina o nome, o departamento responsavel e se o tipo ficara disponivel para o cliente.
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
                    <Input placeholder="Ex: Alteracao contratual" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="department_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Departamento</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Selecione</option>
                      {departments.map((department) => (
                        <option key={department.id} value={department.id}>
                          {department.name}
                        </option>
                      ))}
                    </select>
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
                  <FormLabel>Descricao</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Descricao opcional para orientar o cliente" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-1">
                    <FormLabel className="text-base">Ativo para o cliente</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Quando ativo, aparece no modal de nova solicitacao do cliente.
                    </p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
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
