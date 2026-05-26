'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, Save, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { saveQuestorZenConfig, QuestorZenConfig } from '@/app/actions/integrations/questor-zen';
import { waitForBrowserPaint } from '@/lib/client-feedback';

const questorZenConfigSchema = z.object({
  base_url: z.string().url('O domínio do cliente deve ser uma URL válida').min(1, 'O domínio do cliente é obrigatório'),
  api_token: z.string().min(1, 'O token de acesso é obrigatório'),
});

type FormData = z.infer<typeof questorZenConfigSchema>;

interface QuestorZenManagerProps {
  initialConfig: QuestorZenConfig | null;
}

export function QuestorZenManager({ initialConfig }: QuestorZenManagerProps) {
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(questorZenConfigSchema),
    defaultValues: {
      base_url: initialConfig?.base_url || 'https://nzdcontabilidade.app.questorpublico.com.br/',
      api_token: initialConfig?.api_token || '',
    },
  });

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    await waitForBrowserPaint();
    try {
      const result = await saveQuestorZenConfig(data);
      
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Configurações do Questor Zen salvas com sucesso!');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-orange-500" />
            Configuração de Acesso (API Questor Zen)
          </CardTitle>
          <CardDescription>
            Credenciais para integração com o Q-Drive, Q-Net (Documentos Recebidos), e portal do cliente Zen.
            <br/>
            Esses dados podem ser encontrados no Zen em: "Minha Conta" &gt; "Chave Acesso".
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-2xl">
            <div className="space-y-2">
              <Label htmlFor="base_url">Domínio do Cliente</Label>
              <Input
                id="base_url"
                placeholder="https://suaempresa.app.questorpublico.com.br"
                {...register('base_url')}
              />
              {errors.base_url && (
                <p className="text-sm text-red-500">{errors.base_url.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="api_token">Token de Acesso</Label>
              <Input
                id="api_token"
                type="password"
                placeholder="d8e725c9da835d85e1f980575c2a9629..."
                {...register('api_token')}
              />
              {errors.api_token && (
                <p className="text-sm text-red-500">{errors.api_token.message}</p>
              )}
            </div>

            <div className="pt-4 flex justify-end">
              <Button type="submit" disabled={saving} className="bg-orange-500 hover:bg-orange-600 text-white">
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Configurações
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
