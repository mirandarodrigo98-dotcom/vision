'use client';

import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
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
import { updateTicketAssignee } from '@/app/actions/tickets';
import { toast } from 'sonner';
import { UserPlus } from 'lucide-react';

interface Assignee {
  id: string;
  name: string;
  department_name?: string;
}

interface TicketAssigneeSelectProps {
  ticketId: string;
  currentAssigneeId?: string | null;
  currentAssigneeName?: string | null;
  assignees: Assignee[];
  canTransfer: boolean;
}

export function TicketAssigneeSelect({ ticketId, currentAssigneeId, currentAssigneeName, assignees, canTransfer }: TicketAssigneeSelectProps) {
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string>(currentAssigneeId || 'unassigned');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  async function handleAssign() {
    const newValue = selectedAssigneeId === 'unassigned' ? null : selectedAssigneeId;
    if (newValue === currentAssigneeId) return;

    setIsUpdating(true);
    try {
      const result = await updateTicketAssignee(ticketId, newValue);
      if (result.error) {
        toast.error('Erro ao atualizar responsável');
        // Revert not needed as we only commit on button click, but maybe reset selection?
        // setSelectedAssigneeId(currentAssigneeId || 'unassigned');
      } else {
        toast.success('Responsável atualizado');
        setIsConfirmOpen(false);
      }
    } catch (error) {
      toast.error('Erro ao atualizar responsável');
    } finally {
      setIsUpdating(false);
    }
  }

  const getAssigneeName = (id: string) => {
    if (id === 'unassigned') return 'Ninguém';
    const assignee = assignees.find(a => a.id === id);
    if (assignee) return assignee.name;
    // Fallback se o ID selecionado for o atual, mas não estiver na lista (ex: lista filtrada mas eu sou o dono)
    if (id === currentAssigneeId && currentAssigneeName) return currentAssigneeName;
    return 'Desconhecido';
  };

  const selectedAssigneeName = getAssigneeName(selectedAssigneeId);

  return (
    <div className="flex gap-2">
      <Select 
        value={selectedAssigneeId} 
        onValueChange={setSelectedAssigneeId} 
        disabled={isUpdating || !canTransfer}
      >
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

      {canTransfer && selectedAssigneeId !== (currentAssigneeId || 'unassigned') && (
        <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="default" disabled={isUpdating} className="gap-2">
              <UserPlus size={16} /> Atribuir
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Atribuição</AlertDialogTitle>
              <AlertDialogDescription>
                Deseja atribuir este chamado para <strong>{selectedAssigneeName}</strong>?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleAssign}>Confirmar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
