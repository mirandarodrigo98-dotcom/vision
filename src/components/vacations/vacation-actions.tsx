'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Pencil, Ban, Loader2, CheckCircle } from 'lucide-react';
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
import { cancelVacation, approveVacation } from '@/app/actions/vacations';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface VacationActionsProps {
  vacationId: string;
  startDate: string;
  status: string;
  employeeName: string;
  isAdmin?: boolean;
  basePath?: string;
}

export function VacationActions({ vacationId, startDate, status, employeeName, isAdmin = false, basePath = '/admin' }: VacationActionsProps) {
  const router = useRouter();
  const [isCancelling, setIsCancelling] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  // Check deadline: 1 day before start date
  const stDate = new Date(startDate);
  const deadline = new Date(stDate);
  deadline.setDate(deadline.getDate() - 1);
  
  // Reset time for comparison
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  deadline.setHours(0, 0, 0, 0);
  
  const isExpired = now > deadline;
  const isCanceled = status === 'CANCELLED';
  const isCompleted = status === 'COMPLETED';
  const canEdit = !isCanceled && !isCompleted && (isAdmin || !isExpired);
  const canApprove = isAdmin && status === 'SUBMITTED';

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      const result = await cancelVacation(vacationId);
      if (result.success) {
        toast.success('Férias canceladas com sucesso.');
        router.refresh();
      } else {
        toast.error(result.error || 'Erro ao cancelar férias.');
      }
    } catch (error) {
      toast.error('Erro ao processar solicitação.');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      const result = await approveVacation(vacationId);
      if (result.success) {
        toast.success('Férias aprovadas com sucesso.');
        router.refresh();
      } else {
        toast.error(result.error || 'Erro ao aprovar férias.');
      }
    } catch (error) {
      toast.error('Erro ao processar aprovação.');
    } finally {
      setIsApproving(false);
    }
  };

  const handleRectify = () => {
    if (!canEdit) return;
    router.push(`${basePath}/vacations/${vacationId}/edit`);
  };

  const getTooltipMessage = () => {
    if (isCanceled) return "Férias canceladas";
    if (isCompleted) return "Férias concluídas";
    if (isExpired && !isAdmin) return "Prazo de retificação/cancelamento expirado";
    return null;
  };

  const tooltipMessage = getTooltipMessage();

  return (
    <div className="flex items-center gap-2 justify-center">
       
       <TooltipProvider>
          {/* Approve Button (Admin Only) */}
          {canApprove && (
            <AlertDialog>
                <Tooltip>
                  <TooltipTrigger asChild>
                      <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            disabled={isApproving}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            {isApproving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                          </Button>
                      </AlertDialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Concluir/Aprovar Férias</p>
                  </TooltipContent>
                </Tooltip>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Concluir Férias</AlertDialogTitle>
                    <AlertDialogDescription>
                      Confirma a aprovação das férias de <strong>{employeeName}</strong>?
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
          )}

          {/* Edit Button */}
          <Tooltip>
            <TooltipTrigger asChild>
                <span>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={handleRectify}
                        disabled={!canEdit}
                        className={!canEdit ? "opacity-50 cursor-not-allowed" : "text-blue-600 hover:text-blue-700 hover:bg-blue-50"}
                    >
                        <Pencil className="h-4 w-4" />
                    </Button>
                </span>
            </TooltipTrigger>
            {tooltipMessage && (
                <TooltipContent>
                    <p>{tooltipMessage}</p>
                </TooltipContent>
            )}
          </Tooltip>

          {/* Cancel Button */}
          {!isCanceled && !isCompleted && (
             <AlertDialog>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <AlertDialogTrigger asChild>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                disabled={!canEdit || isCancelling}
                                className={!canEdit ? "opacity-50 cursor-not-allowed" : "text-red-600 hover:text-red-700 hover:bg-red-50"}
                            >
                                {isCancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                            </Button>
                        </AlertDialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{tooltipMessage || "Cancelar Férias"}</p>
                    </TooltipContent>
                </Tooltip>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Cancelar Férias</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja cancelar a solicitação de férias de <strong>{employeeName}</strong>?
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
          )}
       </TooltipProvider>
    </div>
  );
}
