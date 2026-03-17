import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { redirect } from 'next/navigation';
import { LeaveForm } from '@/components/leaves/leave-form';

export const dynamic = 'force-dynamic';

export default async function AdminViewLeavePage({ params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || (session.role !== 'admin' && session.role !== 'operator')) redirect('/login');

    const { id } = await params;

    let leaveQuery = `
        SELECT l.*, c.nome as company_name
        FROM leaves l
        JOIN client_companies c ON l.company_id = c.id
        WHERE l.id = ?
    `;
    const queryParams: any[] = [id];

    if (session.role === 'operator') {
        leaveQuery += ` AND (l.company_id IS NULL OR l.company_id NOT IN (SELECT company_id FROM user_restricted_companies WHERE user_id = ?))`;
        queryParams.push(session.user_id);
    }

    const leave = await db.prepare(leaveQuery).get(...queryParams) as any;

    if (!leave) {
        redirect('/admin/leaves');
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
                <h1 className="text-3xl font-bold tracking-tight">Visualizar Afastamento</h1>
                <p className="text-muted-foreground">
                    Detalhes da solicitação de afastamento.
                </p>
            </div>
            
            <LeaveForm 
                companies={companies} 
                initialData={leave} 
                isEditing={true} 
                readOnly={true}
                redirectPath="/admin/leaves"
                activeCompanyId={leave.company_id}
            />
        </div>
    );
}
