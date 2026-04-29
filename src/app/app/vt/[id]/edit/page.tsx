import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { VTForm } from '../../vt-form';
import { getUserPermissions } from '@/app/actions/permissions';
import { getTransportVoucherById } from '@/app/actions/transport-vouchers';

export const dynamic = 'force-dynamic';

export default async function EditVTPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    const session = await getSession();
    if (!session || session.role !== 'client_user') redirect('/login');

    const permissions = await getUserPermissions();
    if (!permissions.includes('vt.create')) redirect('/app/vt');

    const vt = await getTransportVoucherById(resolvedParams.id);
    if (!vt || vt.status !== 'DRAFT') redirect('/app/vt');

    const companyId = vt.company_id;
    if (companyId !== session.active_company_id) redirect('/app/vt');

    const employees = (await db.query(`
        SELECT id, codigo, nome, cpf
        FROM employees
        WHERE company_id = $1 AND is_active = 1
        ORDER BY nome ASC
    `, [companyId])).rows as any[];

    return <VTForm initialData={vt} employees={employees} companyId={companyId} />;
}