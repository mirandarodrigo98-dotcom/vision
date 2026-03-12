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
import { updateTicketStatus } from '@/app/actions/tickets';
import { toast } from 'sonner';

interface TicketActionsProps {
  ticketId: string;
  currentStatus: string;
}

export function TicketActions({ ticketId, currentStatus }: TicketActionsProps) {
  const [status, setStatus] = useState(currentStatus);
  const [isUpdating, setIsUpdating] = useState(false);

  async function handleStatusChange(value: string) {
    if (value === status) return;
    
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

  return (
    <div className="flex items-center gap-2">
      <Select value={status} onValueChange={handleStatusChange} disabled={isUpdating}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="open">Aberto</SelectItem>
          <SelectItem value="in_progress">Em Andamento</SelectItem>
          <SelectItem value="resolved">Resolvido</SelectItem>
          <SelectItem value="closed">Fechado</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
