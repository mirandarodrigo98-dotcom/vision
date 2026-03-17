import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { redirect } from 'next/navigation';
import { VacationForm } from '@/components/vacations/vacation-form';

export const dynamic = 'force-dynamic';

export default async function AdminViewVacationPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || (session.role !== 'admin' && session.role !== 'operator')) redirect('/login');

    const { id } = await params;

    let vacationQuery = `
        SELECT v.*, cc.nome as company_name, e.name as employee_name 
        FROM vacations v
        LEFT JOIN client_companies cc ON v.company_id = cc.id
        LEFT JOIN employees e ON v.employee_id = e.id
        WHERE v.id = ?
    `;
    const queryParams: any[] = [id];

    if (session.role === 'operator') {
        vacationQuery += ` AND (v.company_id IS NULL OR v.company_id NOT IN (SELECT company_id FROM user_restricted_companies WHERE user_id = ?))`;
        queryParams.push(session.user_id);
    }

    const vacation = await db.prepare(vacationQuery).get(...queryParams) as any;

    if (!vacation) {
        redirect('/admin/vacations');
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
                <h1 className="text-3xl font-bold tracking-tight">Visualizar Férias</h1>
                <p className="text-muted-foreground">
                    Detalhes da solicitação de férias.
                </p>
            </div>
            
            <VacationForm 
                companies={companies} 
                initialData={vacation} 
                isEditing={true} 
                readOnly={true}
                redirectPath="/admin/vacations"
            />
        </div>
    );
}
