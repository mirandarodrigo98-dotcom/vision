import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { VacationForm } from '@/components/vacations/vacation-form';
import { getVacation } from '@/app/actions/vacations';
import { getRolePermissions } from '@/app/actions/permissions';

export default async function EditVacationPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session) redirect('/login');

    const { id } = await params;

    const vacation = await getVacation(id);

    if (!vacation) {
        return <div>Férias não encontradas ou você não tem permissão.</div>;
    }

    // Permission Check
    let hasPermission = false;
    if (session.role === 'admin') hasPermission = true;
    else {
        const permissions = await getRolePermissions(session.role);
        // Assuming edit permission uses 'vacations.create' or specific logic
        hasPermission = permissions.includes('vacations.create');
    }

    if (!hasPermission) {
        return <div>Você não tem permissão para editar férias.</div>;
    }

    // Check if can be edited
    if (vacation.status === 'CANCELLED' || vacation.status === 'COMPLETED') {
         return <div>Esta solicitação já foi finalizada ou cancelada e não pode ser editada.</div>;
    }

    let companies = [];
    if (session.role === 'admin' || session.role === 'operator') {
      companies = await db.prepare(`
          SELECT id, nome, cnpj FROM client_companies ORDER BY nome
      `).all() as Array<{ id: string; nome: string; cnpj: string }>;
    } else {
      companies = await db.prepare(`
          SELECT c.id, c.nome, c.cnpj 
          FROM client_companies c 
          JOIN user_companies uc ON c.id = uc.company_id 
          WHERE uc.user_id = ?
          ORDER BY c.nome
      `).all(session.user_id) as Array<{ id: string; nome: string; cnpj: string }>;
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto py-8">
            <h1 className="text-3xl font-bold tracking-tight">Editar Solicitação de Férias</h1>
            <VacationForm companies={companies} initialData={vacation} isEditing={true} />
        </div>
    );
}
