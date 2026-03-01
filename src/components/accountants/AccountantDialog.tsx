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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createAccountant, updateAccountant } from '@/app/actions/accountants';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';

const accountantSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Nome é obrigatório"),
  type: z.enum(['PF', 'PJ']),
  document: z.string().optional(),
  crc_number: z.string().optional(),
  crc_uf: z.string().optional(),
  crc_sequence: z.string().optional(),
  crc_date: z.date().optional().nullable(),
  qualification: z.string().optional(),
  zip_code: z.string().optional(),
  address: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  phone: z.string().optional(),
  fax: z.string().optional(),
  cellphone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
});

interface AccountantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountantToEdit?: any;
  onSuccess: () => void;
}

export function AccountantDialog({
  open,
  onOpenChange,
  accountantToEdit,
  onSuccess,
}: AccountantDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof accountantSchema>>({
    resolver: zodResolver(accountantSchema),
    defaultValues: {
      name: '',
      type: 'PF',
      document: '',
      crc_number: '',
      crc_uf: '',
      crc_sequence: '',
      qualification: 'CONTADOR',
      zip_code: '',
      address: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      phone: '',
      fax: '',
      cellphone: '',
      email: '',
    },
  });

  useEffect(() => {
    if (accountantToEdit) {
      form.reset({
        ...accountantToEdit,
        crc_date: accountantToEdit.crc_date ? new Date(accountantToEdit.crc_date) : undefined,
      });
    } else {
      form.reset({
        name: '',
        type: 'PF',
        document: '',
        crc_number: '',
        crc_uf: '',
        crc_sequence: '',
        qualification: 'CONTADOR',
        zip_code: '',
        address: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: '',
        phone: '',
        fax: '',
        cellphone: '',
        email: '',
      });
    }
  }, [accountantToEdit, form, open]);

  async function onSubmit(values: z.infer<typeof accountantSchema>) {
    setIsLoading(true);
    try {
      // Format date to YYYY-MM-DD string for API if present
      const formattedValues = {
        ...values,
        crc_date: values.crc_date ? values.crc_date.toISOString().split('T')[0] : undefined,
      };

      if (accountantToEdit) {
        await updateAccountant(accountantToEdit.id, formattedValues as any);
        toast.success('Contador atualizado com sucesso');
      } else {
        await createAccountant(formattedValues as any);
        toast.success('Contador criado com sucesso');
      }
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error('Erro ao salvar contador');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {accountantToEdit ? 'Editar Contador' : 'Novo Contador'}
          </DialogTitle>
          <DialogDescription>
            Preencha os dados do contador abaixo.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome completo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Inscrição</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PF">CPF</SelectItem>
                        <SelectItem value="PJ">CNPJ</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="document"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{form.watch('type') === 'PF' ? 'CPF' : 'CNPJ'}</FormLabel>
                    <FormControl>
                      <Input placeholder="Documento" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="qualification"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título Profissional</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="CONTADOR">Contador</SelectItem>
                        <SelectItem value="TECNICO">Técnico em Contabilidade</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="col-span-2 grid grid-cols-1 md:grid-cols-4 gap-4 border p-4 rounded-md">
                <h3 className="col-span-full font-semibold text-sm">Dados do CRC</h3>
                
                <FormField
                  control={form.control}
                  name="crc_number"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Número CRC</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: 1-RJ-123456/O-0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="crc_uf"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>UF CRC</FormLabel>
                      <FormControl>
                        <Input placeholder="RJ" maxLength={2} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="crc_sequence"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sequência</FormLabel>
                      <FormControl>
                        <Input placeholder="" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="crc_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data CRC</FormLabel>
                      <FormControl>
                        <DatePicker
                          date={field.value || undefined}
                          setDate={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="col-span-2 grid grid-cols-1 md:grid-cols-4 gap-4 border p-4 rounded-md">
                <h3 className="col-span-full font-semibold text-sm">Endereço</h3>

                <FormField
                  control={form.control}
                  name="zip_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CEP</FormLabel>
                      <FormControl>
                        <Input placeholder="00000-000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem className="col-span-3">
                      <FormLabel>Logradouro</FormLabel>
                      <FormControl>
                        <Input placeholder="Rua..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número</FormLabel>
                      <FormControl>
                        <Input placeholder="" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="complement"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Complemento</FormLabel>
                      <FormControl>
                        <Input placeholder="" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="neighborhood"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bairro</FormLabel>
                      <FormControl>
                        <Input placeholder="" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Município</FormLabel>
                      <FormControl>
                        <Input placeholder="" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado</FormLabel>
                      <FormControl>
                        <Input placeholder="RJ" maxLength={2} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="col-span-2 grid grid-cols-1 md:grid-cols-4 gap-4 border p-4 rounded-md">
                <h3 className="col-span-full font-semibold text-sm">Contato</h3>

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <Input placeholder="(00) 0000-0000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cellphone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Celular</FormLabel>
                      <FormControl>
                        <Input placeholder="(00) 90000-0000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fax"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fax</FormLabel>
                      <FormControl>
                        <Input placeholder="" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="email@exemplo.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
