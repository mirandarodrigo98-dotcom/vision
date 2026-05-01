import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { PayrollVariablesForm } from '@/components/payroll-variables/payroll-variables-form';
import { getUserPermissions } from '@/app/actions/permissions';

export default async function NewPayrollVariablesPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const permissions = await getUserPermissions();
  if (!permissions.includes('payroll_variables.create')) {
    redirect('/app/payroll-variables');
  }

  const companyId = session.active_company_id;

  if (!companyId) {
    return <div className="p-8 text-center text-muted-foreground">Selecione uma empresa para lançar as variáveis.</div>;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-8 px-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Nova Rotina de Variáveis</h1>
        <p className="text-muted-foreground mt-1">
          Selecione os eventos e informe os valores para a folha de pagamento.
        </p>
      </div>

      <PayrollVariablesForm companyId={companyId} isAdmin={false} />
    </div>
  );
}