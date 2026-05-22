import { redirect } from 'next/navigation';

import { getEDocCreateCatalog } from '@/app/actions/edoc';
import { getUserPermissions } from '@/app/actions/permissions';
import { EDocCreateForm } from '@/components/edoc/edoc-create-form';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type EDocCreatePageProps = {
  searchParams: Promise<{
    categoryId?: string;
  }>;
};

export default async function EDocCreatePage({ searchParams }: EDocCreatePageProps) {
  const session = await getSession();
  if (!session) redirect('/login');

  const permissions = await getUserPermissions();
  const canView = session.role === 'admin' || permissions.includes('edoc.view') || permissions.includes('edoc.create');

  if (!canView) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center space-y-4">
        <h1 className="text-2xl font-bold text-red-600">Acesso Negado</h1>
        <p className="text-gray-500">Voce nao tem permissao para acessar o cadastro de documentos.</p>
      </div>
    );
  }

  const params = await searchParams;
  const catalog = await getEDocCreateCatalog();

  return <EDocCreateForm catalog={catalog} selectedCategoryId={params.categoryId} />;
}
