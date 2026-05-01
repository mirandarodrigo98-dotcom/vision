'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { approveTransportVoucher, cancelTransportVoucher } from '@/app/actions/transport-vouchers';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export function AdminVTActions({ vtId }: { vtId: string }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [cancelOpen, setCancelOpen] = useState(false);
    const [cancelReason, setCancelReason] = useState('');

    const handleApprove = async () => {
        if (!confirm('Deseja concluir/aprovar este pedido de VT?')) return;
        setLoading(true);
        try {
            const res = await approveTransportVoucher(vtId);
            if (res.error) toast.error(res.error);
            else {
                toast.success('Pedido concluído com sucesso!');
                router.refresh();
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async () => {
        if (!cancelReason) {
            toast.error('Informe o motivo do cancelamento.');
            return;
        }
        setLoading(true);
        try {
            const res = await cancelTransportVoucher(vtId, cancelReason);
            if (res.error) toast.error(res.error);
            else {
                toast.success('Pedido cancelado com sucesso!');
                setCancelOpen(false);
                router.refresh();
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex gap-2">
            <Button variant="outline" className="text-green-600 border-green-200 hover:bg-green-50" onClick={handleApprove} disabled={loading}>
                <CheckCircle className="h-4 w-4 mr-2" /> Concluir Pedido
            </Button>
            <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" disabled={loading}>
                        <XCircle className="h-4 w-4 mr-2" /> Cancelar Pedido
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
                        <Button variant="outline" onClick={() => setCancelOpen(false)} disabled={loading}>Voltar</Button>
                        <Button variant="destructive" onClick={handleCancel} disabled={loading}>Confirmar Cancelamento</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}