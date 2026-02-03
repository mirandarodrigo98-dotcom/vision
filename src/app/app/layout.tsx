import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ClientNav } from '@/components/client-nav';

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session || session.role !== 'client_user') {
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <ClientNav />
      <main className="flex-1 overflow-y-auto h-screen">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
