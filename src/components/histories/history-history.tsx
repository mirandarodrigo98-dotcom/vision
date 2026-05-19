'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { History, Loader2 } from 'lucide-react';
import { getEmployeeHistoryAudit } from '@/app/actions/audit';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface AuditLog {
  id: string;
  action: string;
  created_at: string;
  metadata: string;
  user_name: string;
  actor_email: string;
}

const ACTION_LABELS: Record<string, string> = {
  CREATE_EMPLOYEE_HISTORY: 'Solicitação criada',
  UPDATE_EMPLOYEE_HISTORY: 'Solicitação retificada',
  CANCEL_EMPLOYEE_HISTORY: 'Solicitação cancelada',
  CANCEL_EMPLOYEE_HISTORY_BY_ADMIN: 'Solicitação cancelada pela equipe',
  APPROVE_EMPLOYEE_HISTORY: 'Solicitação concluída',
};

export function HistoryHistory({ historyId }: { historyId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    if (!open) return;

    setLoading(true);
    getEmployeeHistoryAudit(historyId)
      .then((result) => {
        if ('success' in result && result.success && result.logs) {
          setLogs(result.logs);
        }
      })
      .finally(() => setLoading(false));
  }, [historyId, open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-amber-600 border-amber-200 hover:bg-amber-50"
              >
                <History className="h-4 w-4" />
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Histórico de movimentações</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Histórico da Solicitação</DialogTitle>
          <DialogDescription>
            Acompanhe as movimentações registradas nesta solicitação.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto mt-4 pr-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : logs.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-4">
              Nenhum registro encontrado.
            </p>
          ) : (
            <div className="space-y-6 relative border-l border-gray-200 ml-3 pl-6 py-2">
              {logs.map((log) => (
                <div key={log.id} className="relative">
                  <span className="absolute -left-[31px] top-1 h-3 w-3 rounded-full bg-gray-200 border-2 border-white ring-1 ring-gray-100" />
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-gray-900">
                      {ACTION_LABELS[log.action] || log.action}
                    </span>
                    <span className="text-xs text-gray-500">
                      {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm')}
                    </span>
                    <span className="text-xs text-gray-400">
                      {log.user_name || log.actor_email}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
