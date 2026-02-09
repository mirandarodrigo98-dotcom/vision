'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Ban, Loader2, Eye, CheckCircle, Pencil } from 'lucide-react';
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
import { CompleteAdmissionDialog } from './complete-admission-dialog';
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
  createdByUserId?: string;
  currentUserId?: string;
}

export function AdmissionActions({ 
  admissionId, 
  admissionDate, 
  status, 
  employeeName, 
  isAdmin = false,
  createdByUserId,
  currentUserId
}: AdmissionActionsProps) {
  const router = useRouter();
  const [isCancelling, setIsCancelling] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);

  // Check deadline: 1 day before admission date
  // Fix: Parse YYYY-MM-DD manually to ensure local time is used and avoid UTC timezone shifts
  const [year, month, day] = admissionDate.split('-').map(Number);
  const admDate = new Date(year, month - 1, day);
  
  const deadline = new Date(admDate);
  deadline.setDate(deadline.getDate() - 1);
  
  // Reset time for comparison
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  // No need to reset deadline hours as it was created from year/month/day (00:00 local)
  
  const isExpired = now > deadline;
  const isCanceled = status === 'CANCELLED';
  const isCompleted = status === 'COMPLETED';
  
  // Permission checks
  // User should have access if they have permissions, regardless of ownership
  // Ownership check removed as requested
  const hasPermission = isAdmin || true; 

  const canCancel = !isCanceled && !isCompleted && (isAdmin || !isExpired);
  const canApprove = isAdmin && !isCanceled && !isCompleted;
  const canEdit = !isCanceled && !isCompleted && (isAdmin || !isExpired);
  const canView = true; // View is allowed for anyone with access to the list

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

  const handleApprove = async (data: { employeeCode: string; esocialRegistration: string }) => {
    setIsApproving(true);
    try {
      const result = await completeAdmission(admissionId, data);
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

  const handleEdit = () => {
    if (isAdmin) {
      router.push(`/admin/admissions/${admissionId}/edit`);
    } else {
      router.push(`/app/admissions/${admissionId}/edit`);
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
       
       <CompleteAdmissionDialog 
          isOpen={showCompleteDialog} 
          onOpenChange={setShowCompleteDialog}
          onConfirm={handleApprove}
          employeeName={employeeName}
       />

       <TooltipProvider>
          {/* Approve Button (Admin Only) */}
          {isAdmin && (
            canApprove ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          disabled={isApproving}
                          onClick={() => setShowCompleteDialog(true)}
                          className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        >
                          {isApproving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                        </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Concluir/Aprovar Admissão</p>
                  </TooltipContent>
                </Tooltip>
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
                  <p>{isCanceled ? "Admissão cancelada" : isCompleted ? "Admissão já concluída" : "Ação indisponível"}</p>
                </TooltipContent>
              </Tooltip>
            )
          )}

          {/* View Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="inline-block">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleView} 
                  disabled={!canView}
                  className={!canView ? "text-gray-300 border-gray-200 cursor-not-allowed" : "text-primary border-primary/20 hover:bg-primary/10"}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{!canView ? "Sem permissão para visualizar" : "Visualizar Detalhes"}</p>
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
                isCanceled ? "Admissão cancelada" :
                isCompleted ? "Admissão concluída" :
                (!isAdmin && isExpired) ? "Prazo de retificação expirado" :
                "Retificar Admissão"
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
