import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { VTForm } from '../vt-form';
import { getUserPermissions } from '@/app/actions/permissions';

export const dynamic = 'force-dynamic';

export default async function NewVTPage() {
    const session = await getSession();
    if (!session || session.role !== 'client_user') redirect('/login');

    const permissions = await getUserPermissions();
    if (!permissions.includes('vt.create')) redirect('/app/vt');

    const companyId = session.active_company_id;
    if (!companyId) redirect('/app/vt');

    const employees = (await db.query(`
        SELECT id, codigo, nome, cpf
        FROM employees
        WHERE company_id = $1 AND is_active = 1
        ORDER BY nome ASC
    `, [companyId])).rows as any[];

    return <VTForm employees={employees} companyId={companyId} />;
}