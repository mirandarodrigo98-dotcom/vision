import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { notFound, redirect } from 'next/navigation';
import { getDismissal } from '@/app/actions/dismissals';
import { DismissalForm } from '@/components/dismissals/dismissal-form';
import { getUserPermissions } from '@/app/actions/permissions';

export const dynamic = 'force-dynamic';

export default async function AdminEditDismissalPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session) redirect('/login');

    const { id } = await params;

    const dismissal = await getDismissal(id);

    if (!dismissal) {
        return <div>Rescisão não encontrada ou você não tem permissão.</div>;
    }

    // Permission Check
    let hasPermission = false;
    if (session.role === 'admin') hasPermission = true;
    else {
        const permissions = await getUserPermissions();
        hasPermission = permissions.includes('dismissals.create');
    }

    if (!hasPermission) {
        return <div>Você não tem permissão para editar rescisões.</div>;
    }

    // Check if can be edited
    if (dismissal.status === 'CANCELLED' || dismissal.status === 'COMPLETED') {
         return <div>Esta solicitação já foi finalizada ou cancelada e não pode ser editada.</div>;
    }

    if (session.role !== 'admin') {
        const cleanDismissalDate = String(dismissal.dismissal_date || '').trim().split('T')[0];
        const dismissalDate = /^\d{4}-\d{2}-\d{2}$/.test(cleanDismissalDate)
            ? new Date(...cleanDismissalDate.split('-').map((part, index) => index === 1 ? Number(part) - 1 : Number(part)) as [number, number, number])
            : new Date(dismissal.dismissal_date);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        dismissalDate.setHours(0, 0, 0, 0);

        if (now > dismissalDate) {
            return (
                <div className="p-8 text-center">
                    <h1 className="text-2xl font-bold text-red-600">Prazo Expirado</h1>
                    <p className="mt-4">O prazo para retificação desta rescisão expirou (até a data do desligamento).</p>
                    <a href="/admin/dismissals" className="mt-6 inline-block text-primary hover:underline">Voltar para a lista</a>
                </div>
            );
        }
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
            <h1 className="text-3xl font-bold tracking-tight">Editar Solicitação de Rescisão</h1>
            <DismissalForm companies={companies} initialData={dismissal} isEditing={true} />
        </div>
    );
}
