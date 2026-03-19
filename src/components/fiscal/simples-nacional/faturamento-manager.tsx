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
import { ScrollArea } from '@/components/ui/scroll-area';
import { CompanySelector, type Company } from '@/components/ui/company-selector';

import { CompetenceInput } from '@/components/ui/competence-input';

interface SimplesNacionalBillingData {
  company_id: string;
  competence: string;
  rpa_competence: number;
  rpa_cash: number;
  rpa_accumulated: number;
  payroll_12_months: number;
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
  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatAliquot = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'decimal',
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
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
              <CompanySelector
                value={selectedCompany?.id}
                selectedLabel={selectedCompany?.label}
                onChange={(company) => {
                  if (company) {
                    setSelectedCompany({ id: company.id, label: `${company.code ? company.code + ' - ' : ''}${company.razao_social}` });
                  } else {
                    setSelectedCompany(null);
                  }
                }}
              />
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
                  <TableHead className="text-center">Competência</TableHead>
                  <TableHead className="text-center">RPA Total</TableHead>
                  <TableHead className="text-center">Alíq.Efetiva</TableHead>
                  <TableHead className="text-center">Folha+Encargos</TableHead>
                  <TableHead className="text-center">Folha 12 meses</TableHead>
                  <TableHead className="text-center">RBT12</TableHead>
                  <TableHead className="text-center">RBA</TableHead>
                  <TableHead className="text-center">RBAA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      Nenhum dado encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((row) => (
                    <TableRow key={row.competence}>
                      <TableCell className="text-center">{format(parseISO(row.competence), 'MM/yyyy')}</TableCell>
                      <TableCell className="text-center">{formatNumber(row.rpa_competence || 0)}</TableCell>
                      <TableCell className="text-center">{formatAliquot(row.rpa_cash || 0)}</TableCell>
                      <TableCell className="text-center">{formatNumber(row.rpa_accumulated || 0)}</TableCell>
                      <TableCell className="text-center">{formatNumber(row.payroll_12_months || 0)}</TableCell>
                      <TableCell className="text-center">{formatNumber(row.rbt12 || 0)}</TableCell>
                      <TableCell className="text-center">{formatNumber(row.rba || 0)}</TableCell>
                      <TableCell className="text-center">{formatNumber(row.rbaa || 0)}</TableCell>
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
