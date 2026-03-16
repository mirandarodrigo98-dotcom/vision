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
import { searchEnuvesCompanies, getCompanyDetails } from '@/app/actions/integrations/companies';
import { useDebounce } from 'use-debounce';

interface TicketCompanySelectorProps {
  value: string;
  onSelect: (value: string) => void;
  disabled?: boolean;
}

export function TicketCompanySelector({ value, onSelect, disabled }: TicketCompanySelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [companies, setCompanies] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [selectedCompanyName, setSelectedCompanyName] = React.useState<string>('');
  const [debouncedSearch] = useDebounce(search, 300);

  // Load initial company name if value exists
  React.useEffect(() => {
    async function loadInitialCompany() {
      if (value) {
        // If we already have it in the list, use it
        const inList = companies.find(c => c.id === value);
        if (inList) {
          setSelectedCompanyName(inList.razao_social);
          return;
        }
        
        // Otherwise fetch it
        try {
          const company = await getCompanyDetails(value);
          if (company) {
            setSelectedCompanyName(company.razao_social);
            // Optionally add to list?
            setCompanies(prev => [...prev, company]);
          }
        } catch (e) {
          console.error('Failed to load company details', e);
        }
      } else {
        setSelectedCompanyName('');
      }
    }
    loadInitialCompany();
  }, [value, companies]);

  React.useEffect(() => {
    async function fetchCompanies() {
      if (debouncedSearch.length < 2) {
        // Don't clear if we have a selected value, just don't search
        if (!debouncedSearch) {
             // Maybe reset to show nothing or show recent?
             // For now, keep current list or clear?
             // If we clear, we lose the selected one if it was in the list.
             // But we handle selectedCompanyName separately.
        }
        return;
      }
      setLoading(true);
      try {
        const results = await searchEnuvesCompanies(debouncedSearch);
        setCompanies(results);
      } catch (error) {
        console.error('Error searching companies', error);
      } finally {
        setLoading(false);
      }
    }
    fetchCompanies();
  }, [debouncedSearch]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {value
            ? (selectedCompanyName || "Carregando...")
            : "Selecione a empresa (Opcional)"}
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
              className="border-0 focus-visible:ring-0"
            />
          </div>
          <ScrollArea className="h-[200px]">
            {loading ? (
              <div className="p-4 text-sm text-center text-muted-foreground">
                Buscando...
              </div>
            ) : companies.length === 0 && debouncedSearch.length >= 2 ? (
              <div className="p-4 text-sm text-center text-muted-foreground">
                Nenhuma empresa encontrada.
              </div>
            ) : (
              <div className="p-1">
                {companies.map((company) => (
                  <div
                    key={company.id}
                    className={cn(
                      "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                      value === company.id && "bg-accent text-accent-foreground"
                    )}
                    onClick={() => {
                      onSelect(company.id);
                      setOpen(false);
                    }}
                  >
                    <div className="flex flex-col w-full">
                      <div className="flex items-center justify-between">
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
            )}
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}
