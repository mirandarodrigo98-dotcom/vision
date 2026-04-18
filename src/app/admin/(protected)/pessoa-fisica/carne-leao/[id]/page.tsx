import { Metadata } from 'next';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AdminCarneLeaoManager } from '@/components/carne-leao/admin-carne-leao';

export const metadata: Metadata = {
  title: 'Manutenção Carnê Leão | VISION',
};

export default async function AdminCarneLeaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();

  const user = (await db.query(`SELECT id, name, email FROM users WHERE id = $1 AND role = 'client_user'`, [id])).rows[0] as any;
  
  if (!user) {
    redirect('/admin/pessoa-fisica/carne-leao');
  }

  const rendimentos = (await db.query(`SELECT * FROM carne_leao_rendimentos WHERE user_id = $1 ORDER BY data_recebimento DESC`, [id])).rows;
  const pagamentos = (await db.query(`SELECT * FROM carne_leao_pagamentos WHERE user_id = $1 ORDER BY data_pagamento DESC`, [id])).rows;

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <AdminCarneLeaoManager 
        user={user} 
        initialRendimentos={rendimentos} 
        initialPagamentos={pagamentos} 
      />
    </div>
  );
}