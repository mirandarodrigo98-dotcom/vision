'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  returnTicket, 
  resubmitTicket, 
  acceptTicket, 
  resolveTicket, 
  reopenTicket, 
  cancelTicket 
} from '@/app/actions/tickets';
import { toast } from 'sonner';
import { 
  Undo2, 
  Send, 
  CheckCircle2, 
  Ban, 
  PlayCircle, 
  RotateCcw 
} from 'lucide-react';
import { translateStatus } from '@/lib/ticket-utils';

interface TicketActionsProps {
  ticketId: string;
  currentStatus: string;
  canAccept: boolean;
  canReturn: boolean;
  canResubmit: boolean;
  canFinalize: boolean;
  canReopen: boolean;
  canCancel: boolean;
}

export function TicketActions({ 
  ticketId, 
  currentStatus, 
  canAccept,
  canReturn, 
  canResubmit, 
  canFinalize,
  canReopen,
  canCancel
}: TicketActionsProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);

  // Handlers
  async function handleAccept() {
    setIsUpdating(true);
    try {
      const result = await acceptTicket(ticketId);
      if (result.error) toast.error(result.error);
      else toast.success('Chamado aceito');
    } catch {
      toast.error('Erro ao aceitar chamado');
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
      if (result.error) toast.error(result.error);
      else {
        toast.success('Chamado devolvido');
        setReturnDialogOpen(false);
      }
    } catch {
      toast.error('Erro ao devolver chamado');
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleFinalize() {
    setIsUpdating(true);
    try {
      const result = await resolveTicket(ticketId);
      if (result.error) toast.error(result.error);
      else toast.success('Chamado resolvido');
    } catch {
      toast.error('Erro ao resolver chamado');
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleResubmit() {
    setIsUpdating(true);
    try {
      const result = await resubmitTicket(ticketId);
      if (result.error) toast.error(result.error);
      else toast.success('Chamado reenviado');
    } catch {
      toast.error('Erro ao reenviar chamado');
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleReopen() {
    setIsUpdating(true);
    try {
      const result = await reopenTicket(ticketId);
      if (result.error) toast.error(result.error);
      else toast.success('Chamado reaberto');
    } catch {
      toast.error('Erro ao reabrir chamado');
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleCancel() {
    setIsUpdating(true);
    try {
      const result = await cancelTicket(ticketId);
      if (result.error) toast.error(result.error);
      else toast.success('Chamado cancelado');
    } catch {
      toast.error('Erro ao cancelar chamado');
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Status Display (Read Only) */}
      <div className="text-sm font-medium text-muted-foreground mb-2">
        Status Atual: <span className="text-foreground capitalize">{translateStatus(currentStatus)}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {/* Accept Button */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              className="bg-blue-600 hover:bg-blue-700 gap-2" 
              disabled={isUpdating || !canAccept}
            >
              <PlayCircle size={16} /> Aceitar
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Aceitar Chamado</AlertDialogTitle>
              <AlertDialogDescription>
                Deseja aceitar este chamado e iniciar o atendimento? O status mudará para "Em Andamento".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleAccept}>Confirmar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Return Button */}
        <Dialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              className="text-orange-600 border-orange-200 hover:bg-orange-50 gap-2" 
              disabled={isUpdating || !canReturn}
            >
              <Undo2 size={16} /> Devolver
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Devolver Chamado</DialogTitle>
              <DialogDescription>
                Informe o motivo da devolução (Obrigatório). O status mudará para "Devolvido".
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
              <Button onClick={handleReturn} disabled={isUpdating || !returnReason.trim()}>Confirmar Devolução</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Finalize Button */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              className="bg-green-600 hover:bg-green-700 gap-2" 
              disabled={isUpdating || !canFinalize}
            >
              <CheckCircle2 size={16} /> Finalizar
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Finalizar Chamado</AlertDialogTitle>
              <AlertDialogDescription>
                Deseja finalizar este chamado? O status mudará para "Resolvido".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleFinalize}>Confirmar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Resubmit Button (Enviar) */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              className="bg-blue-600 hover:bg-blue-700 gap-2" 
              disabled={isUpdating || !canResubmit}
            >
              <Send size={16} /> Enviar
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reenviar Chamado</AlertDialogTitle>
              <AlertDialogDescription>
                Deseja reenviar este chamado para análise? O status voltará para "Aberto".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleResubmit}>Confirmar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Reopen Button */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant="outline" 
              className="gap-2" 
              disabled={isUpdating || !canReopen}
            >
              <RotateCcw size={16} /> Reabrir
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reabrir Chamado</AlertDialogTitle>
              <AlertDialogDescription>
                Deseja reabrir este chamado? O status voltará para "Aberto".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleReopen}>Confirmar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Cancel Button */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant="ghost" 
              className="text-red-600 hover:bg-red-50 hover:text-red-700 gap-2" 
              disabled={isUpdating || !canCancel}
            >
              <Ban size={16} /> Cancelar
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancelar Chamado</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja cancelar este chamado? Esta ação não pode ser desfeita facilmente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>

                <AlertDialogCancel>Voltar</AlertDialogCancel>
                <AlertDialogAction onClick={handleCancel} className="bg-red-600 hover:bg-red-700">Confirmar Cancelamento</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
