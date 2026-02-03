'use client';

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { History, Loader2 } from "lucide-react";
import { getAdmissionHistory } from '@/app/actions/audit';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface AuditLog {
    id: string;
    action: string;
    created_at: string;
    metadata: string;
    user_name: string;
    actor_email: string;
}

const ACTION_LABELS: Record<string, string> = {
    'CREATE_ADMISSION': 'Criação da Admissão',
    'UPDATE_ADMISSION': 'Retificação da Admissão',
    'CANCEL_ADMISSION': 'Cancelamento da Admissão',
    'EMAIL_SENT': 'E-mail Enviado',
    'EMAIL_FAILED': 'Falha no E-mail',
};

export function AdmissionHistory({ admissionId }: { admissionId: string }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState<AuditLog[]>([]);

    useEffect(() => {
        if (open) {
            setLoading(true);
            getAdmissionHistory(admissionId)
                .then(result => {
                    if (result.success && result.logs) {
                        setLogs(result.logs);
                    }
                })
                .finally(() => setLoading(false));
        }
    }, [open, admissionId]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <DialogTrigger asChild>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                            >
                                <History className="h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Movimentações</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
            
            <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Histórico da Admissão</DialogTitle>
                    <DialogDescription>
                        Movimentações e ações registradas.
                    </DialogDescription>
                </DialogHeader>
                
                <div className="flex-1 overflow-y-auto mt-4 pr-2">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                        </div>
                    ) : logs.length === 0 ? (
                        <p className="text-center text-sm text-muted-foreground py-4">Nenhum registro encontrado.</p>
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
                                            {format(new Date(log.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                                        </span>
                                        <span className="text-xs text-gray-400">
                                            Por: {log.user_name || log.actor_email || 'Sistema'}
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
