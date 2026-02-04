import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { TransferForm } from '@/components/transfers/transfer-form';
import { getTransfer } from '@/app/actions/transfers';

export default async function ViewTransferPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || session.role !== 'client_user') redirect('/login');

    const { id } = await params;

    const transfer = await getTransfer(id);

    if (!transfer) {
        return <div>Transferência não encontrada ou você não tem permissão.</div>;
    }

    // Get User Companies
    const companies = await db.prepare(`
        SELECT c.id, c.nome, c.cnpj
        FROM client_companies c
        JOIN user_companies uc ON uc.company_id = c.id
        WHERE uc.user_id = ?
        ORDER BY c.nome ASC
    `).all(session.user_id) as Array<{ id: string; nome: string; cnpj: string }>;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Visualizar Transferência</h1>
            <TransferForm 
                companies={companies} 
                initialData={transfer} 
                isEditing={true} 
                readOnly={true}
            />
        </div>
    );
}
