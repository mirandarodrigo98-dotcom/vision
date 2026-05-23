import { redirect } from 'next/navigation';

import { getEDocReceivedCategories } from '@/app/actions/edoc';
import { getUserPermissions } from '@/app/actions/permissions';
import { EDocReceivedManager } from '@/components/edoc/edoc-received-manager';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function EDocReceivedPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const permissions = await getUserPermissions();
  const canView = session.role === 'admin' || permissions.includes('edoc.view') || permissions.includes('edoc.received.view');

  if (!canView) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center space-y-4">
        <h1 className="text-2xl font-bold text-red-600">Acesso Negado</h1>
        <p className="text-gray-500">Voce nao tem permissao para acessar os documentos recebidos.</p>
      </div>
    );
  }

  const categories = await getEDocReceivedCategories();

  return <EDocReceivedManager initialCategories={categories} />;
}
