import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { redirect } from 'next/navigation';
import { getRolePermissions } from '@/app/actions/permissions';
import { SocioForm } from '@/components/socios/socio-form';

async function getAllowed() {
  const session = await getSession();
  if (!session) return { allowed: false, companies: [] as any[] };
  const perms = await getRolePermissions(session.role);
  const canView =
    session.role === 'admin' ||
    perms.includes('societario.view') || perms.includes('societario.edit');
  if (!canView) return { allowed: false, companies: [] as any[] };

  const companies = await db
    .prepare(
      `
      SELECT id, razao_social, cnpj, code, filial
      FROM client_companies
      WHERE is_active = 1
      ORDER BY razao_social ASC
    `
    )
    .all();

  return { allowed: true, companies };
}

export default async function SociosNewPage() {
  const { allowed, companies } = await getAllowed();
  if (!allowed) {
    redirect('/admin/dashboard');
  }
  return <SocioForm companies={companies} />;
}
