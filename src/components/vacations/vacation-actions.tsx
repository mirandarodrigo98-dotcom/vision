'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Eye, Ban, Loader2, CheckCircle } from 'lucide-react';
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
import { VacationHistory } from './vacation-history';
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
  
  // Admin/Operator CAN cancel. Client can cancel if not expired.
  const canCancel = !isCanceled && !isCompleted && (isAdmin || !isExpired);
  const canApprove = isAdmin && status === 'SUBMITTED';

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      const result = await cancelVacation(vacationId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Férias canceladas com sucesso.');
        router.refresh();
      }
    } catch (error) {
      toast.error('Erro ao cancelar férias.');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      const result = await approveVacation(vacationId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Férias aprovadas com sucesso.');
        router.refresh();
      }
    } catch (error) {
      toast.error('Erro ao aprovar férias.');
    } finally {
      setIsApproving(false);
    }
  };

  const handleView = () => {
    if (isAdmin) {
      router.push(`/admin/vacations/${vacationId}/view`);
    } else {
      router.push(`/app/vacations/${vacationId}/view`);
    }
  };

  const getTooltipMessage = () => {
    if (isCanceled) return "Solicitação cancelada";
    if (isCompleted) return "Solicitação concluída";
    if (isExpired && !isAdmin) return "Prazo de retificação/cancelamento expirado";
    return null;
  };

  const tooltipMessage = getTooltipMessage();

  return (
    <div className="flex items-center gap-2 justify-center">
       {/* History is always visible */}
       <VacationHistory vacationId={vacationId} />

       <TooltipProvider>
          {/* Approve Button (Admin Only) */}
          {canApprove && (
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

          {/* View Button */}
          <Tooltip>
            <TooltipTrigger asChild>
                <span>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleView}
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                    >
                        <Eye className="h-4 w-4" />
                    </Button>
                </span>
            </TooltipTrigger>
            <TooltipContent>
                <p>Visualizar Detalhes</p>
            </TooltipContent>
          </Tooltip>

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
          ) : (
             <Tooltip>
               <TooltipTrigger asChild>
                 <div className="inline-block">
                   <Button 
                     variant="ghost" 
                     size="icon" 
                     disabled
                     className="text-gray-300 cursor-not-allowed"
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
