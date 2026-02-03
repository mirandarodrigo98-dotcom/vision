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
import { cancelTransfer, approveTransfer } from '@/app/actions/transfers';
import { toast } from 'sonner';
import { TransferHistory } from './transfer-history';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface TransferActionsProps {
  transferId: string;
  transferDate: string;
  status: string;
  employeeName: string;
  isAdmin?: boolean;
  basePath?: string;
}

export function TransferActions({ transferId, transferDate, status, employeeName, isAdmin = false, basePath = '/app' }: TransferActionsProps) {
  const router = useRouter();
  const [isCancelling, setIsCancelling] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  // Check deadline: 1 day before transfer date (Assuming same rule as admission)
  const trDate = new Date(transferDate);
  const deadline = new Date(trDate);
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
      const result = await cancelTransfer(transferId);
      if (result.success) {
        toast.success('Transferência cancelada com sucesso.');
        router.refresh();
      } else {
        toast.error(result.error || 'Erro ao cancelar transferência.');
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
      const result = await approveTransfer(transferId);
      if (result.success) {
        toast.success('Transferência aprovada com sucesso.');
        router.refresh();
      } else {
        toast.error(result.error || 'Erro ao aprovar transferência.');
      }
    } catch (error) {
      toast.error('Erro ao processar aprovação.');
    } finally {
      setIsApproving(false);
    }
  };

  const handleRectify = () => {
    if (!canEdit) return;
    router.push(`${basePath}/transfers/${transferId}/edit`);
  };

  const getTooltipMessage = () => {
    if (isCanceled) return "Transferência cancelada";
    if (isCompleted) return "Transferência concluída";
    if (isExpired && !isAdmin) return "Prazo de retificação/cancelamento expirado";
    return null;
  };

  const tooltipMessage = getTooltipMessage();

  return (
    <div className="flex items-center gap-2 justify-center">
       {/* History is always visible */}
       <TransferHistory transferId={transferId} />

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
                    <p>Concluir Transferência</p>
                  </TooltipContent>
                </Tooltip>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Concluir Transferência</AlertDialogTitle>
                    <AlertDialogDescription>
                      Confirma que a transferência de <strong>{employeeName}</strong> foi realizada?
                      <br/><br/>
                      Ao confirmar, o funcionário será movido automaticamente para a empresa de destino no sistema.
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

          {/* Rectify Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="inline-block">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleRectify} 
                  disabled={!canEdit}
                  className={`
                    ${!canEdit ? 'opacity-50 cursor-not-allowed' : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'}
                  `}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{tooltipMessage || "Retificar"}</p>
            </TooltipContent>
          </Tooltip>

          {/* Cancel Button */}
          {!isCanceled && !isCompleted && (isAdmin || !isExpired) && (
             <AlertDialog>
                <Tooltip>
                  <TooltipTrigger asChild>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          disabled={isCancelling}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          {isCancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                        </Button>
                      </AlertDialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Cancelar Transferência</p>
                  </TooltipContent>
                </Tooltip>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancelar Transferência</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja cancelar a solicitação de transferência de <strong>{employeeName}</strong>?
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
