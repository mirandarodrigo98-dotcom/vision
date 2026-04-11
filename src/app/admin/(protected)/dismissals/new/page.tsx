import { DismissalForm } from '@/components/dismissals/dismissal-form';
import { getSession } from '@/lib/auth';
import { getUserPermissions } from '@/app/actions/permissions';
import db from '@/lib/db';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AdminNewDismissalPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  let hasPermission = false;
  if (session.role === 'admin') hasPermission = true;
  else {
      const permissions = await getUserPermissions();
      hasPermission = permissions.includes('dismissals.create');
  }

  if (!hasPermission) {
      return <div>Você não tem permissão para criar rescisões.</div>;
  }

  // Get companies based on role
  let companies = [];
  if (session.role === 'admin') {
    companies = (await db.query(`
        SELECT id, nome, cnpj FROM client_companies ORDER BY nome
    `, [])).rows as Array<{ id: string; nome: string; cnpj: string }>;
  } else if (session.role === 'operator') {
    companies = (await db.query(`
        SELECT id, nome, cnpj 
        FROM client_companies 
        WHERE id NOT IN (SELECT company_id FROM user_restricted_companies WHERE user_id = $1)
        ORDER BY nome
    `, [session.user_id])).rows as Array<{ id: string; nome: string; cnpj: string }>;
  } else {
    // Should not happen for admin routes if properly guarded, but safe fallback
    companies = (await db.query(`
        SELECT c.id, c.nome, cnpj 
        FROM client_companies c 
        JOIN user_companies uc ON c.id = uc.company_id 
        WHERE uc.user_id = $1
        ORDER BY c.nome
    `, [session.user_id])).rows as Array<{ id: string; nome: string; cnpj: string }>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-8">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Nova Solicitação de Rescisão</h1>
        <p className="text-muted-foreground">
          Preencha os dados abaixo para iniciar o processo de desligamento.
        </p>
      </div>
      
      <DismissalForm companies={companies} />
    </div>
  );
}
