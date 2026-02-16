 'use client';
 
 import { useState } from 'react';
import { Button } from '@/components/ui/button';
 import { Eye, Pencil, Trash2, CheckCircle, Loader2 } from 'lucide-react';
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
 import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
 import { useRouter } from 'next/navigation';
 import { concludeProcess, deleteProcess } from '@/app/actions/societario-processes';
import Link from 'next/link';
import { DatePicker } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
 
 interface ProcessActionsProps {
   processId: string;
   status: string;
   type: string;
 }
 
 export function ProcessActions({ processId, status, type }: ProcessActionsProps) {
   const router = useRouter();
   const [isConcluding, setIsConcluding] = useState(false);
   const [isDeleting, setIsDeleting] = useState(false);
   const [contractDate, setContractDate] = useState<Date | undefined>();
   const [baixaDate, setBaixaDate] = useState<Date | undefined>();
   const [companyCode, setCompanyCode] = useState('');
 
   const isConcluded = status === 'CONCLUIDO';
   const isConstituicao = type === 'CONSTITUICAO';
   const isBaixa = type === 'BAIXA';
 
   const handleConclude = async () => {
     if (!contractDate) {
       toast.error('Informe a data de registro do contrato.');
       return;
     }
     if (isConstituicao && !companyCode.trim()) {
       toast.error('Informe o código da empresa.');
       return;
     }
     if (isBaixa && !baixaDate) {
       toast.error('Informe a data da baixa.');
       return;
     }
 
     const payload: {
       contractDate: string;
       companyCode?: string;
       baixaDate?: string;
     } = {
       contractDate: format(contractDate, 'yyyy-MM-dd'),
     };
 
     if (isConstituicao) {
       payload.companyCode = companyCode.trim();
     }
     if (isBaixa && baixaDate) {
       payload.baixaDate = format(baixaDate, 'yyyy-MM-dd');
     }
 
     setIsConcluding(true);
     try {
       const result = await concludeProcess(processId, payload);
       if (result?.error) toast.error(result.error);
       else {
         toast.success('Processo concluído com sucesso.');
         router.refresh();
       }
     } catch {
       toast.error('Erro ao concluir processo.');
     } finally {
       setIsConcluding(false);
     }
   };
 
   const handleDelete = async () => {
     setIsDeleting(true);
     try {
       const result = await deleteProcess(processId);
       if (result?.error) toast.error(result.error);
       else {
         toast.success('Processo excluído com sucesso.');
         router.refresh();
       }
     } catch {
       toast.error('Erro ao excluir processo.');
     } finally {
       setIsDeleting(false);
     }
   };
 
   return (
     <TooltipProvider>
       <div className="flex items-center gap-2 justify-center">
         <Tooltip>
           <TooltipTrigger asChild>
            <Link href={`/admin/societario/processos/${processId}/view`} className="inline-block">
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4" />
              </Button>
            </Link>
           </TooltipTrigger>
           <TooltipContent>
            <p>Visualizar</p>
           </TooltipContent>
         </Tooltip>
 
         <Tooltip>
           <TooltipTrigger asChild>
            <Link href={`/admin/societario/processos/${processId}/edit`} className="inline-block">
              <Button variant="outline" size="sm">
                <Pencil className="h-4 w-4" />
              </Button>
            </Link>
           </TooltipTrigger>
           <TooltipContent>
            <p>Editar</p>
           </TooltipContent>
         </Tooltip>
 
         <AlertDialog>
           <Tooltip>
             <TooltipTrigger asChild>
               <AlertDialogTrigger asChild>
                 <Button
                   variant="outline"
                   size="sm"
                   className="text-red-600 border-red-200 hover:bg-red-50"
                   disabled={isDeleting}
                 >
                   {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                 </Button>
               </AlertDialogTrigger>
             </TooltipTrigger>
             <TooltipContent>
               <p>Excluir</p>
             </TooltipContent>
           </Tooltip>
           <AlertDialogContent>
             <AlertDialogHeader>
               <AlertDialogTitle>Excluir processo</AlertDialogTitle>
               <AlertDialogDescription>Esta ação não pode ser desfeita. Confirma a exclusão?</AlertDialogDescription>
             </AlertDialogHeader>
             <AlertDialogFooter>
               <AlertDialogCancel>Voltar</AlertDialogCancel>
               <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                 Excluir
               </AlertDialogAction>
             </AlertDialogFooter>
           </AlertDialogContent>
         </AlertDialog>
 
         <AlertDialog>
           <Tooltip>
             <TooltipTrigger asChild>
               <AlertDialogTrigger asChild>
                 <Button
                   variant="outline"
                   size="sm"
                   className={isConcluded ? 'text-gray-300 border-gray-200 cursor-not-allowed' : 'text-green-600 border-green-200 hover:bg-green-50'}
                   disabled={isConcluding || isConcluded}
                 >
                   {isConcluding ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                 </Button>
               </AlertDialogTrigger>
             </TooltipTrigger>
             <TooltipContent>
               <p>Concluir</p>
             </TooltipContent>
           </Tooltip>
           <AlertDialogContent>
             <AlertDialogHeader>
               <AlertDialogTitle>Concluir processo</AlertDialogTitle>
               <AlertDialogDescription>
                 Informe os dados para registrar a conclusão deste processo.
               </AlertDialogDescription>
             </AlertDialogHeader>
             <div className="space-y-4 py-2">
               <div className="space-y-2">
                 <Label>Data do registro do contrato</Label>
                 <DatePicker date={contractDate} setDate={setContractDate} />
               </div>
               {isConstituicao && (
                 <div className="space-y-2">
                   <Label>Código da empresa</Label>
                   <Input
                     value={companyCode}
                     onChange={(e) => setCompanyCode(e.target.value)}
                     placeholder="Ex: 1"
                   />
                 </div>
               )}
               {isBaixa && (
                 <div className="space-y-2">
                   <Label>Data da baixa</Label>
                   <DatePicker date={baixaDate} setDate={setBaixaDate} />
                 </div>
               )}
             </div>
             <AlertDialogFooter>
               <AlertDialogCancel>Voltar</AlertDialogCancel>
               <AlertDialogAction onClick={handleConclude} className="bg-green-600 hover:bg-green-700">
                 Concluir
               </AlertDialogAction>
             </AlertDialogFooter>
           </AlertDialogContent>
         </AlertDialog>
       </div>
     </TooltipProvider>
   );
 }
