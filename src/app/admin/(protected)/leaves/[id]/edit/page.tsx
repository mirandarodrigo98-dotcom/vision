import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { redirect } from 'next/navigation';
import { LeaveForm } from '@/components/leaves/leave-form';

export default async function AdminEditLeavePage({ params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || (session.role !== 'admin' && session.role !== 'operator')) redirect('/login');

    const { id } = await params;

    const leave = await db.prepare(`
        SELECT l.*, c.nome as company_name
        FROM leaves l
        JOIN client_companies c ON l.company_id = c.id
        WHERE l.id = ?
    `).get(id) as any;

    if (!leave) {
        redirect('/admin/leaves');
    }

    const companies = await db.prepare(`
        SELECT id, nome, cnpj 
        FROM client_companies 
        ORDER BY nome
      `).all() as Array<{ id: string; nome: string; cnpj: string }>;

    return (
        <div className="space-y-6 max-w-4xl mx-auto py-8">
            <div className="flex flex-col space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Editar Afastamento</h1>
                <p className="text-muted-foreground">
                    Editar dados da solicitação de afastamento.
                </p>
            </div>
            
            <LeaveForm 
                companies={companies} 
                initialData={leave} 
                isEditing={true} 
                readOnly={false}
                redirectPath="/admin/leaves"
                activeCompanyId={leave.company_id}
            />
        </div>
    );
}
