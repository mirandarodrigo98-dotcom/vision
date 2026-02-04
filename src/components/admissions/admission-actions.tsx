'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Ban, Loader2, Eye, CheckCircle } from 'lucide-react';
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
import { cancelAdmission, completeAdmission } from '@/app/actions/admissions';
import { toast } from 'sonner';
import { AdmissionHistory } from './admission-history';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface AdmissionActionsProps {
  admissionId: string;
  admissionDate: string;
  status: string;
  employeeName: string;
  isAdmin?: boolean;
}

export function AdmissionActions({ admissionId, admissionDate, status, employeeName, isAdmin = false }: AdmissionActionsProps) {
  const router = useRouter();
  const [isCancelling, setIsCancelling] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  // Check deadline: 1 day before admission date
  const admDate = new Date(admissionDate);
  const deadline = new Date(admDate);
  deadline.setDate(deadline.getDate() - 1);
  
  // Reset time for comparison
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  deadline.setHours(0, 0, 0, 0);
  
  const isExpired = now > deadline;
  const isCanceled = status === 'CANCELLED';
  const isCompleted = status === 'COMPLETED';
  const canCancel = !isCanceled && !isCompleted && (isAdmin || !isExpired);
  const canApprove = isAdmin && !isCanceled && !isCompleted;

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      const result = await cancelAdmission(admissionId);
      if (result.success) {
        toast.success('Admissão cancelada com sucesso.');
        router.refresh();
      } else {
        toast.error(result.error || 'Erro ao cancelar admissão.');
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
      const result = await completeAdmission(admissionId);
      if (result.success) {
        toast.success('Admissão concluída com sucesso!');
        router.refresh();
      } else {
        toast.error(result.error || 'Erro ao concluir admissão.');
      }
    } catch (error) {
      toast.error('Erro ao processar solicitação.');
    } finally {
      setIsApproving(false);
    }
  };

  const handleView = () => {
    if (isAdmin) {
      router.push(`/admin/admissions/${admissionId}/view`);
    } else {
      router.push(`/app/admissions/${admissionId}/view`);
    }
  };

  const getTooltipMessage = () => {
    if (isAdmin) return "Ações administrativas";
    if (isCanceled) return "Admissão cancelada";
    if (isExpired) return "Prazo de cancelamento expirado";
    return null;
  };

  const tooltipMessage = getTooltipMessage();

  return (
    <div className="flex items-center gap-2 justify-center">
       {/* History is always visible */}
       <AdmissionHistory admissionId={admissionId} />

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
                    <p>Concluir/Aprovar Admissão</p>
                  </TooltipContent>
                </Tooltip>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Concluir Admissão</AlertDialogTitle>
                    <AlertDialogDescription>
                      Confirma a aprovação da admissão de <strong>{employeeName}</strong>?
                      <br/>
                      Um novo cadastro de funcionário será criado automaticamente.
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
              <div className="inline-block">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleView} 
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
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
                   <p>Cancelar</p>
                 </TooltipContent>
               </Tooltip>
               <AlertDialogContent>
                 <AlertDialogHeader>
                   <AlertDialogTitle>Cancelar Admissão?</AlertDialogTitle>
                   <AlertDialogDescription>
                    Tem certeza que deseja cancelar a admissão de "{employeeName}"?
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
