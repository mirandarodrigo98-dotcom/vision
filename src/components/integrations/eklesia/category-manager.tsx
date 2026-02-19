'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { createCategory, Category, deleteCategory, seedDefaultCategories, getNextCode, updateCategory } from '@/app/actions/integrations/eklesia';
import { Loader2, Trash2, Database, RefreshCcw, Pencil, X } from 'lucide-react';
import { useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { useRouter } from 'next/navigation';

const categorySchema = z.object({
  description: z.string().max(50, 'Máximo 50 caracteres').min(1, 'Obrigatório'),
  integration_code: z.string().max(20, 'Máximo 20 caracteres').optional(),
  nature: z.enum(['Saída', 'Entrada', 'Transferência']),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

interface CategoryListProps {
    initialCategories: Category[];
    companyId: string;
}

export function CategoryManager({ initialCategories, companyId }: CategoryListProps) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [nextCode, setNextCode] = useState<string>('Calculando...');
  const [editingId, setEditingId] = useState<string | null>(null);
  const router = useRouter();

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      description: '',
      integration_code: '',
      nature: 'Saída', // Default value
    },
  });

  const natureValue = form.watch('nature');

  useEffect(() => {
    if (editingId) return; // Don't fetch next code if editing
    async function fetchNextCode() {
        setNextCode('Calculando...');
        const result = await getNextCode(natureValue, companyId);
        if (result.nextCode) {
            setNextCode(result.nextCode);
        } else if (result.error) {
            setNextCode('Erro');
        }
    }
    fetchNextCode();
  }, [natureValue, companyId, categories, editingId]);

  const handleEdit = (category: Category) => {
    setEditingId(category.id);
    form.setValue('description', category.description);
    form.setValue('integration_code', category.integration_code || '');
    form.setValue('nature', category.nature);
    setNextCode(category.code);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    form.reset();
    form.setValue('nature', 'Saída');
    // nextCode will be updated by useEffect
  };

  const onSubmit = async (data: CategoryFormValues) => {
    setIsSubmitting(true);
    try {
      if (editingId) {
        const result = await updateCategory({ ...data, id: editingId }, companyId);
        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success('Categoria atualizada com sucesso!');
          handleCancelEdit();
          window.location.reload();
        }
      } else {
        const result = await createCategory(data, companyId);
        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success('Categoria criada com sucesso!');
          form.reset();
          router.refresh(); 
          window.location.reload();
        }
      }
    } catch (error) {
      toast.error('Erro inesperado ao salvar categoria.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
      try {
          const result = await deleteCategory(id, companyId);
          if (result.success) {
              toast.success("Categoria removida");
              setCategories(prev => prev.filter(c => c.id !== id));
              router.refresh();
          } else {
              toast.error(result.error);
          }
      } catch (error) {
          toast.error("Erro ao remover categoria");
      }
  }

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      const result = await seedDefaultCategories(companyId);
      if (result.success) {
        toast.success(`${result.count} categorias padrão inseridas!`);
        window.location.reload();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error("Erro ao inserir categorias padrão");
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="p-4 border rounded-md bg-gray-50">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">{editingId ? 'Editar Categoria' : 'Nova Categoria'}</h3>
            {categories.length === 0 && !editingId && (
                <Button variant="outline" size="sm" onClick={handleSeed} disabled={true}>
                    {isSeeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
                    Inserir Padrões
                </Button>
            )}
        </div>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          
          {/* Horizontal Layout: Label: Input */}

          {/* Natureza (Moved to top) */}
          <div className="grid grid-cols-12 gap-4 items-center">
            <label className="col-span-3 text-sm font-medium text-right">
              Natureza:
            </label>
            <div className="col-span-9 md:col-span-4">
              <Select 
                onValueChange={(value: any) => form.setValue('nature', value)} 
                defaultValue={form.getValues('nature')}
                disabled={!!editingId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Saída">Saída</SelectItem>
                  <SelectItem value="Entrada">Entrada</SelectItem>
                  <SelectItem value="Transferência">Transferência</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.nature && (
                <span className="text-xs text-red-500">{form.formState.errors.nature.message}</span>
              )}
            </div>
          </div>
          
          {/* Código Reduzido (Read Only) */}
          <div className="grid grid-cols-12 gap-4 items-center">
            <label className="col-span-3 text-sm font-medium text-right">
              Código Reduzido:
            </label>
            <div className="col-span-9 md:col-span-4">
                <div className="flex items-center space-x-2">
                    <Input 
                        value={nextCode}
                        readOnly
                        disabled
                        className="bg-muted font-mono"
                    />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                        (Automático)
                    </span>
                </div>
            </div>
          </div>
          
          {/* Descrição */}
          <div className="grid grid-cols-12 gap-4 items-center">
            <label className="col-span-3 text-sm font-medium text-right">
              Descrição:
            </label>
            <div className="col-span-9 md:col-span-6">
              <Input 
                {...form.register('description')} 
                placeholder="Descrição da categoria" 
                maxLength={50}
              />
              {form.formState.errors.description && (
                <span className="text-xs text-red-500">{form.formState.errors.description.message}</span>
              )}
            </div>
          </div>

          {/* Código de Integração */}
          <div className="grid grid-cols-12 gap-4 items-center">
            <label className="col-span-3 text-sm font-medium text-right">
              Cód. Integração:
            </label>
            <div className="col-span-9 md:col-span-4">
              <Input 
                {...form.register('integration_code')} 
                placeholder="Opcional" 
                maxLength={20}
              />
              {form.formState.errors.integration_code && (
                <span className="text-xs text-red-500">{form.formState.errors.integration_code.message}</span>
              )}
            </div>
          </div>

          {/* Natureza removed from bottom */ }

          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-3"></div>
            <div className="col-span-9 flex gap-2">
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (editingId ? <RefreshCcw className="mr-2 h-4 w-4" /> : <Database className="mr-2 h-4 w-4" />)}
                    {editingId ? 'Salvar Alterações' : 'Adicionar Categoria'}
                </Button>
                {editingId && (
                    <Button type="button" variant="outline" onClick={handleCancelEdit} disabled={isSubmitting}>
                        <X className="mr-2 h-4 w-4" />
                        Cancelar
                    </Button>
                )}
            </div>
          </div>

        </form>
      </div>

      <div className="rounded-md border">
          <Table>
              <TableHeader>
                  <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Cód. Int.</TableHead>
                      <TableHead>Natureza</TableHead>
                      <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                  {categories.length === 0 ? (
                      <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                              Nenhuma categoria cadastrada.
                          </TableCell>
                      </TableRow>
                  ) : (
                      categories.map((category) => (
                          <TableRow key={category.id}>
                              <TableCell className="font-mono">{category.code}</TableCell>
                              <TableCell>{category.description}</TableCell>
                              <TableCell className="font-mono text-xs">{category.integration_code || '-'}</TableCell>
                              <TableCell>{category.nature}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(category)}>
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Excluir Categoria</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Tem certeza que deseja excluir a categoria <strong>{category.description}</strong>?
                                                Essa ação não pode ser desfeita.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDelete(category.id)} className="bg-red-600 hover:bg-red-700">
                                                Excluir
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                                </div>
                              </TableCell>
                          </TableRow>
                      ))
                  )}
              </TableBody>
          </Table>
      </div>
    </div>
  );
}
