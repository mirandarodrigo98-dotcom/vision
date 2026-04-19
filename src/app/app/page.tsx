import db from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getDashboardMetrics } from '@/app/actions/dashboard';
import { HRMetricsSection } from '@/components/dashboard/hr-metrics-section';
import { getUserPermissions } from '@/app/actions/permissions';

export default async function ClientDashboard() {
  const session = await getSession();
  if (!session) redirect('/login');

  if (session.role === 'admin' || session.role === 'operator') {
    redirect('/admin/dashboard');
  }

  const permissions = await getUserPermissions();
  
  if (!permissions.includes('client_dashboard.view')) {
      return (
          <div className="p-8 flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
              <h2 className="text-2xl font-bold text-slate-800">Bem-vindo(a) ao VISION Client!</h2>
              <p className="text-muted-foreground max-w-md">
                  Utilize o menu lateral para navegar pelos módulos que estão disponíveis para o seu usuário.
              </p>
          </div>
      );
  }

  // Get User Companies to check access
  const companies = (await db.query(`
    SELECT 1
    FROM user_companies uc
    WHERE uc.user_id = $1
    LIMIT 1
  `, [session.user_id])).rows[0];

  if (!companies) {
      return (
        <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4">
            <h2 className="text-xl font-semibold text-gray-700">Bem-vindo ao Vision</h2>
            <p className="text-gray-500">Você ainda não está vinculado a nenhuma empresa.</p>
            <p className="text-sm text-gray-400">Entre em contato com o suporte para liberar seu acesso.</p>
        </div>
      );
  }

  const metrics = await getDashboardMetrics();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Painel Geral</h1>
      </div>

      <HRMetricsSection metrics={metrics} />
    </div>
  );
}
