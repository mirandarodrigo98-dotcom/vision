import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getUserPermissions } from '@/app/actions/permissions';
import { getDepartments } from '@/app/actions/departments';
import { getSolicitationTypes } from '@/app/actions/solicitation-types';
import { SolicitationTypeList } from './solicitation-type-list';

export default async function SolicitationTypesPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const permissions = await getUserPermissions();
  const canView = session.role === 'admin' || permissions.includes('solicitation_types.view');

  if (!canView) {
    redirect('/admin/cadastro');
  }

  const [{ data: requestTypes, error }, { data: departments, error: departmentsError }] = await Promise.all([
    getSolicitationTypes(),
    getDepartments(),
  ]);

  if (error) {
    return <div className="p-6 text-red-500">Erro ao carregar tipos de solicitacao: {error}</div>;
  }

  if (departmentsError) {
    return <div className="p-6 text-red-500">Erro ao carregar departamentos: {departmentsError}</div>;
  }

  return (
    <div className="space-y-6">
      <SolicitationTypeList
        solicitationTypes={requestTypes || []}
        departments={departments || []}
      />
    </div>
  );
}
