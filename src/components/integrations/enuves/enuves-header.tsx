'use client';

import { Building2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

interface Company {
  id: string;
  razao_social: string;
  nome: string;
  cnpj: string;
  code: string;
}

interface EnuvesHeaderProps {
  company: Company;
}

export function EnuvesHeader({ company }: EnuvesHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleSwitchCompany = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('company_id');
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="bg-white border-b px-6 py-4 mb-6 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-4">
        <div className="bg-primary/10 p-2 rounded-lg">
          <Building2 className="h-6 w-6 text-primary" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900">{company.razao_social}</h2>
            {company.code && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                Cód: {company.code}
              </span>
            )}
          </div>
          <div className="text-sm text-muted-foreground flex gap-4">
            <span>CNPJ: {company.cnpj}</span>
            {company.nome && <span>Fantasia: {company.nome}</span>}
          </div>
        </div>
      </div>
      
      <Button variant="outline" size="sm" onClick={handleSwitchCompany} className="gap-2">
        <RefreshCw className="h-4 w-4" />
        Trocar Empresa
      </Button>
    </div>
  );
}
