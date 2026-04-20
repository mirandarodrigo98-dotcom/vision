import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getUserPermissions } from '@/app/actions/permissions';
import { DashboardFinanceiro } from '@/components/financeiro/dashboard-financeiro';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard Financeiro | Vision',
  description: 'Dashboard com indicadores financeiros integrados ao Omie'
};

export default async function DashboardFinanceiroPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const permissions = await getUserPermissions();
  if (!permissions.includes('financeiro.dashboard.contabilidade')) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <h1 className="text-2xl font-bold text-red-600">Acesso Negado</h1>
        <p className="text-gray-500">Você não tem permissão para acessar este módulo.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard Financeiro (Contabilidade)</h1>
          <p className="text-muted-foreground">Visão geral de receitas e indicadores extraídos do Omie.</p>
        </div>
      </div>
      <DashboardFinanceiro defaultCompanyId="1" />
    </div>
  );
}
