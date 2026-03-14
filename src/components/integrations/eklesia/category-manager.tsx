'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  createCategory, 
  Category, 
  deleteCategory, 
  seedDefaultCategories, 
  getNextCode, 
  updateCategory,
  getCategories,
  toggleCategoryStatus
} from '@/app/actions/integrations/eklesia';
// import { CategoriesImportDialog } from './categories-import-dialog';
import { Loader2, Trash2, Database, RefreshCcw, Pencil, Plus, Filter } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useRouter } from 'next/navigation';
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Filter states
  const [isFilterLoading, setIsFilterLoading] = useState(false);
  const [filters, setFilters] = useState({
      code: '',
      description: '',
      integration_code: '',
      nature: 'all'
  });

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
    if (!isDialogOpen) return; // Don't fetch if dialog is closed

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
  }, [natureValue, companyId, categories, editingId, isDialogOpen]);

  const handleOpenCreate = () => {
      setEditingId(null);
      form.reset();
      form.setValue('nature', 'Saída');
      setIsDialogOpen(true);
  };

  const handleEdit = (category: Category) => {
    setEditingId(category.id);
    form.setValue('description', category.description);
    form.setValue('integration_code', category.integration_code || '');
    form.setValue('nature', category.nature);
    setNextCode(category.code);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingId(null);
    form.reset();
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
          handleCloseDialog();
          // Refresh list locally or via re-fetch
          handleFilter(); // Re-fetch with current filters
        }
      } else {
        const result = await createCategory(data, companyId);
        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success('Categoria criada com sucesso!');
          form.reset();
          handleCloseDialog();
          handleFilter(); // Re-fetch with current filters
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

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
        const result = await toggleCategoryStatus(id, !currentStatus, companyId);
        if (result.success) {
            toast.success(`Categoria ${!currentStatus ? 'ativada' : 'desativada'}`);
            setCategories(prev => prev.map(c => c.id === id ? { ...c, is_active: !currentStatus } : c));
        } else {
            toast.error(result.error);
        }
    } catch (error) {
        toast.error("Erro ao alterar status");
    }
  };

  const handleFilter = async () => {
    setIsFilterLoading(true);
    try {
        const data = await getCategories(companyId, filters);
        setCategories(data);
    } catch (error) {
        toast.error("Erro ao filtrar categorias");
    } finally {
        setIsFilterLoading(false);
    }
  };

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      const result = await seedDefaultCategories(companyId);
      if (result.success) {
        toast.success(`${result.count} categorias padrão inseridas!`);
        handleFilter();
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
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Filtros de Pesquisa</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                <div className="space-y-1">
                    <label className="text-xs font-medium">Código</label>
                    <Input 
                        placeholder="Ex: 900" 
                        value={filters.code} 
                        onChange={(e) => setFilters(prev => ({ ...prev, code: e.target.value }))}
                    />
                </div>
                <div className="space-y-1 md:col-span-2">
                    <label className="text-xs font-medium">Descrição</label>
                    <Input 
                        placeholder="Descrição da categoria" 
                        value={filters.description} 
                        onChange={(e) => setFilters(prev => ({ ...prev, description: e.target.value }))}
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-medium">Cód. Interno</label>
                    <Input 
                        placeholder="Cód. Integração" 
                        value={filters.integration_code} 
                        onChange={(e) => setFilters(prev => ({ ...prev, integration_code: e.target.value }))}
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-medium">Natureza</label>
                    <Select 
                        value={filters.nature} 
                        onValueChange={(value) => setFilters(prev => ({ ...prev, nature: value }))}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Todas" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas</SelectItem>
                            <SelectItem value="Saída">Saída</SelectItem>
                            <SelectItem value="Entrada">Entrada</SelectItem>
                            <SelectItem value="Transferência">Transferência</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="mt-4 flex justify-end">
                <Button onClick={handleFilter} disabled={isFilterLoading} size="sm">
                    {isFilterLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Filter className="mr-2 h-4 w-4" />}
                    Filtrar
                </Button>
            </div>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Listagem de Categorias</h3>
        <div className="flex gap-2">
            <CategoriesImportDialog companyId={companyId} onSuccess={handleFilter} />
            {categories.length === 0 && !isFilterLoading && (
                <Button variant="outline" size="sm" onClick={handleSeed} disabled={isSeeding}>
                    {isSeeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
                    Inserir Padrões
                </Button>
            )}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                    <Button onClick={handleOpenCreate}>
                        <Plus className="mr-2 h-4 w-4" />
                        Incluir
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingId ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
                        <DialogDescription>
                            Preencha os dados abaixo para {editingId ? 'editar' : 'criar'} a categoria.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                        {/* Natureza */}
                        <div className="grid grid-cols-4 gap-4 items-center">
                            <label className="text-sm font-medium text-right">Natureza:</label>
                            <div className="col-span-3">
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

                        {/* Código Reduzido */}
                        <div className="grid grid-cols-4 gap-4 items-center">
                            <label className="text-sm font-medium text-right">Código:</label>
                            <div className="col-span-3">
                                <div className="flex items-center space-x-2">
                                    <Input 
                                        value={nextCode}
                                        readOnly
                                        disabled
                                        className="bg-muted font-mono w-32"
                                    />
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                        (Automático)
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Descrição */}
                        <div className="grid grid-cols-4 gap-4 items-center">
                            <label className="text-sm font-medium text-right">Descrição:</label>
                            <div className="col-span-3">
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
                        <div className="grid grid-cols-4 gap-4 items-center">
                            <label className="text-sm font-medium text-right">Cód. Int.:</label>
                            <div className="col-span-3">
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

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={handleCloseDialog} disabled={isSubmitting}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (editingId ? <RefreshCcw className="mr-2 h-4 w-4" /> : <Database className="mr-2 h-4 w-4" />)}
                                {editingId ? 'Salvar' : 'Adicionar'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
      </div>

      <div className="rounded-md border bg-white">
          <Table>
              <TableHeader>
                  <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Cód. Int.</TableHead>
                      <TableHead>Natureza</TableHead>
                      <TableHead className="w-[100px] text-center">Status</TableHead>
                      <TableHead className="w-[120px] text-right">Ações</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                  {isFilterLoading ? (
                      <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                              <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                          </TableCell>
                      </TableRow>
                  ) : categories.length === 0 ? (
                      <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                              Nenhuma categoria encontrada.
                          </TableCell>
                      </TableRow>
                  ) : (
                      categories.map((category) => (
                          <TableRow key={category.id} className={!category.is_active ? 'opacity-60 bg-gray-50' : ''}>
                              <TableCell className="font-mono">{category.code}</TableCell>
                              <TableCell className="font-medium">{category.description}</TableCell>
                              <TableCell className="font-mono text-xs text-muted-foreground">{category.integration_code || '-'}</TableCell>
                              <TableCell>{category.nature}</TableCell>
                              <TableCell className="text-center">
                                  <div className="flex justify-center">
                                      <Switch 
                                          checked={category.is_active} 
                                          onCheckedChange={() => handleToggleStatus(category.id, category.is_active)}
                                      />
                                  </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(category)} title="Editar">
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    
                                    <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" title="Excluir">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Excluir Categoria</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Tem certeza que deseja excluir a categoria <strong>{category.description}</strong>?
                                                <br/><br/>
                                                <span className="text-red-600 font-medium text-xs">Atenção: Não é possível excluir categorias que possuem lançamentos vinculados.</span>
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
