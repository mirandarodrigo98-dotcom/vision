import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import { TransferForm } from '@/components/transfers/transfer-form';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AdminEditTransferPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect('/login');

  const { id } = await params;

  let transferQuery = 'SELECT * FROM transfer_requests WHERE id = ?';
  const queryParams: any[] = [id];

  if (session.role === 'operator') {
    transferQuery += ' AND (source_company_id IS NULL OR source_company_id NOT IN (SELECT company_id FROM user_restricted_companies WHERE user_id = ?))';
    queryParams.push(session.user_id);
  } else if (session.role === 'client_user') {
    transferQuery += ' AND source_company_id IN (SELECT company_id FROM user_companies WHERE user_id = ?)';
    queryParams.push(session.user_id);
  }

  const transfer = await db.prepare(transferQuery).get(...queryParams) as any;
  if (!transfer) return <div>Transferência não encontrada ou sem permissão.</div>;

  let companies = [];
  if (session.role === 'operator') {
    companies = await db.prepare('SELECT id, nome, cnpj FROM client_companies WHERE is_active = 1 AND id NOT IN (SELECT company_id FROM user_restricted_companies WHERE user_id = ?) ORDER BY nome ASC').all(session.user_id) as any[];
  } else if (session.role === 'client_user') {
    companies = await db.prepare('SELECT id, nome, cnpj FROM client_companies WHERE is_active = 1 AND id IN (SELECT company_id FROM user_companies WHERE user_id = ?) ORDER BY nome ASC').all(session.user_id) as any[];
  } else {
    companies = await db.prepare('SELECT id, nome, cnpj FROM client_companies WHERE is_active = 1 ORDER BY nome ASC').all() as any[];
  }

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Editar Transferência</h1>
      </div>
      <TransferForm 
        companies={companies} 
        initialData={transfer} 
        isEditing 
        redirectPath="/admin/transfers"
      />
    </div>
  );
}
