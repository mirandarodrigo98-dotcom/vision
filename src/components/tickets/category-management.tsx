'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Pencil, Trash2, Plus, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { createTicketCategory, updateTicketCategory, deleteTicketCategory } from '@/app/actions/ticket-categories';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

interface Category {
  id: string;
  name: string;
  active: number | boolean;
}

interface CategoryManagementProps {
  initialCategories: Category[];
}

export function CategoryManagement({ initialCategories }: CategoryManagementProps) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  
  // Form states
  const [currentCategory, setCurrentCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter categories
  const filteredCategories = categories.filter(cat => 
    cat.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    if (!categoryName.trim()) return;
    
    setIsSubmitting(true);
    try {
      const result = await createTicketCategory(categoryName);
      if (result.error) {
        toast.error(result.error);
      } else if (result.category) {
        toast.success('Categoria criada com sucesso!');
        // Update local state
        setCategories([...categories, { ...result.category, active: 1 }].sort((a, b) => a.name.localeCompare(b.name)));
        setIsCreateOpen(false);
        setCategoryName('');
      }
    } catch (error) {
      toast.error('Erro ao criar categoria');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!currentCategory || !categoryName.trim()) return;
    
    setIsSubmitting(true);
    try {
      const result = await updateTicketCategory(currentCategory.id, { name: categoryName });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Categoria atualizada com sucesso!');
        setCategories(categories.map(cat => 
          cat.id === currentCategory.id ? { ...cat, name: categoryName } : cat
        ).sort((a, b) => a.name.localeCompare(b.name)));
        setIsEditOpen(false);
        setCurrentCategory(null);
        setCategoryName('');
      }
    } catch (error) {
      toast.error('Erro ao atualizar categoria');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!currentCategory) return;
    
    setIsSubmitting(true);
    try {
      const result = await deleteTicketCategory(currentCategory.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Categoria excluída com sucesso!');
        setCategories(categories.filter(cat => cat.id !== currentCategory.id));
        setIsDeleteOpen(false);
        setCurrentCategory(null);
      }
    } catch (error) {
      toast.error('Erro ao excluir categoria');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleActive = async (category: Category) => {
    const newStatus = !category.active;
    // Optimistic update
    setCategories(categories.map(cat => 
      cat.id === category.id ? { ...cat, active: newStatus } : cat
    ));

    try {
      const result = await updateTicketCategory(category.id, { active: newStatus });
      if (result.error) {
        // Revert on error
        setCategories(categories.map(cat => 
          cat.id === category.id ? { ...cat, active: !newStatus } : cat
        ));
        toast.error(result.error);
      } else {
        toast.success(`Categoria ${newStatus ? 'ativada' : 'desativada'}!`);
      }
    } catch (error) {
      // Revert on error
      setCategories(categories.map(cat => 
        cat.id === category.id ? { ...cat, active: !newStatus } : cat
      ));
      toast.error('Erro ao alterar status');
    }
  };

  const openEdit = (category: Category) => {
    setCurrentCategory(category);
    setCategoryName(category.name);
    setIsEditOpen(true);
  };

  const openDelete = (category: Category) => {
    setCurrentCategory(category);
    setIsDeleteOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/tickets">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h2 className="text-3xl font-bold tracking-tight">Gerenciar Categorias</h2>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Incluir
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Categorias de Chamados</CardTitle>
          <div className="pt-4">
            <Input
              placeholder="Filtrar por nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="w-[100px]">Ativo</TableHead>
                <TableHead className="w-[100px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCategories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                    Nenhuma categoria encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filteredCategories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell>
                      <Switch
                        checked={!!category.active}
                        onCheckedChange={() => toggleActive(category)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(category)}
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDelete(category)}
                          title="Excluir"
                          className="text-destructive hover:text-destructive/90"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Categoria</DialogTitle>
            <DialogDescription>
              Insira o nome da nova categoria para chamados.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="Nome da categoria"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={!categoryName.trim() || isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Categoria</DialogTitle>
            <DialogDescription>
              Altere o nome da categoria.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="Nome da categoria"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button onClick={handleEdit} disabled={!categoryName.trim() || isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Categoria</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a categoria "{currentCategory?.name}"?
              Esta ação não poderá ser desfeita.
              <br />
              <span className="text-sm text-muted-foreground mt-2 block">
                Nota: A exclusão só será permitida se não houver chamados vinculados.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete} 
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
