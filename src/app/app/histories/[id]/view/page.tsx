import db from '@/lib/db';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getEmployeeHistory } from '@/app/actions/histories';
import { HistoryActions } from '@/components/histories/history-actions';
import { HistoryForm } from '@/components/histories/history-form';

export const dynamic = 'force-dynamic';

export default async function ViewHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'client_user') redirect('/login');

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

  const companies = (await db.query(`
    SELECT cc.id, COALESCE(cc.razao_social, cc.nome) AS nome, cc.cnpj
    FROM client_companies cc
    JOIN user_companies uc ON uc.company_id = cc.id
    WHERE uc.user_id = $1
    ORDER BY COALESCE(cc.razao_social, cc.nome)
  `, [session.user_id])).rows as Array<{ id: string; nome: string; cnpj: string }>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-8">
      <div className="flex justify-between items-start gap-4">
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Visualizar Solicitação de Histórico</h1>
          <p className="text-muted-foreground">
            Confira os detalhes da solicitação enviada ao departamento pessoal.
          </p>
        </div>

        <HistoryActions
          historyId={history.id}
          status={history.status}
          employeeName={history.employee_name}
        />
      </div>

      <HistoryForm
        companies={companies}
        activeCompanyId={history.company_id}
        initialData={history}
        isEditing
        readOnly
        redirectPath="/app/histories"
      />
    </div>
  );
}
