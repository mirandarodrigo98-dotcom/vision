'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { OmieConfig, saveOmieConfig } from '@/app/actions/integrations/omie-config';

const formSchema = z.object({
  app_key: z.string().min(1, { message: 'O App Key é obrigatório' }),
  app_secret: z.string().min(1, { message: 'O App Secret é obrigatório' }),
  is_active: z.boolean().default(true),
});

export default function OmieConfigForm({ initialConfig, companyId = 1 }: { initialConfig?: OmieConfig, companyId?: number }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      app_key: initialConfig?.app_key || '',
      app_secret: initialConfig?.app_secret || '',
      is_active: initialConfig?.is_active ?? true,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      const response = await saveOmieConfig({
        app_key: values.app_key,
        app_secret: values.app_secret,
        is_active: values.is_active,
      }, companyId);

      if (response.error) {
        toast.error(response.error);
      } else {
        toast.success('Configurações salvas com sucesso!');
        router.refresh();
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar as configurações.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="app_key"
          render={({ field }) => (
            <FormItem>
              <FormLabel>App Key (Chave do Aplicativo)</FormLabel>
              <FormControl>
                <Input placeholder="Cole sua chave aqui..." {...field} />
              </FormControl>
              <FormDescription>Identificador único do aplicativo no Omie.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="app_secret"
          render={({ field }) => (
            <FormItem>
              <FormLabel>App Secret (Segredo do Aplicativo)</FormLabel>
              <FormControl>
                <Input type="password" placeholder="Cole seu segredo aqui..." {...field} />
              </FormControl>
              <FormDescription>Chave secreta para autenticação (mantenha em segurança).</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="is_active"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Integração Ativa</FormLabel>
                <FormDescription>
                  Ative ou desative temporariamente as consultas financeiras com o Omie.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </form>
    </Form>
  );
}
