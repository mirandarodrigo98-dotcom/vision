import { Metadata } from 'next';
import { CarneLeaoManager } from '@/components/carne-leao/carne-leao-manager';
import { Suspense } from 'react';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Carnê Leão | VISION',
};

export default async function CarneLeaoPage() {
  const session = await getSession();
  if (!session?.carne_leao_access) {
    redirect('/app');
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Carnê Leão</h2>
      </div>
      <p className="text-muted-foreground mt-2 mb-6">
        Controle de rendimentos e pagamentos para o Carnê Leão.
      </p>

      <Suspense fallback={<div>Carregando...</div>}>
        <CarneLeaoManager />
      </Suspense>
    </div>
  );
}