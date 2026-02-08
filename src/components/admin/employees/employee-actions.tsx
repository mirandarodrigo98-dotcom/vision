'use client';

import { useTransition } from 'react';
import { Edit, Power, Eye } from 'lucide-react';
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
    <div className="flex items-center gap-2 justify-center">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="text-[#06276b] border-[#06276b]/20 hover:bg-[#06276b]/10"
              onClick={() => router.push(`/admin/employees/${id}`)}
            >
              <Eye className="h-4 w-4" />
              <span className="sr-only">Visualizar</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Visualizar</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="text-[#06276b] border-[#06276b]/20 hover:bg-[#06276b]/10"
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
              variant="outline"
              size="sm"
              className={isActive 
                ? "text-red-600 border-red-200 hover:bg-red-50" 
                : "text-[#06276b] border-[#06276b]/20 hover:bg-[#06276b]/10"
              }
              onClick={handleToggleStatus}
              disabled={isPending}
            >
              <Power className="h-4 w-4" />
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
