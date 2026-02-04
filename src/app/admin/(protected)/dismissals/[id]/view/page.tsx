import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { redirect } from 'next/navigation';
import { DismissalForm } from '@/components/dismissals/dismissal-form';

export default async function AdminViewDismissalPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || (session.role !== 'admin' && session.role !== 'operator')) redirect('/login');

    const { id } = await params;

    const dismissal = await db.prepare(`
        SELECT d.*, cc.nome as company_name, e.name as employee_name 
        FROM dismissals d
        LEFT JOIN client_companies cc ON d.company_id = cc.id
        LEFT JOIN employees e ON d.employee_id = e.id
        WHERE d.id = ?
    `).get(id) as any;

    if (!dismissal) {
        redirect('/admin/dismissals');
    }

    const companies = await db.prepare(`
        SELECT id, nome, cnpj 
        FROM client_companies 
        ORDER BY nome
      `).all() as Array<{ id: string; nome: string; cnpj: string }>;

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
