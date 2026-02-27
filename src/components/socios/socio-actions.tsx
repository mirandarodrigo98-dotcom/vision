'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Pencil, UserX, Trash, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { deleteSocio, desligarSocio } from '@/app/actions/socios';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
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
  const [isDesligando, setIsDesligando] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
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
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDesligar = async () => {
    if (!companyId) {
      toast.error('Sócio não vinculado a uma empresa para desligamento.');
      return;
    }

    if (confirm('Tem certeza que deseja desligar este sócio da empresa?')) {
      setIsDesligando(true);
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
      } finally {
        setIsDesligando(false);
      }
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
              disabled={!isActive || isDesligando}
              className={!isActive ? "text-gray-300 border-gray-200 cursor-not-allowed" : "text-orange-600 border-orange-200 hover:bg-orange-50"}
            >
              {isDesligando ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserX className="h-4 w-4" />}
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
                  disabled={isDeleting}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash className="h-4 w-4" />}
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
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TooltipProvider>
    </div>
  );
}
