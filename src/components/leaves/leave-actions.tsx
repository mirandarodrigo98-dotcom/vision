'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Eye, Ban, Loader2, CheckCircle, Pencil } from 'lucide-react';
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
import { useRouter } from 'next/navigation';
import { cancelLeave, approveLeave } from '@/app/actions/leaves';
import { toast } from 'sonner';
import { LeaveHistory } from './leave-history';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface LeaveActionsProps {
  leaveId: string;
  startDate: string;
  status: string;
  employeeName: string;
  isAdmin?: boolean;
}

export function LeaveActions({ leaveId, startDate, status, employeeName, isAdmin = false }: LeaveActionsProps) {
  const router = useRouter();
  const [isCancelling, setIsCancelling] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  // Check deadline: 1 day before start date
  // Parse YYYY-MM-DD string as local date to avoid timezone issues
  let stDate: Date;
  const cleanStartDate = typeof startDate === 'string' ? startDate.trim().split('T')[0] : '';
  
  if (cleanStartDate && /^\d{4}-\d{2}-\d{2}$/.test(cleanStartDate)) {
      const [year, month, day] = cleanStartDate.split('-').map(Number);
      stDate = new Date(year, month - 1, day);
  } else {
      stDate = new Date(startDate);
  }

  const deadline = new Date(stDate);
  deadline.setDate(deadline.getDate() - 1);
  
  // Reset time for comparison
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  deadline.setHours(0, 0, 0, 0);
  
  const isExpired = now > deadline;
  const isCanceled = status === 'CANCELLED';
  const isCompleted = status === 'COMPLETED';
  
  // Admin/Operator CAN cancel. Client can cancel if not expired.
  const canCancel = !isCanceled && !isCompleted && (isAdmin || !isExpired);
  const canEdit = !isCanceled && !isCompleted && (isAdmin || !isExpired);
  const canApprove = isAdmin && (status === 'SUBMITTED' || status === 'RECTIFIED');

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      const result = await cancelLeave(leaveId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Solicitação de afastamento cancelada com sucesso.');
        router.refresh();
      }
    } catch (error) {
      toast.error('Erro ao cancelar solicitação.');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      const result = await approveLeave(leaveId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Solicitação de afastamento aprovada com sucesso.');
        router.refresh();
      }
    } catch (error) {
      toast.error('Erro ao aprovar solicitação.');
    } finally {
      setIsApproving(false);
    }
  };

  const handleView = () => {
    if (isAdmin) {
      router.push(`/admin/leaves/${leaveId}/view`);
    } else {
      router.push(`/app/leaves/${leaveId}/view`);
    }
  };

  const handleEdit = () => {
    if (isAdmin) {
      router.push(`/admin/leaves/${leaveId}/edit`);
    } else {
      router.push(`/app/leaves/${leaveId}/edit`);
    }
  };

  const getTooltipMessage = () => {
    if (isCanceled) return "Solicitação cancelada";
    if (isCompleted) return "Solicitação concluída";
    if (isExpired && !isAdmin) return "Prazo de retificação expirado";
    return null;
  };

  const tooltipMessage = getTooltipMessage();

  return (
    <div className="flex items-center gap-2 justify-center">
       
       <LeaveHistory leaveId={leaveId} />

       <TooltipProvider>
          {/* Approve Button (Admin Only) */}
          {isAdmin && (
            canApprove ? (
            <AlertDialog>
                <Tooltip>
                  <TooltipTrigger asChild>
                      <AlertDialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            disabled={isApproving}
                            className="text-green-600 border-green-200 hover:bg-green-50"
                          >
                            {isApproving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                          </Button>
                      </AlertDialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Concluir/Aprovar Solicitação</p>
                  </TooltipContent>
                </Tooltip>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Concluir Afastamento</AlertDialogTitle>
                    <AlertDialogDescription>
                      Confirma a aprovação do afastamento de <strong>{employeeName}</strong>?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Voltar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleApprove} className="bg-green-600 hover:bg-green-700">
                      Concluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="inline-block">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled
                      className="text-gray-300 border-gray-200 cursor-not-allowed"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isCanceled ? "Solicitação cancelada" : isCompleted ? "Solicitação já concluída" : "Ação indisponível"}</p>
                </TooltipContent>
              </Tooltip>
            )
          )}

          {/* View Button */}
          <Tooltip>
            <TooltipTrigger asChild>
                <span>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleView}
                        className="text-primary border-primary/20 hover:bg-primary/10"
                    >
                        <Eye className="h-4 w-4" />
                    </Button>
                </span>
            </TooltipTrigger>
            <TooltipContent>
                <p>Visualizar Detalhes</p>
            </TooltipContent>
          </Tooltip>

          {/* Edit Button */}
          {!isAdmin && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="inline-block">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleEdit} 
                  disabled={!canEdit}
                  className={!canEdit ? "text-gray-300 border-gray-200 cursor-not-allowed" : "text-primary border-primary/20 hover:bg-primary/10"}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{
                isCanceled ? "Solicitação cancelada" :
                isCompleted ? "Solicitação concluída" :
                (!isAdmin && isExpired) ? "Prazo de retificação expirado" :
                "Retificar Solicitação"
              }</p>
            </TooltipContent>
          </Tooltip>
          )}

          {/* Cancel Button */}
          {canCancel ? (
             <AlertDialog>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <AlertDialogTrigger asChild>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-red-600 border-red-200 hover:bg-red-50"
                                disabled={isCancelling}
                            >
                                {isCancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                            </Button>
                        </AlertDialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Cancelar Solicitação</p>
                    </TooltipContent>
                </Tooltip>
                <AlertDialogContent>
                  <AlertDialogHeader>
                      <AlertDialogTitle>Cancelar Solicitação</AlertDialogTitle>
                      <AlertDialogDescription>
                          Tem certeza que deseja cancelar o afastamento de <strong>{employeeName}</strong>?
                          <br/><br/>
                          Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                      <AlertDialogCancel>Voltar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleCancel} className="bg-red-600 hover:bg-red-700">
                          Confirmar Cancelamento
                      </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
          ) : (
             <Tooltip>
               <TooltipTrigger asChild>
                 <div className="inline-block">
                   <Button 
                     variant="outline" 
                     size="sm" 
                     disabled
                     className="text-gray-300 border-gray-200 cursor-not-allowed"
                   >
                     <Ban className="h-4 w-4" />
                   </Button>
                 </div>
               </TooltipTrigger>
               <TooltipContent>
                 <p>{tooltipMessage}</p>
               </TooltipContent>
             </Tooltip>
          )}
       </TooltipProvider>
    </div>
  );
}
