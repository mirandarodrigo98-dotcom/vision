'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { listLogs } from '@/app/actions/societario';

export function SocietarioHistory({ companyId }: { companyId: string }) {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      listLogs(companyId).then(r => setLogs(r.logs || []));
    }
  }, [open, companyId]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Histórico</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Histórico de Alterações</DialogTitle>
        </DialogHeader>
        <div className="border rounded-md bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Evento</TableHead>
                <TableHead>Campo</TableHead>
                <TableHead>Antes</TableHead>
                <TableHead>Depois</TableHead>
                <TableHead>Motivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>{l.created_at}</TableCell>
                  <TableCell>{l.tipo_evento}</TableCell>
                  <TableCell>{l.campo_alterado || '-'}</TableCell>
                  <TableCell>{l.valor_anterior || '-'}</TableCell>
                  <TableCell>{l.valor_novo || '-'}</TableCell>
                  <TableCell>{l.motivo || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
