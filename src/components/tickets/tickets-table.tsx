'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TicketStatusBadge } from './ticket-status-badge';
import { TicketPriorityBadge } from './ticket-priority-badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';
import { ArrowRight, User, Eye } from 'lucide-react';

interface TicketsTableProps {
  tickets: any[];
}

export function TicketsTable({ tickets }: TicketsTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Título</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="text-center">Prioridade</TableHead>
            <TableHead>Solicitante</TableHead>
            <TableHead>Departamento</TableHead>
            <TableHead>Atribuído a</TableHead>
            <TableHead>Atualizado em</TableHead>
            <TableHead className="w-[100px]">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">
                Nenhum chamado encontrado
              </TableCell>
            </TableRow>
          ) : (
            tickets.map((ticket) => (
              <TableRow key={ticket.id}>
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <span className="truncate max-w-[300px]">{ticket.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {ticket.protocol ? (
                        <span className="font-mono">{ticket.protocol}</span>
                      ) : (
                        `#${ticket.id.substring(0, 8)}`
                      )}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center items-center">
                    <TicketStatusBadge status={ticket.status} />
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center items-center">
                    <TicketPriorityBadge priority={ticket.priority} />
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={ticket.requester_avatar} />
                      <AvatarFallback><User className="h-3 w-3" /></AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{ticket.requester_name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {ticket.requester_department_name || '-'}
                  </span>
                </TableCell>
                <TableCell>
                  {ticket.assignee_id ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={ticket.assignee_avatar} />
                        <AvatarFallback><User className="h-3 w-3" /></AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{ticket.assignee_name}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">Não atribuído</span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {ticket.updated_at ? format(new Date(ticket.updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : '-'}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" asChild title="Ver detalhes">
                      <Link href={`/admin/tickets/${ticket.id}`}>
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">Ver detalhes</span>
                      </Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
