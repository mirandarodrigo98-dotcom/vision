'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { saveQuestorZenConfig } from '@/app/actions/integrations/questor-zen';

const configSchema = z.object({
  base_url: z.string().url('URL inválida. Ex: https://app.questorzen.com.br'),
  api_token: z.string().min(10, 'Token inválido (muito curto)'),
});

interface QuestorZenManagerProps {
  initialConfig?: {
    base_url: string;
    api_token: string | null;
  };
}

export function QuestorZenManager({ initialConfig }: QuestorZenManagerProps) {
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<z.infer<typeof configSchema>>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      base_url: initialConfig?.base_url || 'https://app.questorzen.com.br',
      api_token: initialConfig?.api_token || '',
    },
  });

  async function onSubmit(data: z.infer<typeof configSchema>) {
    setIsSaving(true);
    try {
      const result = await saveQuestorZenConfig({
        base_url: data.base_url,
        api_token: data.api_token,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success('Configurações do Questor Zen salvas com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar configurações.');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuração Questor Zen</CardTitle>
        <CardDescription>
          Integração com a API do Questor Zen (Gerenciador de Empresas) para importação de cadastros.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="base_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL Base do Zen</FormLabel>
                  <FormControl>
                    <Input placeholder="https://app.questorzen.com.br" {...field} />
                  </FormControl>
                  <FormDescription>
                    Endereço de acesso à API do Questor Zen.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="api_token"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Token de API (Zen)</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Cole o token aqui..." {...field} />
                  </FormControl>
                  <FormDescription>
                    Token gerado no painel do Questor Zen.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Configurações
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
