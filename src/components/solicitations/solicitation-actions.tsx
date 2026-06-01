'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Ban, CheckCircle, Eye, Loader2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { approveSolicitation, cancelSolicitation } from '@/app/actions/solicitations';
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

interface SolicitationActionsProps {
  solicitationId: string;
  status: string;
  subject: string;
  isAdmin?: boolean;
}

export function SolicitationActions({
  solicitationId,
  status,
  subject,
  isAdmin = false,
}: SolicitationActionsProps) {
  const router = useRouter();
  const [isCancelling, setIsCancelling] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  const isCancelled = status === 'CANCELLED';
  const isCompleted = status === 'COMPLETED';
  const canEdit = !isAdmin && !isCancelled && !isCompleted;
  const canCancel = !isCancelled && !isCompleted;
  const canApprove = isAdmin && (status === 'SUBMITTED' || status === 'RECTIFIED');

  const handleView = () => {
    router.push(isAdmin ? `/admin/solicitations/${solicitationId}/view` : `/app/solicitations/${solicitationId}/view`);
  };

  const handleEdit = () => {
    router.push(`/app/solicitations/${solicitationId}/edit`);
  };

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      const result = await cancelSolicitation(solicitationId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Solicitacao cancelada com sucesso.');
        router.refresh();
      }
    } catch (error) {
      toast.error('Erro ao cancelar solicitacao.');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      const result = await approveSolicitation(solicitationId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Solicitacao concluida com sucesso.');
        router.refresh();
      }
    } catch (error) {
      toast.error('Erro ao concluir solicitacao.');
    } finally {
      setIsApproving(false);
    }
  };

  const disabledMessage = isCancelled
    ? 'Solicitacao cancelada'
    : isCompleted
      ? 'Solicitacao concluida'
      : 'Acao indisponivel';

  return (
    <div className="flex items-center justify-center gap-2">
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
                      className="border-green-200 text-green-600 hover:bg-green-50"
                    >
                      {isApproving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                    </Button>
                  </AlertDialogTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Concluir solicitacao</p>
                </TooltipContent>
              </Tooltip>

              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Concluir solicitacao</AlertDialogTitle>
                  <AlertDialogDescription>
                    Confirma a conclusao da solicitacao <strong>{subject}</strong>?
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
                    className="cursor-not-allowed border-gray-200 text-gray-300"
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
                className="border-primary/20 text-primary hover:bg-primary/10"
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
                  className={!canEdit ? 'cursor-not-allowed border-gray-200 text-gray-300' : 'border-primary/20 text-primary hover:bg-primary/10'}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{canEdit ? 'Retificar solicitacao' : disabledMessage}</p>
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
                    className="border-red-200 text-red-600 hover:bg-red-50"
                    disabled={isCancelling}
                  >
                    {isCancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                  </Button>
                </AlertDialogTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>Cancelar solicitacao</p>
              </TooltipContent>
            </Tooltip>

            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancelar solicitacao</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja cancelar a solicitacao <strong>{subject}</strong>?
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
                  className="cursor-not-allowed border-gray-200 text-gray-300"
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
