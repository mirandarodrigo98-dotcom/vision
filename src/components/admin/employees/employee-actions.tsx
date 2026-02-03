'use client';

import { useTransition } from 'react';
import { Edit, Power } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toggleEmployeeStatus } from '@/app/actions/employees';

interface EmployeeActionsProps {
  id: string;
  isActive: boolean;
}

export function EmployeeActions({ id, isActive }: EmployeeActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleToggleStatus = () => {
    startTransition(async () => {
      const result = await toggleEmployeeStatus(id, !isActive);
      if (result.success) {
        toast.success(`Funcionário ${isActive ? 'desativado' : 'ativado'} com sucesso.`);
        router.refresh();
      } else {
        toast.error(result.error || 'Erro ao alterar status.');
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => router.push(`/admin/employees/${id}/edit`)}
            >
              <Edit className="h-4 w-4" />
              <span className="sr-only">Editar</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Editar</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleToggleStatus}
              disabled={isPending}
            >
              <Power className={`h-4 w-4 ${isActive ? 'text-red-500' : 'text-green-500'}`} />
              <span className="sr-only">{isActive ? 'Desativar' : 'Ativar'}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isActive ? 'Desativar' : 'Ativar'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
