'use client';

import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { updateTicketAssignee } from '@/app/actions/tickets';
import { toast } from 'sonner';

interface Assignee {
  id: string;
  name: string;
  department_name?: string;
}

interface TicketAssigneeSelectProps {
  ticketId: string;
  currentAssigneeId?: string | null;
  assignees: Assignee[];
  canTransfer: boolean;
}

export function TicketAssigneeSelect({ ticketId, currentAssigneeId, assignees, canTransfer }: TicketAssigneeSelectProps) {
  const [assigneeId, setAssigneeId] = useState<string>(currentAssigneeId || 'unassigned');
  const [isUpdating, setIsUpdating] = useState(false);

  async function handleAssigneeChange(value: string) {
    const newValue = value === 'unassigned' ? null : value;
    if (newValue === currentAssigneeId) return;

    setIsUpdating(true);
    try {
      const result = await updateTicketAssignee(ticketId, newValue);
      if (result.error) {
        toast.error('Erro ao atualizar responsável');
        setAssigneeId(currentAssigneeId || 'unassigned');
      } else {
        setAssigneeId(value);
        toast.success('Responsável atualizado');
      }
    } catch (error) {
      toast.error('Erro ao atualizar responsável');
      setAssigneeId(currentAssigneeId || 'unassigned');
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <Select value={assigneeId} onValueChange={handleAssigneeChange} disabled={isUpdating || !canTransfer}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Selecione um responsável" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="unassigned">-- Não atribuído --</SelectItem>
        {assignees.map((assignee) => (
          <SelectItem key={assignee.id} value={assignee.id}>
            {assignee.name} {assignee.department_name ? `(${assignee.department_name})` : ''}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
