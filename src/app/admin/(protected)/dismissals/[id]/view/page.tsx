import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { redirect } from 'next/navigation';
import { DismissalForm } from '@/components/dismissals/dismissal-form';

export const dynamic = 'force-dynamic';

export default async function AdminViewDismissalPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || (session.role !== 'admin' && session.role !== 'operator')) redirect('/login');

    const { id } = await params;

    let dismissalQuery = `
        SELECT d.*, cc.nome as company_name, e.name as employee_name 
        FROM dismissals d
        LEFT JOIN client_companies cc ON d.company_id = cc.id
        LEFT JOIN employees e ON d.employee_id = e.id
        WHERE d.id = ?
    `;
    const queryParams: any[] = [id];

    if (session.role === 'operator') {
        dismissalQuery += ` AND (d.company_id IS NULL OR d.company_id NOT IN (SELECT company_id FROM user_restricted_companies WHERE user_id = ?))`;
        queryParams.push(session.user_id);
    }

    const dismissal = await db.prepare(dismissalQuery).get(...queryParams) as any;

    if (!dismissal) {
        redirect('/admin/dismissals');
    }

    let companies = [];
    if (session.role === 'operator') {
        companies = await db.prepare(`
            SELECT id, nome, cnpj 
            FROM client_companies 
            WHERE id NOT IN (SELECT company_id FROM user_restricted_companies WHERE user_id = ?)
            ORDER BY nome
        `).all(session.user_id) as Array<{ id: string; nome: string; cnpj: string }>;
    } else {
        companies = await db.prepare(`
            SELECT id, nome, cnpj 
            FROM client_companies 
            ORDER BY nome
          `).all() as Array<{ id: string; nome: string; cnpj: string }>;
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto py-8">
            <div className="flex flex-col space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Visualizar Rescisão</h1>
                <p className="text-muted-foreground">
                    Detalhes da solicitação de rescisão.
                </p>
            </div>
            
            <DismissalForm 
                companies={companies} 
                initialData={dismissal} 
                isEditing={true} 
                readOnly={true}
                redirectPath="/admin/dismissals"
            />
        </div>
    );
}
