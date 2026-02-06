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
import { cancelDismissal, approveDismissal } from '@/app/actions/dismissals';
import { toast } from 'sonner';
import { DismissalHistory } from './dismissal-history';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface DismissalActionsProps {
  dismissalId: string;
  dismissalDate: string;
  status: string;
  employeeName: string;
  isAdmin?: boolean;
  basePath?: string;
}

export function DismissalActions({ dismissalId, dismissalDate, status, employeeName, isAdmin = false, basePath = '/admin' }: DismissalActionsProps) {
  const router = useRouter();
  const [isCancelling, setIsCancelling] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  // Check deadline: 1 day before dismissal date
  const disDate = new Date(dismissalDate);
  const deadline = new Date(disDate);
  deadline.setDate(deadline.getDate() - 1);
  
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  deadline.setHours(0, 0, 0, 0);
  
  const isExpired = now > deadline;
  const isCanceled = status === 'CANCELLED';
  const isCompleted = status === 'COMPLETED';
  
  // Admin/Operator CAN cancel. Client can cancel if not expired.
  const canCancel = !isCanceled && !isCompleted && (isAdmin || !isExpired);
  const canEdit = !isCanceled && !isCompleted && (isAdmin || !isExpired);
  const canApprove = isAdmin && status === 'SUBMITTED';

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      const result = await cancelDismissal(dismissalId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Rescisão cancelada com sucesso.');
        router.refresh();
      }
    } catch (error) {
      toast.error('Erro ao cancelar rescisão.');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      const result = await approveDismissal(dismissalId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Rescisão aprovada com sucesso.');
        router.refresh();
      }
    } catch (error) {
      toast.error('Erro ao aprovar rescisão.');
    } finally {
      setIsApproving(false);
    }
  };

  const handleView = () => {
    if (isAdmin) {
      router.push(`/admin/dismissals/${dismissalId}/view`);
    } else {
      router.push(`/app/dismissals/${dismissalId}/view`);
    }
  };

  const handleEdit = () => {
    if (isAdmin) {
      router.push(`/admin/dismissals/${dismissalId}/edit`);
    } else {
      router.push(`/app/dismissals/${dismissalId}/edit`);
    }
  };

  const getTooltipMessage = () => {
    if (isCanceled) return "Rescisão cancelada";
    if (isCompleted) return "Rescisão concluída";
    if (isExpired && !isAdmin) return "Prazo de retificação/cancelamento expirado";
    return null;
  };

  const tooltipMessage = getTooltipMessage();

  return (
    <div className="flex items-center gap-2 justify-center">
       
       <DismissalHistory dismissalId={dismissalId} />

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
                    <p>Concluir/Aprovar Rescisão</p>
                  </TooltipContent>
                </Tooltip>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Concluir Rescisão</AlertDialogTitle>
                    <AlertDialogDescription>
                      Confirma a aprovação da rescisão de <strong>{employeeName}</strong>?
                      <br/>
                      O funcionário será marcado como "Desligado".
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
                  <p>{isCanceled ? "Rescisão cancelada" : isCompleted ? "Rescisão já concluída" : "Ação indisponível"}</p>
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
                isCanceled ? "Rescisão cancelada" :
                isCompleted ? "Rescisão concluída" :
                (!isAdmin && isExpired) ? "Prazo de retificação expirado" :
                "Retificar Rescisão"
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
                        <p>Cancelar Rescisão</p>
                    </TooltipContent>
                </Tooltip>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Cancelar Rescisão</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja cancelar a solicitação de rescisão de <strong>{employeeName}</strong>?
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
