import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function CarneLeaoLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  
  if (!session?.carne_leao_access) {
    redirect('/app');
  }

  return <>{children}</>;
}