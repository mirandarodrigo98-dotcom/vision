'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';

import { searchCompanies } from '@/app/actions/search-companies';
import { useDebounce } from '@/hooks/use-debounce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export type EDocSelectedCompany = {
  id: string;
  name: string;
  cnpj: string;
};

type EDocCompanySelectorProps = {
  value: EDocSelectedCompany | null;
  onSelect: (company: EDocSelectedCompany | null) => void;
};

type SearchCompanyItem = {
  id: string;
  razao_social: string;
  code: string;
  cnpj: string;
};

export function EDocCompanySelector({ value, onSelect }: EDocCompanySelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [companies, setCompanies] = React.useState<SearchCompanyItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const debouncedSearch = useDebounce(search, 250);

  React.useEffect(() => {
    let active = true;

    async function runSearch() {
      if (debouncedSearch.length < 1) {
        setCompanies([]);
        return;
      }

      setLoading(true);
      try {
        const results = await searchCompanies(debouncedSearch);
        if (!active) return;
        setCompanies(results as SearchCompanyItem[]);
      } catch (error) {
        console.error('Falha ao buscar empresas do e-Doc:', error);
        if (!active) return;
        setCompanies([]);
      } finally {
        if (active) setLoading(false);
      }
    }

    void runSearch();

    return () => {
      active = false;
    };
  }, [debouncedSearch]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-11 w-full justify-between border-slate-200 bg-white font-normal"
        >
          <span className="truncate text-left">
            {value ? value.name : 'Selecione um cliente'}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
        <div className="border-b px-3 py-2">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Digite 1 caractere ou mais"
              className="border-0 px-0 shadow-none focus-visible:ring-0"
            />
          </div>
        </div>

        <ScrollArea className="max-h-64">
          <div className="p-1">
            {!search && (
              <div className="px-3 py-6 text-sm text-slate-500">
                Informe pelo menos 1 caractere.
              </div>
            )}

            {loading && (
              <div className="px-3 py-6 text-sm text-slate-500">
                Buscando clientes...
              </div>
            )}

            {!loading && search && companies.length === 0 && (
              <div className="px-3 py-6 text-sm text-slate-500">
                Nenhum cliente encontrado.
              </div>
            )}

            {!loading && value && (
              <button
                type="button"
                className="flex w-full items-center rounded-sm px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50"
                onClick={() => {
                  onSelect(null);
                  setSearch('');
                  setOpen(false);
                }}
              >
                Limpar selecao
              </button>
            )}

            {companies.map((company) => {
              const selected = value?.id === company.id;

              return (
                <button
                  key={company.id}
                  type="button"
                  className={cn(
                    'flex w-full items-start gap-2 rounded-sm px-3 py-2 text-left text-sm hover:bg-slate-50',
                    selected && 'bg-orange-50'
                  )}
                  onClick={() => {
                    onSelect({
                      id: company.id,
                      name: company.razao_social,
                      cnpj: company.cnpj,
                    });
                    setOpen(false);
                    setSearch('');
                  }}
                >
                  <div className="flex-1">
                    <div className="font-medium text-slate-900">{company.razao_social}</div>
                    <div className="text-xs text-slate-500">
                      CNPJ: {company.cnpj}
                      {company.code ? `  |  Cod: ${company.code}` : ''}
                    </div>
                  </div>
                  {selected && <Check className="mt-0.5 h-4 w-4 text-orange-500" />}
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
