import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getUserPermissions } from '@/app/actions/permissions';
import { CobrancaClient } from './client';

export default async function CobrancaPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const permissions = await getUserPermissions();
  const isAdmin = session.role === 'admin';
  if (!isAdmin && !permissions.includes('financeiro.cobranca.consultoria.view')) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <h1 className="text-2xl font-bold text-red-600">Acesso Negado</h1>
        <p className="text-gray-500">Você não tem permissão para acessar este módulo.</p>
      </div>
    );
  }

  return <CobrancaClient permissions={permissions} isAdminRole={isAdmin} />;
}