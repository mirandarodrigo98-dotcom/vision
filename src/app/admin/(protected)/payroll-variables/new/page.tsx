import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { redirect } from 'next/navigation';
import { PayrollVariablesForm } from '@/components/payroll-variables/payroll-variables-form';
import { getUserPermissions } from '@/app/actions/permissions';

export default async function AdminNewPayrollVariablesPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const isAdmin = session.role === 'admin' || session.role === 'operator';

  if (!isAdmin) {
    redirect('/app');
  }

  const permissions = await getUserPermissions();
  if (!permissions.includes('payroll_variables.create')) {
    redirect('/admin/payroll-variables');
  }

  const companyId = session.active_company_id;

  if (!companyId) {
    return <div className="p-8 text-center text-muted-foreground">Selecione uma empresa no topo para lançar as variáveis.</div>;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-8 px-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Lançar Variáveis da Folha</h1>
        <p className="text-muted-foreground mt-1">
          Informe os valores para a folha de pagamento do cliente.
        </p>
      </div>

      <PayrollVariablesForm companyId={companyId} isAdmin={true} />
    </div>
  );
}