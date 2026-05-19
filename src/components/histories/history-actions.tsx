'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Ban, CheckCircle, Eye, Loader2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { HistoryHistory } from './history-history';
import { approveEmployeeHistory, cancelEmployeeHistory } from '@/app/actions/histories';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface HistoryActionsProps {
  historyId: string;
  status: string;
  employeeName: string;
  isAdmin?: boolean;
}

export function HistoryActions({
  historyId,
  status,
  employeeName,
  isAdmin = false,
}: HistoryActionsProps) {
  const router = useRouter();
  const [isCancelling, setIsCancelling] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  const isCancelled = status === 'CANCELLED';
  const isCompleted = status === 'COMPLETED';
  const canEdit = !isAdmin && !isCancelled && !isCompleted;
  const canCancel = !isCancelled && !isCompleted;
  const canApprove = isAdmin && (status === 'SUBMITTED' || status === 'RECTIFIED');

  const handleView = () => {
    router.push(isAdmin ? `/admin/histories/${historyId}/view` : `/app/histories/${historyId}/view`);
  };

  const handleEdit = () => {
    router.push(`/app/histories/${historyId}/edit`);
  };

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      const result = await cancelEmployeeHistory(historyId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Solicitação cancelada com sucesso.');
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
      const result = await approveEmployeeHistory(historyId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Solicitação concluída com sucesso.');
        router.refresh();
      }
    } catch (error) {
      toast.error('Erro ao concluir solicitação.');
    } finally {
      setIsApproving(false);
    }
  };

  const disabledMessage = isCancelled
    ? 'Solicitação cancelada'
    : isCompleted
      ? 'Solicitação concluída'
      : 'Ação indisponível';

  return (
    <div className="flex items-center gap-2 justify-center">
      <HistoryHistory historyId={historyId} />

      <TooltipProvider>
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
                  <p>Concluir solicitação</p>
                </TooltipContent>
              </Tooltip>

              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Concluir solicitação</AlertDialogTitle>
                  <AlertDialogDescription>
                    Confirma a conclusão da solicitação de <strong>{employeeName}</strong>?
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
                <p>{disabledMessage}</p>
              </TooltipContent>
            </Tooltip>
          )
        )}

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
            <p>Visualizar detalhes</p>
          </TooltipContent>
        </Tooltip>

        {!isAdmin && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="inline-block">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEdit}
                  disabled={!canEdit}
                  className={!canEdit ? 'text-gray-300 border-gray-200 cursor-not-allowed' : 'text-primary border-primary/20 hover:bg-primary/10'}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{canEdit ? 'Retificar solicitação' : disabledMessage}</p>
            </TooltipContent>
          </Tooltip>
        )}

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
                <p>Cancelar solicitação</p>
              </TooltipContent>
            </Tooltip>

            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancelar solicitação</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja cancelar a solicitação de <strong>{employeeName}</strong>?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Voltar</AlertDialogCancel>
                <AlertDialogAction onClick={handleCancel} className="bg-red-600 hover:bg-red-700">
                  Confirmar cancelamento
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
              <p>{disabledMessage}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </TooltipProvider>
    </div>
  );
}
