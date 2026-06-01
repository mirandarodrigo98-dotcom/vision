'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface SolicitationTypeOption {
  id: string;
  name: string;
  description?: string | null;
  department_name: string;
}

interface SolicitationTypeSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestTypes: SolicitationTypeOption[];
}

export function SolicitationTypeSelectorDialog({
  open,
  onOpenChange,
  requestTypes,
}: SolicitationTypeSelectorDialogProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const filteredTypes = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return requestTypes;

    return requestTypes.filter((type) =>
      `${type.name} ${type.description || ''} ${type.department_name}`
        .toLowerCase()
        .includes(normalized)
    );
  }, [query, requestTypes]);

  const handleSelect = (requestTypeId: string) => {
    onOpenChange(false);
    setQuery('');
    router.push(`/app/solicitations/new?type=${requestTypeId}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nova Solicitacao</DialogTitle>
          <DialogDescription>
            Escolha o tipo de solicitacao. A lista segue em ordem alfabetica e cada item ja esta vinculado ao departamento responsavel.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar tipo de solicitacao..."
            className="pl-9"
          />
        </div>

        <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
          {filteredTypes.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
              Nenhum tipo de solicitacao encontrado.
            </div>
          ) : (
            filteredTypes.map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => handleSelect(type.id)}
                className="w-full rounded-lg border p-4 text-left transition-colors hover:border-primary hover:bg-primary/5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="font-medium">{type.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Departamento: {type.department_name}
                    </p>
                    {type.description ? (
                      <p className="text-sm text-muted-foreground">{type.description}</p>
                    ) : null}
                  </div>
                  <Button type="button" variant="outline" size="sm" className="pointer-events-none">
                    Selecionar
                  </Button>
                </div>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
