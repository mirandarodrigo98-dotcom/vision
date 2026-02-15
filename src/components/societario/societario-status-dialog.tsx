'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { changeStatus } from '@/app/actions/societario';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function SocietarioStatusDialog({ companyId }: { companyId: string }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<'EM_REGISTRO'|'ATIVA'|'INATIVA'>('EM_REGISTRO');
  const [motivo, setMotivo] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if ((status === 'ATIVA' || status === 'INATIVA') && motivo.trim().length < 3) {
      toast.error('Informe um motivo válido para mudar o status');
      return;
    }
    setLoading(true);
    try {
      const res = await changeStatus(companyId, status, motivo);
      if (res?.success) {
        toast.success('Status atualizado');
        setOpen(false);
      } else {
        toast.error('Falha ao atualizar status');
      }
    } catch {
      toast.error('Erro ao atualizar status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Mudar Status</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mudar Status</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EM_REGISTRO">Em Registro</SelectItem>
                <SelectItem value="ATIVA">Ativa</SelectItem>
                <SelectItem value="INATIVA">Inativa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Motivo</Label>
            <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Descreva o motivo (obrigatório para ATIVA/INATIVA)" />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
