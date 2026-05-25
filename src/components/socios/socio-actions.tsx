'use client';

import { Button } from '@/components/ui/button';
import { Pencil, UserX, Trash, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { deleteSocio, desligarSocio } from '@/app/actions/socios';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { usePendingAction } from '@/hooks/use-pending-action';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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

interface SocioActionsProps {
  socioId: string;
  companyId: string;
  isActive: boolean;
}

export function SocioActions({ socioId, companyId, isActive }: SocioActionsProps) {
  const router = useRouter();
  const { isPending, isActionPending, runAction } = usePendingAction<'desligar' | 'delete'>();

  const handleDelete = async () => {
    await runAction('delete', async () => {
      try {
        const result = await deleteSocio(socioId);
        if (result.success) {
          toast.success(result.message);
          router.refresh();
        } else {
          toast.error(result.message);
        }
      } catch (error) {
        toast.error('Erro ao excluir sócio.');
      }
    });
  };

  const handleDesligar = async () => {
    if (!companyId) {
      toast.error('Sócio não vinculado a uma empresa para desligamento.');
      return;
    }

    if (confirm('Tem certeza que deseja desligar este sócio da empresa?')) {
      await runAction('desligar', async () => {
        try {
          const result = await desligarSocio(socioId, companyId);
          if (result.success) {
            toast.success(result.message);
            router.refresh();
          } else {
            toast.error(result.message);
          }
        } catch (error) {
          toast.error('Erro ao desligar sócio.');
        }
      });
    }
  };

  return (
    <div className="flex items-center gap-2 justify-end">
      <TooltipProvider>
        {/* Editar */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm" asChild className="text-primary border-primary/20 hover:bg-primary/10">
              <Link href={`/admin/socios/${socioId}/edit`}>
                <Pencil className="h-4 w-4" />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Editar Sócio</p>
          </TooltipContent>
        </Tooltip>

        {/* Desligar */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDesligar}
              disabled={!isActive || isPending}
              className={!isActive || isPending ? "text-gray-300 border-gray-200 cursor-not-allowed" : "text-orange-600 border-orange-200 hover:bg-orange-50"}
            >
              {isActionPending('desligar') ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserX className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isActive ? 'Desligar Sócio' : 'Sócio já desligado'}</p>
          </TooltipContent>
        </Tooltip>

        {/* Excluir */}
        <AlertDialog>
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={isPending}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  {isActionPending('delete') ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash className="h-4 w-4" />}
                </Button>
              </AlertDialogTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>Excluir Sócio</p>
            </TooltipContent>
          </Tooltip>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Sócio?</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este sócio permanentemente?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
              <AlertDialogAction disabled={isPending} onClick={() => void handleDelete()} className="bg-red-600 hover:bg-red-700">
                {isActionPending('delete') ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TooltipProvider>
    </div>
  );
}
