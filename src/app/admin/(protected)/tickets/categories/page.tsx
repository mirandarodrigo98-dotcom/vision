import { Metadata } from 'next';
import { CategoryManagement } from '@/components/tickets/category-management';
import { getAdminTicketCategories } from '@/app/actions/ticket-categories';
import { getSession } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Gerenciar Categorias | VISION',
};

export default async function CategoriesPage() {
  const session = await getSession();
  
  if (!session) {
    redirect('/login');
  }

  const canManage = await hasPermission(session.role, 'tickets.manage_categories');
  if (session.role !== 'admin' && !canManage) {
    redirect('/admin/tickets');
  }

  const categories = await getAdminTicketCategories();

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <CategoryManagement initialCategories={categories} />
    </div>
  );
}
