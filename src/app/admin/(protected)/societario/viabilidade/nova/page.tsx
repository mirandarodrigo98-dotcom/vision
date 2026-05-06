import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getUserPermissions } from '@/app/actions/permissions';
import { ViabilidadeWizard } from '@/components/societario/viabilidade-wizard';

export const dynamic = 'force-dynamic';

export default async function NovaViabilidadePage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const permissions = await getUserPermissions();
  if (!permissions.includes('societario.view')) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <h1 className="text-2xl font-bold text-red-600">Acesso Negado</h1>
        <p className="text-gray-500">Você não tem permissão para acessar este módulo.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Nova Viabilidade</h1>
        <p className="text-muted-foreground mt-1">
          Assistente para criação de processo de Viabilidade
        </p>
      </div>

      <ViabilidadeWizard />
    </div>
  );
}
