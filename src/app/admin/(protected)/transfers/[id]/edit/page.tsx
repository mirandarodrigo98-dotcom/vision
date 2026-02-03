import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import { TransferForm } from '@/components/transfers/transfer-form';
import { redirect } from 'next/navigation';

export default async function AdminEditTransferPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect('/login');

  const { id } = await params;

  const transfer = await db.prepare('SELECT * FROM transfer_requests WHERE id = ?').get(id) as any;
  if (!transfer) return <div>Transferência não encontrada.</div>;

  const companies = await db.prepare('SELECT id, nome, cnpj FROM client_companies WHERE is_active = 1 ORDER BY nome ASC').all() as any[];

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
