
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface CompleteAdmissionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: { employeeCode: string; esocialRegistration: string }) => Promise<void>;
  employeeName: string;
}

export function CompleteAdmissionDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  employeeName,
}: CompleteAdmissionDialogProps) {
  const [employeeCode, setEmployeeCode] = useState('');
  const [esocialRegistration, setEsocialRegistration] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!employeeCode.trim() || !esocialRegistration.trim()) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }

    setIsLoading(true);
    try {
      await onConfirm({
        employeeCode: employeeCode.trim(),
        esocialRegistration: esocialRegistration.trim(),
      });
      onOpenChange(false);
      // Reset form
      setEmployeeCode('');
      setEsocialRegistration('');
    } catch (error) {
      // Error handling is likely done in parent, but safety net here
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Concluir Admissão</DialogTitle>
          <DialogDescription>
            Para finalizar a admissão de <strong>{employeeName}</strong>, informe os dados abaixo.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="employeeCode">Código do Funcionário <span className="text-red-500">*</span></Label>
            <Input
              id="employeeCode"
              value={employeeCode}
              onChange={(e) => setEmployeeCode(e.target.value)}
              placeholder="Ex: 1234"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="esocialRegistration">Matrícula eSocial <span className="text-red-500">*</span></Label>
            <Input
              id="esocialRegistration"
              value={esocialRegistration}
              onChange={(e) => setEsocialRegistration(e.target.value)}
              placeholder="Ex: 1234567890"
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Concluindo...
                </>
              ) : (
                'Confirmar'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
