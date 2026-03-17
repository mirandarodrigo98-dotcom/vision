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
import { User, Calendar, Paperclip, FileText, Download, ArrowLeft } from 'lucide-react';
import { TicketAttachmentList } from '@/components/tickets/ticket-attachment-list';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ticket = await getTicketById(id);
  if (!ticket) return { title: 'Chamado não encontrado' };
  return { title: `Chamado ${ticket.protocol || '#' + id.substring(0, 8)} | VISION` };
}

async function TicketDetails({ id }: { id: string }) {
  const ticket = await getTicketById(id);
  const assignees = await getPotentialAssignees(false);
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
  const daysSinceClosed = ticket.closed_at 
    ? Math.ceil(Math.abs(new Date().getTime() - new Date(ticket.closed_at).getTime()) / (1000 * 60 * 60 * 24)) 
    : 0;

  const canTransfer = isAdmin || isAssignee || (isOperator && (permissions.includes('tickets.edit') || permissions.includes('tickets.admin'))) || (isOperator && !ticket.assignee_id);
  
  // Quem pode aceitar: Admin, o próprio assignee (se já definido), ou qualquer um com permissão de transferir (para pegar tickets sem dono)
  const canAccept = (isAdmin || isAssignee || canTransfer) && ticket.status === 'open';
  
  const hasEditPermission = isAdmin || permissions.includes('tickets.edit') || permissions.includes('tickets.admin');

  const canReturn = (isAdmin || isAssignee || hasEditPermission) && ticket.status === 'in_progress';
  const canFinalize = (isAdmin || isAssignee || hasEditPermission) && ticket.status === 'in_progress';
  const canResubmit = (isAdmin || isRequester || hasEditPermission) && ticket.status === 'returned';
  const canReopen = (isAdmin || isRequester || hasEditPermission) && ticket.status === 'resolved' && daysSinceClosed <= 15;
  const canCancel = (isAdmin || isAssignee || hasEditPermission) && ticket.status !== 'closed' && ticket.status !== 'cancelled';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="flex flex-col gap-4">
          <div>
            <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2 text-muted-foreground hover:text-foreground">
              <Link href="/admin/tickets">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar para Chamados
              </Link>
            </Button>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-mono font-medium text-foreground">{ticket.protocol || '#' + ticket.id.substring(0, 8)}</span>
              <span>•</span>
              <TicketStatusBadge status={ticket.status} />
              <span>•</span>
              <TicketPriorityBadge priority={ticket.priority} />
            </div>
            <h1 className="text-3xl font-bold mt-2">{ticket.title}</h1>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Detalhes do Chamado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg">
              <div>
                <span className="text-sm font-medium text-muted-foreground block">Categoria</span>
                <span>{ticket.category || 'Não informada'}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground block">Unidade/Empresa</span>
                <span>{ticket.company_name || 'Não informada'}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground block">Prazo Desejado</span>
                <span>{ticket.due_date ? format(new Date(ticket.due_date), 'dd/MM/yyyy', { locale: ptBR }) : 'Não informado'}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground block">Destinatário</span>
                <span>{ticket.assignee_name || 'Não atribuído'}</span>
              </div>
            </div>
            
            <div className="pt-2">
              <span className="text-sm font-medium text-muted-foreground block mb-2">Descrição</span>
              <div className="whitespace-pre-wrap break-words">
                {ticket.description}
              </div>
            </div>
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
              ticketStatus={ticket.status}
              isRequester={isRequester}
            />
          </CardContent>
        </Card>

        {ticket.attachments && ticket.attachments.length > 0 && (
          <TicketAttachmentList 
            attachments={ticket.attachments} 
            ticketId={ticket.id} 
            isAdmin={isAdmin} 
          />
        )}
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Detalhes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <span className="text-sm font-medium text-muted-foreground">Ações</span>
              <div className="mt-1">
                <TicketActions 
                  ticketId={ticket.id} 
                  currentStatus={ticket.status} 
                  canAccept={canAccept}
                  canReturn={canReturn}
                  canResubmit={canResubmit}
                  canFinalize={canFinalize}
                  canReopen={canReopen}
                  canCancel={canCancel}
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
                  key={ticket.assignee_id || 'unassigned'}
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

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
        <TicketDetails id={id} />
      </Suspense>
    </div>
  );
}
