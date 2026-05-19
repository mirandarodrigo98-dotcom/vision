import db from '@/lib/db';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getEmployeeHistory } from '@/app/actions/histories';
import { getUserPermissions } from '@/app/actions/permissions';
import { HistoryForm } from '@/components/histories/history-form';

export const dynamic = 'force-dynamic';

export default async function EditHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'client_user') redirect('/login');

  const permissions = await getUserPermissions();
  if (!permissions.includes('histories.create')) {
    redirect('/app/histories');
  }

  const { id } = await params;
  const history = await getEmployeeHistory(id);
  if (!history) {
    redirect('/app/histories');
  }

  const hasAccess = (await db.query(`
    SELECT 1 FROM user_companies WHERE user_id = $1 AND company_id = $2
  `, [session.user_id, history.company_id])).rows[0];

  if (!hasAccess && history.created_by_user_id !== session.user_id) {
    redirect('/app/histories');
  }

  if (history.status === 'CANCELLED' || history.status === 'COMPLETED') {
    redirect(`/app/histories/${id}/view`);
  }

  const companies = (await db.query(`
    SELECT cc.id, COALESCE(cc.razao_social, cc.nome) AS nome, cc.cnpj
    FROM client_companies cc
    JOIN user_companies uc ON uc.company_id = cc.id
    WHERE uc.user_id = $1
    ORDER BY COALESCE(cc.razao_social, cc.nome)
  `, [session.user_id])).rows as Array<{ id: string; nome: string; cnpj: string }>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-8">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Retificar Solicitação de Histórico</h1>
        <p className="text-muted-foreground">
          Ajuste as informações antes da conclusão pela equipe.
        </p>
      </div>

      <HistoryForm
        companies={companies}
        activeCompanyId={history.company_id}
        initialData={history}
        isEditing
        redirectPath="/app/histories"
      />
    </div>
  );
}
