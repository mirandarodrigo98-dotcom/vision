import { DismissalForm } from '@/components/dismissals/dismissal-form';
import { getSession } from '@/lib/auth';
import { getRolePermissions } from '@/app/actions/permissions';
import db from '@/lib/db';
import { redirect } from 'next/navigation';

export default async function AdminNewDismissalPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  let hasPermission = false;
  if (session.role === 'admin') hasPermission = true;
  else {
      const permissions = await getRolePermissions(session.role);
      hasPermission = permissions.includes('dismissals.create');
  }

  if (!hasPermission) {
      return <div>Você não tem permissão para criar rescisões.</div>;
  }

  // Get companies based on role
  let companies = [];
  if (session.role === 'admin' || session.role === 'operator') {
    companies = await db.prepare(`
        SELECT id, nome, cnpj FROM client_companies ORDER BY nome
    `).all() as Array<{ id: string; nome: string; cnpj: string }>;
  } else {
    // Should not happen for admin routes if properly guarded, but safe fallback
    companies = await db.prepare(`
        SELECT c.id, c.nome, cnpj 
        FROM client_companies c 
        JOIN user_companies uc ON c.id = uc.company_id 
        WHERE uc.user_id = ?
        ORDER BY c.nome
    `).all(session.user_id) as Array<{ id: string; nome: string; cnpj: string }>;
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
