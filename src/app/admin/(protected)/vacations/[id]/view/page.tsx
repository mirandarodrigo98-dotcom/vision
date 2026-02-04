import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { redirect } from 'next/navigation';
import { VacationForm } from '@/components/vacations/vacation-form';

export default async function AdminViewVacationPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || (session.role !== 'admin' && session.role !== 'operator')) redirect('/login');

    const { id } = await params;

    const vacation = await db.prepare(`
        SELECT v.*, cc.nome as company_name, e.name as employee_name 
        FROM vacations v
        LEFT JOIN client_companies cc ON v.company_id = cc.id
        LEFT JOIN employees e ON v.employee_id = e.id
        WHERE v.id = ?
    `).get(id) as any;

    if (!vacation) {
        redirect('/admin/vacations');
    }

    const companies = await db.prepare(`
        SELECT id, nome, cnpj 
        FROM client_companies 
        ORDER BY nome
      `).all() as Array<{ id: string; nome: string; cnpj: string }>;

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
