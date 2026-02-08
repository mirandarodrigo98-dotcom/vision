'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Check, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { switchCompany } from '@/app/actions/client-users';
import { useRouter } from 'next/navigation';

interface Company {
  id: string;
  razao_social: string;
  cnpj: string;
}

interface CompanySelectorProps {
  activeCompany: {
    id: string;
    name: string;
    cnpj: string;
  } | null;
  companies: Company[];
  className?: string;
}

export function CompanySelector({ activeCompany, companies, className }: CompanySelectorProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSwitch = async (companyId: string) => {
    try {
      setLoading(true);
      await switchCompany(companyId);
      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error('Failed to switch company', error);
    } finally {
      setLoading(false);
    }
  };

  if (!activeCompany) return null;

  const canSwitch = companies.length > 1;

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex items-center gap-2">
        <Building2 className="h-3 w-3 text-gray-500" />
        <span className="font-semibold text-xs text-gray-900">{activeCompany.name}</span>
      </div>
      <div className="flex items-center gap-1 text-[10px] text-gray-500">
        <span>{activeCompany.cnpj}</span>
        {canSwitch && (
          <>
            <span>•</span>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <button className="text-blue-600 hover:text-blue-800 hover:underline font-medium">
                  Trocar
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Selecionar Empresa</DialogTitle>
                </DialogHeader>
                <div className="grid gap-2 py-4">
                  {companies.map((company) => (
                    <Button
                      key={company.id}
                      variant="outline"
                      className={cn(
                        "justify-start h-auto py-3 px-4",
                        activeCompany.id === company.id && "border-blue-500 bg-blue-50"
                      )}
                      onClick={() => handleSwitch(company.id)}
                      disabled={loading}
                    >
                      <Building2 className="mr-2 h-4 w-4 opacity-70" />
                      <div className="flex flex-col items-start gap-1 flex-1">
                        <span className="font-medium text-sm">{company.razao_social}</span>
                        <span className="text-xs text-muted-foreground">{company.cnpj}</span>
                      </div>
                      {activeCompany.id === company.id && (
                        <Check className="ml-auto h-4 w-4 text-blue-600" />
                      )}
                    </Button>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </div>
  );
}
