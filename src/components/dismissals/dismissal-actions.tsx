'use client';

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
import { usePendingAction } from '@/hooks/use-pending-action';
import { canRectifyDismissal } from '@/lib/dismissal-dates';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface DismissalActionsProps {
  dismissalId: string;
  paymentDate?: string | null;
  status: string;
  employeeName: string;
  isAdmin?: boolean;
  basePath?: string;
}

export function DismissalActions({ dismissalId, paymentDate, status, employeeName, isAdmin = false, basePath = '/admin' }: DismissalActionsProps) {
  const router = useRouter();
  const { isPending, isActionPending, runAction } = usePendingAction<'cancel' | 'approve'>();
  const isExpired = !canRectifyDismissal(paymentDate);
  const isCanceled = status === 'CANCELLED';
  const isCompleted = status === 'COMPLETED';
  
  // Admin/Operator CAN cancel. Client can cancel even if expired.
  const canCancel = !isCanceled && !isCompleted;
  const canEdit = !isCanceled && !isCompleted && !isExpired;
  const canApprove = isAdmin && status === 'SUBMITTED';

  const handleCancel = async () => {
    await runAction('cancel', async () => {
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
      }
    });
  };

  const handleApprove = async () => {
    await runAction('approve', async () => {
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
      }
    });
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
    if (isExpired) return "Prazo de retificação expirado após a data prevista de pagamento";
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
                    <div className="inline-block">
                      <AlertDialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            disabled={isPending}
                            className="text-green-600 border-green-200 hover:bg-green-50"
                          >
                            {isActionPending('approve') ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                          </Button>
                      </AlertDialogTrigger>
                    </div>
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
                    <AlertDialogAction onClick={handleApprove} className="bg-primary hover:bg-primary/90">
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
                        disabled={isPending}
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
                  disabled={!canEdit || isPending}
                  className={!canEdit || isPending ? "text-gray-300 border-gray-200 cursor-not-allowed" : "text-primary border-primary/20 hover:bg-primary/10"}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{
                isCanceled ? "Rescisão cancelada" :
                isCompleted ? "Rescisão concluída" :
                isExpired ? "Prazo de retificação expirado após a data prevista de pagamento" :
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
                      <div className="inline-block">
                        <AlertDialogTrigger asChild>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-red-600 border-red-200 hover:bg-red-50"
                                disabled={isPending}
                            >
                                {isActionPending('cancel') ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                            </Button>
                        </AlertDialogTrigger>
                      </div>
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
                        <AlertDialogCancel disabled={isPending}>Voltar</AlertDialogCancel>
                        <AlertDialogAction disabled={isPending} onClick={() => void handleCancel()} className="bg-red-600 hover:bg-red-700">
                            {isActionPending('cancel') ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
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
