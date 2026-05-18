import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getUserPermissions } from '@/app/actions/permissions';
import { getIntegraContadorConfig } from '@/app/actions/integrations/integra-contador';
import { IntegraContadorConfigForm } from '@/components/integrations/integra-contador/integra-contador-config-form';

export default async function IntegraContadorIntegrationPage() {
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

  const config = await getIntegraContadorConfig();

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Integração Integra Contador</h1>
        <p className="mt-2 text-muted-foreground">
          Configure as credenciais do Integra Contador para uso futuro em serviços contábeis e fiscais do Serpro.
        </p>
      </div>

      <IntegraContadorConfigForm initialConfig={config} />
    </div>
  );
}
