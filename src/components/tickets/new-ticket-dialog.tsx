'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createTicket, getPotentialAssignees } from '@/app/actions/tickets';
import { getTicketCategories, createTicketCategory } from '@/app/actions/ticket-categories';
import { Plus, Loader2, Paperclip, X } from 'lucide-react';
import { toast } from 'sonner';

const ticketSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().min(1, 'Descrição é obrigatória'),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  category: z.string().min(1, 'Categoria é obrigatória'),
  assignee_id: z.string().min(1, 'Destinatário é obrigatório'),
});

type TicketFormValues = z.infer<typeof ticketSchema>;

export function NewTicketDialog() {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [assignees, setAssignees] = useState<{ id: string; name: string; department_name?: string }[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  
  const router = useRouter();

  const form = useForm<TicketFormValues>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'medium',
      category: '',
      assignee_id: '',
    },
  });

  useEffect(() => {
    if (open) {
      fetchCategories();
      fetchAssignees();
    }
  }, [open]);

  async function fetchCategories() {
    setLoadingCategories(true);
    try {
      const data = await getTicketCategories();
      setCategories(data);
    } catch (error) {
      toast.error('Erro ao carregar categorias');
    } finally {
      setLoadingCategories(false);
    }
  }

  async function fetchAssignees() {
    try {
      const data = await getPotentialAssignees();
      setAssignees(data);
    } catch (error) {
      console.error('Error fetching assignees', error);
    }
  }

  async function handleCreateCategory() {
    if (!newCategoryName.trim()) return;
    
    setCreatingCategory(true);
    try {
      const result = await createTicketCategory(newCategoryName);
      if (result.error) {
        toast.error(result.error);
      } else if (result.category) {
        toast.success('Categoria criada!');
        setCategories([...categories, result.category]);
        form.setValue('category', result.category.name); // Auto-select using name as value
        setNewCategoryName('');
        setShowNewCategoryInput(false);
      }
    } catch (error) {
      toast.error('Erro ao criar categoria');
    } finally {
      setCreatingCategory(false);
    }
  }

  async function onSubmit(data: TicketFormValues) {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('description', data.description);
    formData.append('priority', data.priority);
    formData.append('category', data.category);

    files.forEach((file) => {
      formData.append('attachments', file);
    });

    try {
      const result = await createTicket(null, formData);
      
      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success('Chamado criado com sucesso!');
      setOpen(false);
      form.reset();
      router.refresh();
    } catch (error) {
      toast.error('Erro ao criar chamado');
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const totalFiles = files.length + newFiles.length;

      if (totalFiles > 5) {
        toast.error('Máximo de 5 arquivos permitidos.');
        return;
      }

      for (const file of newFiles) {
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`O arquivo ${file.name} excede o limite de 5MB.`);
          return;
        }
      }

      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Novo Chamado
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Novo Chamado</DialogTitle>
          <DialogDescription>
            Descreva o problema ou solicitação. Todos os campos são obrigatórios.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input placeholder="Resumo do problema" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioridade</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a prioridade" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Baixa</SelectItem>
                        <SelectItem value="medium">Média</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                        <SelectItem value="critical">Crítica</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="assignee_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Destinatário (Usuário do Escritório)</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um destinatário" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {assignees.map((assignee) => (
                      <SelectItem key={assignee.id} value={assignee.id}>
                        {assignee.name} {assignee.department_name ? `(${assignee.department_name})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {field.value && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Setor: {assignees.find(a => a.id === field.value)?.department_name || 'N/A'}
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <div className="flex gap-2">
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        disabled={loadingCategories}
                      >
                        <FormControl>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder={loadingCategories ? "Carregando..." : "Selecione a categoria"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-[200px]">
                        {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.name}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="icon"
                        onClick={() => setShowNewCategoryInput(!showNewCategoryInput)}
                        title="Nova Categoria"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <FormMessage />
                    
                    {showNewCategoryInput && (
                      <div className="flex gap-2 mt-2 animate-in fade-in slide-in-from-top-1">
                        <Input 
                          placeholder="Nome da nova categoria" 
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          className="flex-1 h-8 text-sm"
                        />
                        <Button 
                          type="button" 
                          size="sm" 
                          onClick={handleCreateCategory}
                          disabled={!newCategoryName || creatingCategory}
                        >
                          {creatingCategory ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Incluir'}
                        </Button>
                      </div>
                    )}
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição Detalhada</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descreva o problema com detalhes..." 
                      className="min-h-[100px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>)}
              />

            <div className="space-y-2">
              <FormLabel>Anexos (Opcional)</FormLabel>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                  accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  <Paperclip className="mr-2 h-4 w-4" />
                  Anexar Arquivos
                </Button>
                <span className="text-xs text-muted-foreground">
                  Max 5 arquivos (5MB cada)
                </span>
              </div>

              {files.length > 0 && (
                <div className="space-y-2 mt-2">
                  {files.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded-md text-sm">
                      <span className="truncate max-w-[300px]">{file.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFile(index)}
                        className="h-6 w-6"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar Chamado
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
