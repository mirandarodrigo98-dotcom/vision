import db from '@/lib/db';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getSolicitation } from '@/app/actions/solicitations';
import { SolicitationActions } from '@/components/solicitations/solicitation-actions';
import { SolicitationForm } from '@/components/solicitations/solicitation-form';

export const dynamic = 'force-dynamic';

export default async function ViewSolicitationPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'client_user') redirect('/login');

  const { id } = await params;
  const solicitation = await getSolicitation(id);
  if (!solicitation) {
    redirect('/app/solicitations');
  }

  const hasAccess = (await db.query(`
    SELECT 1 FROM user_companies WHERE user_id = $1 AND company_id = $2
  `, [session.user_id, solicitation.company_id])).rows[0];

  if (!hasAccess && solicitation.created_by_user_id !== session.user_id) {
    redirect('/app/solicitations');
  }

  const companies = (await db.query(`
    SELECT cc.id, COALESCE(cc.razao_social, cc.nome) AS nome, cc.cnpj
    FROM client_companies cc
    JOIN user_companies uc ON uc.company_id = cc.id
    WHERE uc.user_id = $1
    ORDER BY COALESCE(cc.razao_social, cc.nome)
  `, [session.user_id])).rows as Array<{ id: string; nome: string; cnpj: string }>;

  return (
    <div className="mx-auto max-w-4xl space-y-6 py-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Visualizar Solicitacao</h1>
          <p className="text-muted-foreground">
            Confira os detalhes da solicitacao enviada ao escritorio.
          </p>
        </div>

        <SolicitationActions
          solicitationId={solicitation.id}
          status={solicitation.status}
          subject={solicitation.subject}
        />
      </div>

      <SolicitationForm
        companies={companies}
        activeCompanyId={solicitation.company_id}
        requestType={{
          id: solicitation.request_type_id,
          name: solicitation.request_type_name,
          description: solicitation.request_type_description,
          department_name: solicitation.department_name,
        }}
        initialData={solicitation}
        isEditing
        readOnly
        redirectPath="/app/solicitations"
      />
    </div>
  );
}
