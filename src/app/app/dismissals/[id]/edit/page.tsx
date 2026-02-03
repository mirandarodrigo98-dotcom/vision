import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DismissalForm } from '@/components/dismissals/dismissal-form';
import { getDismissal } from '@/app/actions/dismissals';

export default async function ClientEditDismissalPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || session.role !== 'client_user') redirect('/login');

    const { id } = await params;

    const dismissal = await getDismissal(id);

    if (!dismissal) {
        return <div>Rescisão não encontrada ou você não tem permissão.</div>;
    }

    // Check if can be edited
    if (dismissal.status === 'CANCELLED' || dismissal.status === 'COMPLETED') {
         return <div>Esta solicitação já foi finalizada ou cancelada e não pode ser editada.</div>;
    }

    const companies = await db.prepare(`
        SELECT c.id, c.nome, c.cnpj 
        FROM client_companies c 
        JOIN user_companies uc ON c.id = uc.company_id 
        WHERE uc.user_id = ?
        ORDER BY c.nome
    `).all(session.user_id) as Array<{ id: string; nome: string; cnpj: string }>;

    return (
        <div className="space-y-6 max-w-4xl mx-auto py-8">
            <h1 className="text-3xl font-bold tracking-tight">Retificar Solicitação de Rescisão</h1>
            <DismissalForm companies={companies} initialData={dismissal} isEditing={true} redirectPath="/app/dismissals" />
        </div>
    );
}
