'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import { saveConsultaCpfConfig, type ConsultaCpfConfig } from '@/app/actions/integrations/consulta-cpf';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

type Props = {
  initialConfig: ConsultaCpfConfig | null;
};

export function ConsultaCpfConfigForm({ initialConfig }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isActive, setIsActive] = useState(initialConfig?.is_active ?? true);

  async function onSubmit(formData: FormData) {
    setIsSubmitting(true);
    try {
      formData.set('is_active', String(isActive));

      const result = await saveConsultaCpfConfig(formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success('Configuração da Consulta CPF salva com sucesso!');
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error('Erro inesperado ao salvar a integração.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form action={onSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Credenciais da API Consulta CPF</CardTitle>
          <CardDescription>
            Configure a integração específica de consulta cadastral de CPF do Serpro. Essa configuração é separada do
            Integra Contador.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">
            Preencha as chaves da API Consulta CPF disponibilizadas pelo Serpro. O módulo societário passa a usar esta
            integração antes da base interna do Vision.
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="base_url">URL base da API</Label>
              <Input
                id="base_url"
                name="base_url"
                defaultValue={initialConfig?.base_url || 'https://gateway.apiserpro.serpro.gov.br/consulta-cpf-df/v2'}
                placeholder="https://gateway.apiserpro.serpro.gov.br/consulta-cpf-df/v2"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="auth_url">URL de autenticação</Label>
              <Input
                id="auth_url"
                name="auth_url"
                defaultValue={initialConfig?.auth_url || 'https://gateway.apiserpro.serpro.gov.br/token'}
                placeholder="https://gateway.apiserpro.serpro.gov.br/token"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="consumer_key">Consumer Key</Label>
              <Input
                id="consumer_key"
                name="consumer_key"
                defaultValue={initialConfig?.consumer_key || ''}
                placeholder="Consumer Key"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="consumer_secret">Consumer Secret</Label>
              <Input
                id="consumer_secret"
                name="consumer_secret"
                type="password"
                defaultValue={initialConfig?.consumer_secret || ''}
                placeholder="Consumer Secret"
              />
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <p className="font-medium">Como essa integração funciona</p>
            <p className="mt-1 text-sm text-muted-foreground">
              O Vision autentica no endpoint OAuth do Serpro e consulta o CPF no endpoint <code>/cpf/{"{ni}"}</code>,
              retornando o nome cadastral quando disponível.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Conforme a documentacao atual de producao, o endpoint principal e <code>https://gateway.apiserpro.serpro.gov.br/consulta-cpf-df/v2</code>.
              Como a Serpro apresenta variacoes entre versoes e ambientes, o Vision tambem tenta caminhos compativeis de `v1`, `v2` e trial automaticamente.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Integração ativa</p>
              <p className="text-sm text-muted-foreground">
                Quando ativa, a busca de CPF do societário prioriza esta integração do Serpro.
              </p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting} className="bg-orange-500 text-white hover:bg-orange-600">
              <Save className="mr-2 h-4 w-4" />
              {isSubmitting ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
