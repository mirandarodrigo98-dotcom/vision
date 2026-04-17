import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { redirect } from 'next/navigation';
import { TransferForm } from '@/components/transfers/transfer-form';

export const dynamic = 'force-dynamic';

export default async function AdminViewTransferPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || (session.role !== 'admin' && session.role !== 'operator')) redirect('/login');

    const { id } = await params;

    let transferQuery = `
        SELECT tr.*, 
               COALESCE(cc.razao_social, cc.nome) as source_company_name,
               COALESCE(tc.razao_social, tc.nome, tr.target_company_name) as target_company_name
        FROM transfer_requests tr
        LEFT JOIN client_companies cc ON tr.source_company_id = cc.id
        LEFT JOIN client_companies tc ON tr.target_company_id = tc.id
        WHERE tr.id = $1
    `;
    const queryParams: any[] = [id];

    if (session.role === 'operator') {
        transferQuery += ` AND (tr.source_company_id IS NULL OR tr.source_company_id NOT IN (SELECT company_id FROM user_restricted_companies WHERE user_id = $2))`;
        queryParams.push(session.user_id);
    }

    const transfer = (await db.query(transferQuery, [...queryParams])).rows[0] as any;

    if (!transfer) {
        redirect('/admin/transfers');
    }

    let companies = [];
    if (session.role === 'operator') {
        companies = (await db.query(`
            SELECT id, COALESCE(razao_social, nome) as nome, cnpj 
            FROM client_companies 
            WHERE id NOT IN (SELECT company_id FROM user_restricted_companies WHERE user_id = $1)
            ORDER BY nome
        `, [session.user_id])).rows as Array<{ id: string; nome: string; cnpj: string }>;
    } else {
        companies = (await db.query(`
            SELECT id, COALESCE(razao_social, nome) as nome, cnpj 
            FROM client_companies 
            ORDER BY nome
          `, [])).rows as Array<{ id: string; nome: string; cnpj: string }>;
    }

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
