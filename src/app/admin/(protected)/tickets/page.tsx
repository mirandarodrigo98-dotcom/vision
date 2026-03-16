import { Suspense } from 'react';
import { getTickets, getTicketCounts, getTicketFilterOptions } from '@/app/actions/tickets';
import { TicketsTable } from '@/components/tickets/tickets-table';
import { NewTicketDialog } from '@/components/tickets/new-ticket-dialog';
import { TicketFilters } from '@/components/tickets/ticket-filters';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getSession } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';

export const metadata = {
  title: 'Chamados | VISION',
};

async function TicketsList({ searchParams }: { searchParams: any }) {
  const session = await getSession();
  const canManageCategories = session && (session.role === 'admin' || await hasPermission(session.role, 'tickets.manage_categories'));

  const [tickets, counts, filterOptions] = await Promise.all([
    getTickets(searchParams),
    getTicketCounts(searchParams),
    getTicketFilterOptions()
  ]);

  const createFilterLink = (status: string | null) => {
    const params = new URLSearchParams(searchParams);
    if (status) {
      params.set('status', status);
    } else {
      params.delete('status');
    }
    return `?${params.toString()}`;
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Chamados</h2>
        <div className="flex gap-2">
          {canManageCategories && (
            <Link href="/admin/tickets/categories">
              <Button variant="outline">
                <Settings className="mr-2 h-4 w-4" />
                Categorias
              </Button>
            </Link>
          )}
          <NewTicketDialog />
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href={createFilterLink(null)}>
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total de Chamados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{counts.total}</div>
            </CardContent>
          </Card>
        </Link>
        <Link href={createFilterLink('open')}>
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Em Aberto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {counts.open}
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href={createFilterLink('in_progress')}>
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Em Andamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {counts.in_progress}
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href={createFilterLink('closed')}>
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Fechados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {counts.closed}
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <TicketFilters 
        requesters={filterOptions.requesters} 
        departments={filterOptions.departments} 
        assignees={filterOptions.assignees} 
      />

      <TicketsTable tickets={tickets} />
    </div>
  );
}

export default function TicketsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
        <TicketsList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
