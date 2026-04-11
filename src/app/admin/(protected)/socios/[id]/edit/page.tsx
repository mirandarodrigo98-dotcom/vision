import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { notFound, redirect } from 'next/navigation';
import { getUserPermissions } from '@/app/actions/permissions';
import { SocioForm } from '@/components/socios/socio-form';
import { getSocio } from '@/app/actions/socios';

export const dynamic = 'force-dynamic';

interface EditSocioPageProps {
  params: Promise<{ id: string }>;
}

async function getAllowed() {
  const session = await getSession();
  if (!session) return { allowed: false, companies: [] as any[] };
  const perms = await getUserPermissions();
  const canView =
    session.role === 'admin' ||
    session.role === 'operator' ||
    perms.includes('societario.view') || perms.includes('societario.edit');
  
  if (!canView) return { allowed: false, companies: [] as any[] };

  let companies = [];
  if (session.role === 'operator') {
    companies = (await db.query(`
      SELECT id, razao_social, cnpj, code, filial
      FROM client_companies
      WHERE is_active = 1
      AND id NOT IN (SELECT company_id FROM user_restricted_companies WHERE user_id = $1)
      ORDER BY razao_social ASC
    `, [session.user_id])).rows as any[];
  } else if (session.role === 'client_user') {
     companies = (await db.query(`
      SELECT id, razao_social, cnpj, code, filial
      FROM client_companies
      WHERE is_active = 1
      AND id IN (SELECT company_id FROM user_companies WHERE user_id = $1)
      ORDER BY razao_social ASC
    `, [session.user_id])).rows as any[];
  } else {
    // Admin
    companies = (await db.query(`
      SELECT id, razao_social, cnpj, code, filial
      FROM client_companies
      WHERE is_active = 1
      ORDER BY razao_social ASC
    `, [])).rows as any[];
  }

  return { allowed: true, companies };
}

export default async function EditSocioPage({ params }: EditSocioPageProps) {
  const { allowed, companies } = await getAllowed();
  if (!allowed) {
    redirect('/admin/dashboard');
  }

  const resolvedParams = await params;
  const socio = await getSocio(resolvedParams.id);

  if (!socio) {
    notFound();
  }

  return <SocioForm companies={companies} initialData={socio} />;
}
