import { TransferForm } from '@/components/transfers/transfer-form';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { redirect } from 'next/navigation';

export default async function NewTransferPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const companies = await db.prepare(`
    SELECT c.id, c.nome, c.cnpj 
    FROM client_companies c 
    JOIN user_companies uc ON c.id = uc.company_id 
    WHERE uc.user_id = ?
    ORDER BY c.nome
  `).all(session.user_id) as Array<{ id: string; nome: string; cnpj: string }>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-8">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Nova Transferência</h1>
        <p className="text-muted-foreground">
          Preencha os dados abaixo para iniciar o processo de transferência de funcionário.
        </p>
      </div>
      
      <TransferForm companies={companies} />
    </div>
  );
}
