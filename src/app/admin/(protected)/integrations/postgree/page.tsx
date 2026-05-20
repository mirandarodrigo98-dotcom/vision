import { redirect } from 'next/navigation';

import { getUserPermissions } from '@/app/actions/permissions';
import { getPostgreeConfig } from '@/app/actions/integrations/postgree';
import { getSession } from '@/lib/auth';
import { PostgreeConfigForm } from '@/components/integrations/postgree/postgree-config-form';

export default async function PostgreeIntegrationPage() {
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

  const config = await getPostgreeConfig();

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Integração Postgree</h1>
        <p className="mt-2 text-muted-foreground">
          Configure a conexão direta com o PostgreSQL interno para rotinas fiscais que precisam atualizar dados na base.
        </p>
      </div>

      <PostgreeConfigForm initialConfig={config} />
    </div>
  );
}
