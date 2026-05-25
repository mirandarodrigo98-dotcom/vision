'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { approveTransportVoucher, cancelTransportVoucher } from '@/app/actions/transport-vouchers';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { usePendingAction } from '@/hooks/use-pending-action';

export function AdminVTActions({ vtId }: { vtId: string }) {
    const router = useRouter();
    const [cancelOpen, setCancelOpen] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const { isPending, isActionPending, runAction } = usePendingAction<'approve' | 'cancel'>();

    const handleApprove = async () => {
        if (!confirm('Deseja concluir/aprovar este pedido de VT?')) return;
        await runAction('approve', async () => {
            try {
                const res = await approveTransportVoucher(vtId);
                if (res.error) toast.error(res.error);
                else {
                    toast.success('Pedido concluído com sucesso!');
                    router.refresh();
                }
            } finally {
            }
        });
    };

    const handleCancel = async () => {
        if (!cancelReason) {
            toast.error('Informe o motivo do cancelamento.');
            return;
        }
        await runAction('cancel', async () => {
            try {
                const res = await cancelTransportVoucher(vtId, cancelReason);
                if (res.error) toast.error(res.error);
                else {
                    toast.success('Pedido cancelado com sucesso!');
                    setCancelOpen(false);
                    router.refresh();
                }
            } finally {
            }
        });
    };

    return (
        <div className="flex gap-2">
            <Button variant="outline" className="text-green-600 border-green-200 hover:bg-green-50" onClick={() => void handleApprove()} disabled={isPending}>
                {isActionPending('approve') ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />} Concluir Pedido
            </Button>
            <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" disabled={isPending}>
                        {isActionPending('cancel') ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />} Cancelar Pedido
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Cancelar Pedido de VT</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Motivo do Cancelamento</Label>
                            <Textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="Informe ao cliente por que o pedido foi cancelado..." />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCancelOpen(false)} disabled={isPending}>Voltar</Button>
                        <Button variant="destructive" onClick={() => void handleCancel()} disabled={isPending}>
                            {isActionPending('cancel') ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                            Confirmar Cancelamento
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
