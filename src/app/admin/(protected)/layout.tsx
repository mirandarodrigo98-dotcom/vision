import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getUserPermissions } from '@/app/actions/permissions';
import { ReleaseNotesDialog } from '@/components/release-notes-dialog';

export const dynamic = 'force-dynamic';

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

  const permissions = await getUserPermissions();

  return (
    <AdminDashboard user={session} permissions={permissions}>
      {children}
      <ReleaseNotesDialog />
    </AdminDashboard>
  );
}
