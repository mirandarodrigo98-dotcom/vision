import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getTicketById, getPotentialAssignees } from '@/app/actions/tickets';
import { getSession } from '@/lib/auth';
import { getUserPermissions } from '@/app/actions/permissions';
import { TicketChat } from '@/components/tickets/ticket-chat';
import { TicketActions } from '@/components/tickets/ticket-actions';
import { TicketAssigneeSelect } from '@/components/tickets/ticket-assignee-select';
import { TicketStatusBadge } from '@/components/tickets/ticket-status-badge';
import { TicketPriorityBadge } from '@/components/tickets/ticket-priority-badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Calendar } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export async function generateMetadata({ params }: { params: { id: string } }) {
  const ticket = await getTicketById(params.id);
  if (!ticket) return { title: 'Chamado não encontrado' };
  return { title: `Chamado #${params.id.substring(0, 8)} | VISION` };
}

async function TicketDetails({ id }: { id: string }) {
  const ticket = await getTicketById(id);
  const assignees = await getPotentialAssignees();
  const session = await getSession();
  const permissions = await getUserPermissions();

  if (!ticket) {
    notFound();
  }

  const isAssignee = ticket.assignee_id === session?.user_id;
  const isRequester = ticket.requester_id === session?.user_id;
  const isAdmin = session?.role === 'admin';
  const isOperator = session?.role === 'operator';

  // Rules
  const canReturn = (isAdmin || isAssignee) && ticket.status !== 'returned' && ticket.status !== 'closed' && ticket.status !== 'resolved';
  const canResubmit = isRequester && ticket.status === 'returned';
  const canCancel = (isAdmin || isAssignee) && ticket.status !== 'cancelled' && ticket.status !== 'closed';
  const canFinalize = (isAdmin || isAssignee) && ticket.status !== 'closed' && ticket.status !== 'resolved' && ticket.status !== 'cancelled';
  const canTransfer = isAdmin || isAssignee || (isOperator && permissions.includes('tickets.assign'));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>#{ticket.id}</span>
            <span>•</span>
            <TicketStatusBadge status={ticket.status} />
            <span>•</span>
            <TicketPriorityBadge priority={ticket.priority} />
          </div>
          <h1 className="text-3xl font-bold">{ticket.title}</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Descrição</CardTitle>
          </CardHeader>
          <CardContent className="whitespace-pre-wrap">
            {ticket.description}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Histórico e Comentários</CardTitle>
          </CardHeader>
          <CardContent>
            <TicketChat 
              ticketId={ticket.id} 
              interactions={ticket.interactions} 
              currentUserEmail={session?.email} 
            />
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Detalhes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <span className="text-sm font-medium text-muted-foreground">Status</span>
              <div className="mt-1">
                <TicketActions 
                  ticketId={ticket.id} 
                  currentStatus={ticket.status} 
                  canReturn={canReturn}
                  canResubmit={canResubmit}
                  canCancel={canCancel}
                  canFinalize={canFinalize}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-1">
              <span className="text-sm font-medium text-muted-foreground">Solicitante</span>
              <div className="flex items-center gap-2 mt-1">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={ticket.requester_avatar} />
                  <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{ticket.requester_name}</span>
                  <span className="text-xs text-muted-foreground">{ticket.requester_email}</span>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-1">
              <span className="text-sm font-medium text-muted-foreground">Atribuído a</span>
              <div className="mt-1">
                <TicketAssigneeSelect 
                  ticketId={ticket.id} 
                  currentAssigneeId={ticket.assignee_id} 
                  assignees={assignees} 
                  canTransfer={canTransfer}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-1">
              <span className="text-sm font-medium text-muted-foreground">Categoria</span>
              <div className="text-sm mt-1 capitalize">{ticket.category || 'Geral'}</div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-sm font-medium text-muted-foreground">Criado em</span>
                <div className="flex items-center gap-1 text-sm mt-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(ticket.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-sm font-medium text-muted-foreground">Atualizado</span>
                <div className="flex items-center gap-1 text-sm mt-1">
                  <Calendar className="h-3 w-3" />
                  {ticket.updated_at ? format(new Date(ticket.updated_at), "dd/MM/yyyy", { locale: ptBR }) : '-'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function TicketPage({ params }: { params: { id: string } }) {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
        <TicketDetails id={params.id} />
      </Suspense>
    </div>
  );
}
