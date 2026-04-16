import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getUserPermissions } from '@/app/actions/permissions';
import { getOmieConfig } from '@/app/actions/integrations/omie-config';
import OmieConfigForm from '@/components/admin/integrations/omie-config-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function OmieIntegrationPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const permissions = await getUserPermissions();
  if (!permissions.includes('integrations.view')) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <h1 className="text-2xl font-bold text-red-600">Acesso Negado</h1>
        <p className="text-gray-500">Você não tem permissão para acessar este módulo.</p>
      </div>
    );
  }

  const initialConfigContabilidade = await getOmieConfig(1);
  const initialConfigConsultoria = await getOmieConfig(2);

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Integração Omie ERP</h1>
        <p className="text-muted-foreground mt-2">
          Configure as credenciais de acesso para habilitar o módulo financeiro (Contas a Receber).
        </p>
      </div>

      <Tabs defaultValue="contabilidade" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="contabilidade">NZD Contabilidade</TabsTrigger>
          <TabsTrigger value="consultoria">NZD Consultoria</TabsTrigger>
        </TabsList>
        <TabsContent value="contabilidade">
          <Card>
            <CardHeader>
              <CardTitle>Credenciais da API - Contabilidade</CardTitle>
              <CardDescription>
                Insira o App Key e o App Secret do seu aplicativo Omie. Estas chaves podem ser encontradas no portal do desenvolvedor da Omie.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OmieConfigForm initialConfig={initialConfigContabilidade} companyId={1} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="consultoria">
          <Card>
            <CardHeader>
              <CardTitle>Credenciais da API - Consultoria</CardTitle>
              <CardDescription>
                Insira o App Key e o App Secret do seu aplicativo Omie. Estas chaves podem ser encontradas no portal do desenvolvedor da Omie.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OmieConfigForm initialConfig={initialConfigConsultoria} companyId={2} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
