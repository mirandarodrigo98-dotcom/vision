'use client';

import { useState } from 'react';
import { Database, PlugZap, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import {
  savePostgreeConfig,
  testPostgreeConnection,
} from '@/app/actions/integrations/postgree';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { PostgreeConfig } from '@/types/postgree';

type Props = {
  initialConfig: PostgreeConfig | null;
};

export function PostgreeConfigForm({ initialConfig }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isActive, setIsActive] = useState(initialConfig?.is_active ?? true);
  const [sslEnabled, setSslEnabled] = useState(initialConfig?.ssl_enabled ?? false);

  async function onSubmit(formData: FormData) {
    setIsSubmitting(true);
    try {
      formData.set('is_active', String(isActive));
      formData.set('ssl_enabled', String(sslEnabled));

      const result = await savePostgreeConfig(formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success('Configuração do Postgree salva com sucesso!');
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error('Erro inesperado ao salvar a integração.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleTestConnection() {
    setIsTesting(true);
    try {
      const result = await testPostgreeConnection();
      if (!result.success) {
        toast.error(result.error || 'Falha ao testar a conexão Postgree.');
        return;
      }

      toast.success(
        `Conectado ao banco ${result.data?.database_name || ''} com usuário ${result.data?.username || ''}.`,
      );
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error('Erro inesperado ao testar a conexão.');
    } finally {
      setIsTesting(false);
    }
  }

  return (
    <form action={onSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-indigo-600" />
            Parâmetros do Postgree
          </CardTitle>
          <CardDescription>
            Configure a conexão direta com o banco interno que será usado pela rotina de Apuração ICMS.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            O Vision na Vercel só vai conseguir usar esse banco se o servidor interno estiver acessível a partir da internet
            de forma segura, por túnel/VPN/proxy ou por uma porta liberada especificamente para essa conexão.
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="host">Host ou IP do servidor</Label>
              <Input
                id="host"
                name="host"
                defaultValue={initialConfig?.host || ''}
                placeholder="Ex: 10.0.0.15 ou db.empresa.com.br"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="port">Porta</Label>
              <Input
                id="port"
                name="port"
                defaultValue={String(initialConfig?.port || 5432)}
                placeholder="5432"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="database_name">Nome do banco</Label>
              <Input
                id="database_name"
                name="database_name"
                defaultValue={initialConfig?.database_name || ''}
                placeholder="Nome do banco"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="schema_name">Schema</Label>
              <Input
                id="schema_name"
                name="schema_name"
                defaultValue={initialConfig?.schema_name || 'public'}
                placeholder="public"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="username">Usuário</Label>
              <Input
                id="username"
                name="username"
                defaultValue={initialConfig?.username || ''}
                placeholder="Usuário do banco"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                name="password"
                type="password"
                defaultValue={initialConfig?.password || ''}
                placeholder="Senha do banco"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">Conexão ativa</p>
                <p className="text-sm text-muted-foreground">
                  Quando ativa, a Apuração ICMS passa a usar esta conexão direta.
                </p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">Usar SSL</p>
                <p className="text-sm text-muted-foreground">
                  Habilite se o servidor PostgreSQL exigir conexão segura.
                </p>
              </div>
              <Switch checked={sslEnabled} onCheckedChange={setSslEnabled} />
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <p className="font-medium">Informações mínimas necessárias</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Para a integração funcionar em produção, preciso de host/IP, porta, nome do banco, usuário, senha e da confirmação
              de que a Vercel consegue alcançar esse servidor interno.
            </p>
          </div>

          <div className="flex flex-wrap justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleTestConnection}
              disabled={isTesting}
            >
              <PlugZap className="mr-2 h-4 w-4" />
              {isTesting ? 'Testando...' : 'Testar Conexão'}
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 text-white hover:bg-indigo-700">
              <Save className="mr-2 h-4 w-4" />
              {isSubmitting ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
