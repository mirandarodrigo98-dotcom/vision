import db from '@/lib/db';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getUserPermissions } from '@/app/actions/permissions';
import { getSolicitation } from '@/app/actions/solicitations';
import { SolicitationForm } from '@/components/solicitations/solicitation-form';

export const dynamic = 'force-dynamic';

export default async function EditSolicitationPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'client_user') redirect('/login');

  const permissions = await getUserPermissions();
  if (!permissions.includes('solicitations.create')) {
    redirect('/app/solicitations');
  }

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

  if (solicitation.status === 'CANCELLED' || solicitation.status === 'COMPLETED') {
    redirect(`/app/solicitations/${id}/view`);
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
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Retificar Solicitacao</h1>
        <p className="text-muted-foreground">
          Ajuste os dados da solicitacao antes da conclusao pelo escritorio.
        </p>
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
        redirectPath="/app/solicitations"
      />
    </div>
  );
}
