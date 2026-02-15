 'use client';
 
 import * as React from 'react';
 import { Check, ChevronsUpDown, Search, Building2 } from 'lucide-react';
 import { cn } from '@/lib/utils';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { ScrollArea } from '@/components/ui/scroll-area';
 import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
 import { useDebounce } from 'use-debounce';
 import { searchCompanies } from '@/app/actions/search-companies';
 
interface SocietarioCompanySelectorProps {
  name?: string;
  initialCompanyId?: string;
  disabled?: boolean;
}
 
export function SocietarioCompanySelector({ name = 'company_id', initialCompanyId, disabled = false }: SocietarioCompanySelectorProps) {
   const [open, setOpen] = React.useState(false);
   const [selectedId, setSelectedId] = React.useState(initialCompanyId || '');
   const [search, setSearch] = React.useState('');
   const [companies, setCompanies] = React.useState<Array<{ id: string; razao_social: string; cnpj?: string }>>([]);
   const [loading, setLoading] = React.useState(false);
   const [debouncedSearch] = useDebounce(search, 300);
 
  React.useEffect(() => {
    if (disabled) {
      setOpen(false);
      setSelectedId('');
    }
  }, [disabled]);

   React.useEffect(() => {
     const fetchCompanies = async () => {
       if (!debouncedSearch || debouncedSearch.length < 3) {
         setCompanies([]);
         return;
       }
       setLoading(true);
       try {
         const results = await searchCompanies(debouncedSearch);
         setCompanies(results);
       } finally {
         setLoading(false);
       }
     };
     fetchCompanies();
   }, [debouncedSearch]);
 
   const selectedName =
     selectedId && companies.find(c => c.id === selectedId)?.razao_social;
 
   return (
     <div className="space-y-2">
      <input type="hidden" name={name} value={disabled ? '' : selectedId} />
      <label className="text-sm font-medium">Empresa (opcional para Constituição)</label>
      <Popover open={open} onOpenChange={(v) => !disabled && setOpen(v)}>
         <PopoverTrigger asChild>
           <Button
             variant="outline"
             role="combobox"
             aria-expanded={open}
            disabled={disabled}
            className="w-full justify-between h-10"
           >
             <span className="flex items-center gap-2">
               <Building2 className="h-4 w-4 text-muted-foreground" />
              {selectedName || (disabled ? 'Selecione primeiro o Tipo de Processo' : 'Buscar empresa por Razão Social...')}
             </span>
             <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
           </Button>
         </PopoverTrigger>
         <PopoverContent className="w-[420px] p-0" align="start">
           <div className="flex flex-col">
             <div className="flex items-center border-b px-3">
               <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
               <Input
                 placeholder="Digite a Razão Social (mín. 3 letras)..."
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
                 className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none border-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
               />
             </div>
             <ScrollArea className="max-h-[280px] overflow-y-auto">
               <div className="p-1">
                 {loading && <div className="py-6 text-center text-sm text-muted-foreground">Buscando...</div>}
                 {!loading && companies.length === 0 && debouncedSearch.length >= 3 && (
                   <div className="py-6 text-center text-sm">Nenhuma empresa encontrada.</div>
                 )}
                 {!loading && companies.length === 0 && debouncedSearch.length < 3 && (
                   <div className="py-6 text-center text-sm text-muted-foreground">Digite pelo menos 3 caracteres</div>
                 )}
                 {companies.map((company) => (
                   <div
                     key={company.id}
                     onClick={() => {
                       setSelectedId(company.id);
                       setOpen(false);
                     }}
                     className={cn(
                       'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-3 text-sm outline-none hover:bg-accent hover:text-accent-foreground',
                       selectedId === company.id && 'bg-accent text-accent-foreground'
                     )}
                   >
                     <div className="w-full">
                       <div className="flex w-full justify-between items-center">
                         <span className="font-medium">{company.razao_social}</span>
                         {selectedId === company.id && <Check className="h-4 w-4" />}
                       </div>
                       <div className="flex gap-2 text-xs text-muted-foreground">
                         {company.cnpj && <span>CNPJ: {company.cnpj}</span>}
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
