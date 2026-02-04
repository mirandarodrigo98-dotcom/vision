import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { redirect } from 'next/navigation';
import { TransferForm } from '@/components/transfers/transfer-form';

export default async function AdminViewTransferPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || (session.role !== 'admin' && session.role !== 'operator')) redirect('/login');

    const { id } = await params;

    const transfer = await db.prepare(`
        SELECT tr.*, cc.nome as source_company_name
        FROM transfer_requests tr
        LEFT JOIN client_companies cc ON tr.source_company_id = cc.id
        WHERE tr.id = ?
    `).get(id) as any;

    if (!transfer) {
        redirect('/admin/transfers');
    }

    const companies = await db.prepare(`
        SELECT id, nome, cnpj 
        FROM client_companies 
        ORDER BY nome
      `).all() as Array<{ id: string; nome: string; cnpj: string }>;

    return (
        <div className="space-y-6 max-w-4xl mx-auto py-8">
            <div className="flex flex-col space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Visualizar Transferência</h1>
                <p className="text-muted-foreground">
                    Detalhes da solicitação de transferência.
                </p>
            </div>
            
            <TransferForm 
                companies={companies} 
                initialData={transfer} 
                isEditing={true} 
                readOnly={true}
                redirectPath="/admin/transfers"
            />
        </div>
    );
}
