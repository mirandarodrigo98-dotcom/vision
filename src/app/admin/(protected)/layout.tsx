import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AdminDashboard from '@/components/admin/AdminDashboard';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  if (session.role !== 'admin' && session.role !== 'operator') {
    redirect('/app');
  }

  return (
    <AdminDashboard user={session}>
      {children}
    </AdminDashboard>
  );
}
