'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { searchEnuvesCompanies } from '@/app/actions/integrations/companies';
import { useDebounce } from '@/hooks/use-debounce';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

export function EnuvesCompanySelector() {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [companies, setCompanies] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const debouncedSearch = useDebounce(search, 300);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  React.useEffect(() => {
    async function fetchCompanies() {
      if (debouncedSearch.length < 2) {
        setCompanies([]);
        return;
      }
      setLoading(true);
      const results = await searchEnuvesCompanies(debouncedSearch);
      setCompanies(results);
      setLoading(false);
    }
    fetchCompanies();
  }, [debouncedSearch]);

  const handleSelect = (companyId: string) => {
    setValue(companyId);
    setOpen(false);
    
    // Update URL with company_id
    const params = new URLSearchParams(searchParams);
    params.set('company_id', companyId);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Selecione uma Empresa</h2>
        <p className="text-muted-foreground">
          Escolha a empresa para realizar a movimentação no ENUVES.
        </p>
      </div>
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[400px] justify-between h-12"
          >
            {value
              ? companies.find((company) => company.id === value)?.razao_social || "Selecione a empresa..."
              : "Buscar empresa por Razão Social..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <div className="flex flex-col">
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <Input
                placeholder="Digite a Razão Social..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none border-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            
            <ScrollArea className="max-h-[300px] overflow-y-auto">
              <div className="p-1">
                {loading && <div className="py-6 text-center text-sm text-muted-foreground">Buscando...</div>}
                
                {!loading && companies.length === 0 && search.length >= 2 && (
                  <div className="py-6 text-center text-sm">Nenhuma empresa encontrada.</div>
                )}
                
                {!loading && companies.length === 0 && search.length < 2 && (
                  <div className="py-6 text-center text-sm text-muted-foreground">Digite pelo menos 2 caracteres</div>
                )}

                {companies.map((company) => (
                  <div
                    key={company.id}
                    onClick={() => handleSelect(company.id)}
                    className={cn(
                      "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-3 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                      value === company.id && "bg-accent text-accent-foreground"
                    )}
                  >
                    <div className="w-full">
                      <div className="flex w-full justify-between items-center">
                        <span className="font-medium">{company.razao_social}</span>
                        {value === company.id && <Check className="h-4 w-4" />}
                      </div>
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        <span>CNPJ: {company.cnpj}</span>
                        {company.code && <span>Cód: {company.code}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
