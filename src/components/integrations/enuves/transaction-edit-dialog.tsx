'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { updateTransaction } from '@/app/actions/integrations/enuves';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';

interface TransactionEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: any;
  categories: any[];
  accounts: any[];
  companyId: string;
  onSuccess: () => void;
}

export function TransactionEditDialog({
  open,
  onOpenChange,
  transaction,
  categories = [],
  accounts = [],
  companyId,
  onSuccess,
}: TransactionEditDialogProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [description, setDescription] = useState('');
  const [value, setValue] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');

  useEffect(() => {
    if (transaction && open) {
      setDate(transaction.date ? new Date(transaction.date) : undefined);
      setDescription(transaction.description || '');
      setValue(transaction.value ? transaction.value.toString() : '');
      setCategoryId(transaction.category_id || '');
      setAccountId(transaction.account_id || '');
    }
  }, [transaction, open]);

  const handleSave = async () => {
    if (!date || !description || !value || !categoryId) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    setIsSaving(true);
    try {
      const res = await updateTransaction({
        id: transaction.id,
        date: format(date, 'yyyy-MM-dd'),
        description,
        value: parseFloat(value.replace(',', '.')), // Ensure dot decimal
        categoryId,
        accountId: accountId || null,
      }, companyId);

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Lançamento atualizado com sucesso');
        onSuccess();
        onOpenChange(false);
      }
    } catch (error) {
      toast.error('Erro ao atualizar lançamento');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Lançamento</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="date" className="text-right">
              Data
            </Label>
            <div className="col-span-3">
                <DatePicker date={date} setDate={setDate} />
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="category" className="text-right">
              Categoria
            </Label>
            <div className="col-span-3">
                <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                        {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                                {cat.description} ({cat.nature})
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="account" className="text-right">
              Conta
            </Label>
            <div className="col-span-3">
                <Select value={accountId === null ? "none" : accountId} onValueChange={(val) => setAccountId(val === "none" ? "" : val)}>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecione a conta (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">Nenhuma</SelectItem>
                        {accounts.map((acc) => (
                            <SelectItem key={acc.id} value={acc.id}>
                                {acc.description}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              Histórico
            </Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="value" className="text-right">
              Valor
            </Label>
            <Input
              id="value"
              type="number"
              step="0.01"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
