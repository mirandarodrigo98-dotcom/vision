import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ReleaseNotesDialog } from '@/components/release-notes-dialog';

export const dynamic = 'force-dynamic';

import { ClientNav } from '@/components/client-nav';
import { ClientHeader } from '@/components/client-header';
import { getUserCompanies } from '@/app/actions/client-users';
import { getUserPermissions } from '@/app/actions/permissions';
import db from '@/lib/db';

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session || session.role !== 'client_user') {
    redirect('/login');
  }

  const companies = await getUserCompanies();
  const permissions = await getUserPermissions();

  let activeCompany = session.active_company_id 
    ? { id: session.active_company_id, name: session.company_name, cnpj: session.company_cnpj }
    : null;

  // Auto-select first company if none active
  if (!activeCompany && companies.length > 0) {
    const first = companies[0];
    await db.query(`UPDATE users SET active_company_id = $1 WHERE id = $2`, [first.id, session.user_id]);
    activeCompany = { id: first.id, name: first.razao_social, cnpj: first.cnpj };
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <ClientNav carneLeaoAccess={session.carne_leao_access} permissions={permissions} />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <ClientHeader 
          user={{ name: session.name, email: session.email, avatar_url: session.avatar_path }} 
          activeCompany={activeCompany}
          companies={companies}
        />
        <main className="flex-1 overflow-y-auto">
          <div className="p-8">
            {children}
          </div>
        </main>
      </div>
      <ReleaseNotesDialog />
    </div>
  );
}
