import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getUserPermissions } from '@/app/actions/permissions';
import { getConsultaCpfConfig } from '@/app/actions/integrations/consulta-cpf';
import { ConsultaCpfConfigForm } from '@/components/integrations/consulta-cpf/consulta-cpf-config-form';

export default async function ConsultaCpfIntegrationPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const permissions = await getUserPermissions();
  if (!permissions.includes('integrations.view')) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center space-y-4">
        <h1 className="text-2xl font-bold text-red-600">Acesso Negado</h1>
        <p className="text-gray-500">Você não tem permissão para acessar este módulo.</p>
      </div>
    );
  }

  const config = await getConsultaCpfConfig();

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Integração Consulta CPF</h1>
        <p className="mt-2 text-muted-foreground">
          Configure a API específica de Consulta CPF do Serpro para uso no módulo societário.
        </p>
      </div>

      <ConsultaCpfConfigForm initialConfig={config} />
    </div>
  );
}
