import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { redirect } from 'next/navigation';

import { getUserPermissions } from '@/app/actions/permissions';
import { ApuracaoIcmsManager } from '@/components/fiscal/apuracao-icms/apuracao-icms-manager';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ApuracaoIcmsPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const permissions = await getUserPermissions();
  if (session.role !== 'admin' && !permissions.includes('fiscal.view')) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center space-y-4">
        <h1 className="text-2xl font-bold text-red-600">Acesso Negado</h1>
        <p className="text-gray-500">Voce nao tem permissao para acessar este modulo.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6 lg:p-8">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/admin/fiscal" className="text-slate-500 transition-colors hover:text-slate-800">
          <ChevronLeft className="h-6 w-6" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Modulo Fiscal</h1>
          <p className="text-sm text-slate-500">Apuracao e conferencias tributarias</p>
        </div>
      </div>

      <ApuracaoIcmsManager />
    </div>
  );
}
