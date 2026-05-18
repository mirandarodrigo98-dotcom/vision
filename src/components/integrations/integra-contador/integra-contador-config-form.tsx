'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import type { IntegraContadorConfig } from '@/app/actions/integrations/integra-contador';
import { saveIntegraContadorConfig } from '@/app/actions/integrations/integra-contador';

type Props = {
  initialConfig: IntegraContadorConfig | null;
};

function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

export function IntegraContadorConfigForm({ initialConfig }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isActive, setIsActive] = useState(initialConfig?.is_active ?? true);
  const [certificateName, setCertificateName] = useState(initialConfig?.certificate_filename || '');

  async function onSubmit(formData: FormData) {
    setIsSubmitting(true);
    try {
      formData.set('is_active', String(isActive));

      const result = await saveIntegraContadorConfig(formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success('Configuração do Integra Contador salva com sucesso!');
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error('Erro inesperado ao salvar a integração.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      ref={formRef}
      action={onSubmit}
      className="space-y-6"
    >
      <Card>
        <CardHeader>
          <CardTitle>Credenciais do Serpro</CardTitle>
          <CardDescription>
            Configure os dados de autenticação do Integra Contador para uso futuro em serviços do Serpro.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">
            Mantenha aqui apenas a configuracao do Integra Contador. A consulta cadastral de CPF agora possui uma
            integracao separada no menu de Integracoes.
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="base_url">URL base da API</Label>
              <Input
                id="base_url"
                name="base_url"
                defaultValue={initialConfig?.base_url || 'https://gateway.apiserpro.serpro.gov.br/integra-contador/v1'}
                placeholder="https://gateway.apiserpro.serpro.gov.br/integra-contador/v1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="auth_url">URL de autenticação</Label>
              <Input
                id="auth_url"
                name="auth_url"
                defaultValue={initialConfig?.auth_url || 'https://autenticacao.sapi.serpro.gov.br/authenticate'}
                placeholder="https://autenticacao.sapi.serpro.gov.br/authenticate"
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

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="contractor_document">CNPJ do Contratante</Label>
              <Input
                id="contractor_document"
                name="contractor_document"
                defaultValue={initialConfig?.contractor_document || ''}
                onChange={(e) => {
                  e.currentTarget.value = onlyDigits(e.currentTarget.value).slice(0, 14);
                }}
                placeholder="Somente números"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="author_document">Documento do Autor do Pedido</Label>
              <Input
                id="author_document"
                name="author_document"
                defaultValue={initialConfig?.author_document || ''}
                onChange={(e) => {
                  e.currentTarget.value = onlyDigits(e.currentTarget.value).slice(0, 14);
                }}
                placeholder="CPF ou CNPJ em números"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="author_type">Tipo do Autor</Label>
              <select
                id="author_type"
                name="author_type"
                defaultValue={String(initialConfig?.author_type || 2)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="1">CPF</option>
                <option value="2">CNPJ</option>
              </select>
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <h3 className="mb-4 text-base font-semibold">Certificado digital</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="certificate_file">Arquivo do certificado (.p12 ou .pfx)</Label>
                <Input
                  id="certificate_file"
                  name="certificate_file"
                  type="file"
                  accept=".p12,.pfx,application/x-pkcs12"
                  onChange={(e) => {
                    setCertificateName(e.target.files?.[0]?.name || initialConfig?.certificate_filename || '');
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  {certificateName ? `Arquivo atual: ${certificateName}` : 'Nenhum certificado enviado ainda.'}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="certificate_password">Senha do certificado</Label>
                <Input
                  id="certificate_password"
                  name="certificate_password"
                  type="password"
                  defaultValue={initialConfig?.certificate_password || ''}
                  placeholder="Senha do .p12/.pfx"
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <h3 className="mb-4 text-base font-semibold">Serviço de consulta de CPF</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Se voce ainda nao souber esses dados, deixe em branco apenas o ID do Sistema e o ID do Servico. A consulta
              externa de CPF so sera usada quando essa configuracao estiver completa.
            </p>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="cpf_service_path">Caminho</Label>
                <Input
                  id="cpf_service_path"
                  name="cpf_service_path"
                  defaultValue={initialConfig?.cpf_service_path || '/Consultar'}
                  placeholder="/Consultar"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cpf_service_system_id">ID do Sistema</Label>
                <Input
                  id="cpf_service_system_id"
                  name="cpf_service_system_id"
                  defaultValue={initialConfig?.cpf_service_system_id || ''}
                  placeholder="Ex: SISTEMA"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cpf_service_id">ID do Serviço</Label>
                <Input
                  id="cpf_service_id"
                  name="cpf_service_id"
                  defaultValue={initialConfig?.cpf_service_id || ''}
                  placeholder="Ex: SERVICO123"
                />
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
              <div className="space-y-2">
                <Label htmlFor="cpf_service_version">Versão do Serviço</Label>
                <Input
                  id="cpf_service_version"
                  name="cpf_service_version"
                  defaultValue={initialConfig?.cpf_service_version || '1.0'}
                  placeholder="1.0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cpf_service_dados_template">Template do campo `dados`</Label>
                <Textarea
                  id="cpf_service_dados_template"
                  name="cpf_service_dados_template"
                  defaultValue={initialConfig?.cpf_service_dados_template || '{"cpf":"{{cpfSemMascara}}"}'}
                  className="min-h-[96px]"
                  placeholder='{"cpf":"{{cpfSemMascara}}"}'
                />
                <p className="text-xs text-muted-foreground">
                  Use <code>{'{{cpf}}'}</code> ou <code>{'{{cpfSemMascara}}'}</code> como placeholder dentro do JSON
                  stringificado exigido pelo servico.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Integração ativa</p>
              <p className="text-sm text-muted-foreground">
                Mantem a configuracao do Integra Contador disponivel para uso futuro no Vision.
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
