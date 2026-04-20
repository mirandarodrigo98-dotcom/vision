import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getUserPermissions } from '@/app/actions/permissions';
import { DashboardFinanceiro } from '@/components/financeiro/dashboard-financeiro';

export default async function DashboardConsultoriaPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const permissions = await getUserPermissions();
  if (!permissions.includes('financeiro.dashboard.consultoria')) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <h1 className="text-2xl font-bold text-red-600">Acesso Negado</h1>
        <p className="text-gray-500">Você não tem permissão para acessar este módulo.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Financeiro (Consultoria)</h1>
          <p className="text-muted-foreground mt-2">
            Visão consolidada das receitas e faturamento.
          </p>
        </div>
      </div>
      <DashboardFinanceiro defaultCompanyId="2" />
    </div>
  );
}