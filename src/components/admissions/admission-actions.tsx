'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Pencil, Ban, Loader2 } from 'lucide-react';
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
import { cancelAdmission } from '@/app/actions/admissions';
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
  const canEdit = !isCanceled && (isAdmin || !isExpired);

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

  const handleRectify = () => {
    if (!canEdit) return;
    if (isAdmin) {
      router.push(`/admin/admissions/${admissionId}/edit`);
    } else {
      router.push(`/app/admissions/${admissionId}/edit`);
    }
  };

  const getTooltipMessage = () => {
    if (isAdmin) return "Ações administrativas";
    if (isCanceled) return "Admissão cancelada";
    if (isExpired) return "Prazo de retificação/cancelamento expirado";
    return null;
  };

  const tooltipMessage = getTooltipMessage();

  return (
    <div className="flex items-center gap-2 justify-center">
       {/* History is always visible */}
       <AdmissionHistory admissionId={admissionId} />

       <TooltipProvider>
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
                    ${canEdit ? "text-blue-600 hover:text-blue-800 hover:bg-blue-50" : "text-gray-300 cursor-not-allowed"}
                  `}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{!canEdit && tooltipMessage ? tooltipMessage : "Retificar"}</p>
            </TooltipContent>
          </Tooltip>

          {/* Cancel Button */}
          {canEdit ? (
             <AlertDialog>
               <Tooltip>
                 <TooltipTrigger asChild>
                   <AlertDialogTrigger asChild>
                     <Button 
                       variant="ghost" 
                       size="icon" 
                       className="text-red-600 hover:text-red-800 hover:bg-red-50"
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
                     disabled={true}
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
