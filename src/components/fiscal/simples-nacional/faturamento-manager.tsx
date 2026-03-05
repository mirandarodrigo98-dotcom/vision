'use client';

import * as React from 'react';
import { format, parseISO } from 'date-fns';
import { CalendarIcon, Loader2, Search, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { fetchSimplesNacionalBilling, getStoredSimplesNacionalBilling } from '@/app/actions/integrations/simples-nacional';
import { searchEnuvesCompanies } from '@/app/actions/integrations/companies';
import { useDebounce } from '@/hooks/use-debounce';
import { ScrollArea } from '@/components/ui/scroll-area';

import { CompetenceInput } from '@/components/ui/competence-input';

interface SimplesNacionalBillingData {
  company_id: string;
  competence: string;
  rpa_competence: number;
  rpa_cash: number;
  rpa_accumulated: number;
  rbt12: number;
  rba: number;
  rbaa: number;
}

export function SimplesNacionalFaturamentoManager() {
  const [loading, setLoading] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);
  const [data, setData] = React.useState<SimplesNacionalBillingData[]>([]);
  
  // Filters
  const [startCompetence, setStartCompetence] = React.useState(''); // YYYY-MM
  const [endCompetence, setEndCompetence] = React.useState('');   // YYYY-MM
  const [selectedCompany, setSelectedCompany] = React.useState<{ id: string, label: string } | null>(null);

  // Company Search State
  const [openCompany, setOpenCompany] = React.useState(false);
  const [companySearch, setCompanySearch] = React.useState('');
  const [companies, setCompanies] = React.useState<any[]>([]);
  const [searchingCompanies, setSearchingCompanies] = React.useState(false);
  const debouncedCompanySearch = useDebounce(companySearch, 300);

  // Load Companies
  React.useEffect(() => {
    async function loadCompanies() {
      if (debouncedCompanySearch.length < 2) {
        setCompanies([]);
        return;
      }
      setSearchingCompanies(true);
      const results = await searchEnuvesCompanies(debouncedCompanySearch);
      setCompanies(results);
      setSearchingCompanies(false);
    }
    loadCompanies();
  }, [debouncedCompanySearch]);

  // Load Data from DB when filters change (if valid)
  React.useEffect(() => {
    if (selectedCompany && startCompetence && endCompetence && startCompetence.length === 7 && endCompetence.length === 7) {
      loadDataFromDB();
    }
  }, [selectedCompany, startCompetence, endCompetence]);

  async function loadDataFromDB() {
    if (!selectedCompany || !startCompetence || !endCompetence) return;
    
    setLoading(true);
    const result = await getStoredSimplesNacionalBilling(selectedCompany.id, startCompetence, endCompetence);
    if (result.error) {
      toast.error(result.error);
    } else {
      setData(result.data as SimplesNacionalBillingData[]);
    }
    setLoading(false);
  }

  async function handleSync() {
    if (!selectedCompany) {
      toast.error('Selecione uma empresa');
      return;
    }
    if (!startCompetence || !endCompetence) {
      toast.error('Preencha as competências inicial e final');
      return;
    }
    if (startCompetence > endCompetence) {
      toast.error('A competência inicial não pode ser maior que a final');
      return;
    }

    setSyncing(true);
    const result = await fetchSimplesNacionalBilling({
      companyId: selectedCompany.id,
      startCompetence,
      endCompetence
    });

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Sincronização concluída! ${result.count || 0} registros processados.`);
      // Reload data from DB to reflect updates
      await loadDataFromDB();
    }
    setSyncing(false);
  }

  // Helper to format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Filtros de Execução</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            {/* Company Selector */}
            <div className="flex flex-col space-y-2 md:col-span-2">
              <Label>Empresa</Label>
              <Popover open={openCompany} onOpenChange={setOpenCompany}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openCompany}
                    className="justify-between"
                  >
                    {selectedCompany ? selectedCompany.label : "Selecione a empresa..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0">
                   <div className="flex flex-col">
                      <div className="flex items-center border-b px-3">
                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                        <Input
                          placeholder="Buscar empresa..."
                          value={companySearch}
                          onChange={(e) => setCompanySearch(e.target.value)}
                          className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none border-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      </div>
                      <ScrollArea className="max-h-[300px] overflow-y-auto">
                        <div className="p-1">
                          {searchingCompanies && <div className="py-6 text-center text-sm text-muted-foreground">Buscando...</div>}
                          {!searchingCompanies && companies.length === 0 && companySearch.length >= 2 && (
                            <div className="py-6 text-center text-sm">Nenhuma empresa encontrada.</div>
                          )}
                           {!searchingCompanies && companies.length === 0 && companySearch.length < 2 && (
                            <div className="py-6 text-center text-sm text-muted-foreground">Digite pelo menos 2 caracteres</div>
                          )}
                          {companies.map((company) => (
                            <div
                              key={company.id}
                              className={cn(
                                "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                                selectedCompany?.id === company.id ? "bg-accent text-accent-foreground" : ""
                              )}
                              onClick={() => {
                                setSelectedCompany({ id: company.id, label: `${company.code} - ${company.razao_social}` });
                                setOpenCompany(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedCompany?.id === company.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {company.code} - {company.razao_social}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                   </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Start Competence */}
            <div className="flex flex-col space-y-2">
              <Label>Competência Inicial</Label>
              <CompetenceInput 
                value={startCompetence} 
                onValueChange={setStartCompetence} 
              />
            </div>

            {/* End Competence */}
            <div className="flex flex-col space-y-2">
              <Label>Competência Final</Label>
              <CompetenceInput 
                value={endCompetence} 
                onValueChange={setEndCompetence} 
              />
            </div>
          </div>

          <div className="flex justify-end mt-4 space-x-2">
            <Button 
              variant="outline" 
              onClick={loadDataFromDB} 
              disabled={loading || syncing || !selectedCompany}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Carregar Dados
            </Button>
            <Button 
              onClick={handleSync} 
              disabled={syncing || !selectedCompany || !startCompetence || !endCompetence}
            >
              {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Executar (Questor)
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resultados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Competência</TableHead>
                  <TableHead className="text-right">RPA Total</TableHead>
                <TableHead className="text-right">Alíq.Efetiva</TableHead>
                <TableHead className="text-right">Folha+Encargos</TableHead>
                  <TableHead className="text-right">RBT12</TableHead>
                  <TableHead className="text-right">RBA</TableHead>
                  <TableHead className="text-right">RBAA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      Nenhum dado encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((row) => (
                    <TableRow key={row.competence}>
                      <TableCell>{row.competence}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.rpa_competence)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.rpa_cash)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.rpa_accumulated)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.rbt12)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.rba)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.rbaa)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
