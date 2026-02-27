import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { notFound, redirect } from 'next/navigation';
import { getRolePermissions } from '@/app/actions/permissions';
import { SocioForm } from '@/components/socios/socio-form';
import { getSocio } from '@/app/actions/socios';

interface EditSocioPageProps {
  params: Promise<{ id: string }>;
}

async function getAllowed() {
  const session = await getSession();
  if (!session) return { allowed: false, companies: [] as any[] };
  const perms = await getRolePermissions(session.role);
  const canView =
    session.role === 'admin' ||
    perms.some((p) => p.permission === 'societario.view' || p.permission === 'societario.edit');
  
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
