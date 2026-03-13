'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { updateTicketStatus, returnTicket, resubmitTicket } from '@/app/actions/tickets';
import { toast } from 'sonner';
import { Undo2, Send, CheckCircle2, Ban } from 'lucide-react';

interface TicketActionsProps {
  ticketId: string;
  currentStatus: string;
  canReturn: boolean;
  canResubmit: boolean;
  canCancel: boolean;
  canFinalize: boolean;
}

export function TicketActions({ 
  ticketId, 
  currentStatus, 
  canReturn, 
  canResubmit, 
  canCancel, 
  canFinalize 
}: TicketActionsProps) {
  const [status, setStatus] = useState(currentStatus);
  const [isUpdating, setIsUpdating] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);

  async function handleStatusChange(value: string) {
    if (value === status) return;
    
    // Check if trying to cancel/finalize without permission (though UI should hide it)
    if ((value === 'cancelled' && !canCancel) || ((value === 'closed' || value === 'resolved') && !canFinalize)) {
        toast.error('Você não tem permissão para realizar esta ação.');
        return;
    }

    setIsUpdating(true);
    try {
      const result = await updateTicketStatus(ticketId, value);
      if (result.error) {
        toast.error('Erro ao atualizar status');
        setStatus(currentStatus); // Revert
      } else {
        setStatus(value);
        toast.success(`Status alterado para ${value}`);
      }
    } catch (error) {
      toast.error('Erro ao atualizar status');
      setStatus(currentStatus);
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleReturn() {
    if (!returnReason.trim()) {
      toast.error('Informe o motivo da devolução');
      return;
    }

    setIsUpdating(true);
    try {
      const result = await returnTicket(ticketId, returnReason);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Chamado devolvido com sucesso');
        setReturnDialogOpen(false);
        setStatus('returned');
      }
    } catch (error) {
      toast.error('Erro ao devolver chamado');
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleResubmit() {
    setIsUpdating(true);
    try {
      const result = await resubmitTicket(ticketId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Chamado reenviado com sucesso');
        setStatus('open');
      }
    } catch (error) {
      toast.error('Erro ao reenviar chamado');
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Select value={status} onValueChange={handleStatusChange} disabled={isUpdating || (!canCancel && !canFinalize)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Aberto</SelectItem>
            <SelectItem value="in_progress">Em Andamento</SelectItem>
            {canFinalize && <SelectItem value="resolved">Resolvido</SelectItem>}
            {canFinalize && <SelectItem value="closed">Fechado</SelectItem>}
            {canCancel && <SelectItem value="cancelled">Cancelado</SelectItem>}
            <SelectItem value="returned" disabled>Devolvido</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap gap-2">
        {canReturn && (
          <Dialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 text-orange-600 border-orange-200 hover:bg-orange-50 hover:text-orange-700">
                <Undo2 size={16} />
                Devolver
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Devolver Chamado</DialogTitle>
                <DialogDescription>
                  Informe o motivo da devolução para que o solicitante possa corrigir.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <Textarea 
                  placeholder="Descreva o motivo..." 
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setReturnDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleReturn} disabled={isUpdating}>Confirmar Devolução</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {canResubmit && (
          <Button variant="default" size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700" onClick={handleResubmit} disabled={isUpdating}>
            <Send size={16} />
            Reenviar Chamado
          </Button>
        )}
      </div>
    </div>
  );
}
