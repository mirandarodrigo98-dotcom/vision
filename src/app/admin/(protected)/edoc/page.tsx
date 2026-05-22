import { redirect } from 'next/navigation';

import { getEDocCreateCatalog } from '@/app/actions/edoc';
import { getUserPermissions } from '@/app/actions/permissions';
import { getSession } from '@/lib/auth';
import { EDocModuleClient } from '@/components/edoc/edoc-module-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function EDocPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const permissions = await getUserPermissions();
  const isAdmin = session.role === 'admin';
  const canViewSent = isAdmin || permissions.includes('edoc.view') || permissions.includes('edoc.sent.view');
  const canViewReceived = isAdmin || permissions.includes('edoc.view') || permissions.includes('edoc.received.view');
  const canCreate = isAdmin || permissions.includes('edoc.view') || permissions.includes('edoc.create');

  if (!canViewSent && !canViewReceived && !canCreate) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center space-y-4">
        <h1 className="text-2xl font-bold text-red-600">Acesso Negado</h1>
        <p className="text-gray-500">Voce nao tem permissao para acessar este modulo.</p>
      </div>
    );
  }

  const catalog = await getEDocCreateCatalog();

  return (
    <EDocModuleClient
      catalog={catalog}
      canViewSent={canViewSent}
      canViewReceived={canViewReceived}
      canCreate={canCreate}
    />
  );
}
