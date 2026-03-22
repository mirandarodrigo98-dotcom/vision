'use client';

import * as React from 'react';
import { format, parseISO, subMonths, addMonths } from 'date-fns';
import { Loader2, RefreshCw, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { fetchSimplesNacionalBilling, getStoredSimplesNacionalBilling } from '@/app/actions/integrations/simples-nacional';
import { CompanySelector } from '@/components/ui/company-selector';
import { CompetenceInput } from '@/components/ui/competence-input';
import { Input } from '@/components/ui/input';
import { calcularINSSProLabore } from '@/lib/inss';
import { calcularIRRFProLabore } from '@/lib/imposto-renda';
import { calcularAliquotaCPP } from '@/lib/simples-nacional-anexos';

interface SimplesNacionalBillingData {
  company_id: string;
  competence: string;
  rpa_competence: number;
  recebimento: number;
  rpa_cash: number;
  rpa_accumulated: number;
  payroll_12_months: number;
  rbt12: number;
  rba: number;
  rbaa: number;
  aliquota_efetiva: number;
}

export function SimplesNacionalFatorRManager() {
  const [loading, setLoading] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);
  const [data, setData] = React.useState<SimplesNacionalBillingData[]>([]);
  
  // Filters
  const [referenceCompetence, setReferenceCompetence] = React.useState(''); // YYYY-MM
  const [selectedCompany, setSelectedCompany] = React.useState<{ id: string, label: string } | null>(null);

  // Simulation State
  const [customSims, setCustomSims] = React.useState<Record<string, { rpa?: string, folha?: string, recebimento?: string }>>({});

  // Pro-labore State
  const [proLaboreStr, setProLaboreStr] = React.useState('');
  const [dependentesStr, setDependentesStr] = React.useState('0');

  const getFilterDates = (refComp: string) => {
    if (!refComp || refComp.length !== 7) return null;
    const refDate = parseISO(`${refComp}-01`);
    const startCompDate = subMonths(refDate, 12);
    const endCompDate = subMonths(refDate, 1);
    return {
      startCompetence: format(startCompDate, 'yyyy-MM'),
      endCompetence: format(endCompDate, 'yyyy-MM')
    };
  };

  React.useEffect(() => {
    if (selectedCompany && referenceCompetence && referenceCompetence.length === 7) {
      loadDataFromDB();
    }
  }, [selectedCompany, referenceCompetence]);

  async function loadDataFromDB() {
    const dates = getFilterDates(referenceCompetence);
    if (!selectedCompany || !dates) {
      toast.error('Preencha a competência e selecione a empresa.');
      return;
    }
    
    setLoading(true);
    const result = await getStoredSimplesNacionalBilling(selectedCompany.id, dates.startCompetence, dates.endCompetence);
    if (result.error) {
      toast.error(result.error);
    } else {
      const fetchedData = result.data as SimplesNacionalBillingData[];
      // Sort older to newer
      fetchedData.sort((a, b) => a.competence.localeCompare(b.competence));
      setData(fetchedData);
      // Reset simulations when loading new data
      setCustomSims({});
      toast.success('Dados carregados com sucesso.');
    }
    setLoading(false);
  }

  async function handleSync() {
    const dates = getFilterDates(referenceCompetence);
    if (!selectedCompany) {
      toast.error('Selecione uma empresa');
      return;
    }
    if (!dates) {
      toast.error('Preencha a competência corretamente');
      return;
    }

    setSyncing(true);
    const result = await fetchSimplesNacionalBilling({
      companyId: selectedCompany.id,
      startCompetence: dates.startCompetence,
      endCompetence: dates.endCompetence
    });

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Sincronização concluída! ${result.count || 0} registros processados.`);
      await loadDataFromDB();
    }
    setSyncing(false);
  }

  // Helpers to format currency and percentage
  const formatNumber = (value: number) => {
    const safeValue = isNaN(value) || !value ? 0 : value;
    return new Intl.NumberFormat('pt-BR', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(safeValue);
  };

  const formatPercent = (value: number) => {
    const safeValue = isNaN(value) || !value ? 0 : value;
    return new Intl.NumberFormat('pt-BR', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(safeValue) + '%';
  };

  const parseFormattedNumber = (valueStr: string) => {
    let cleanStr = valueStr.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
    let val = parseFloat(cleanStr);
    return isNaN(val) ? 0 : val;
  };

  const handleCustomChange = (comp: string, field: 'rpa' | 'folha' | 'recebimento', valueStr: string) => {
    const numbers = valueStr.replace(/\D/g, '');
    const formatted = numbers ? new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(parseInt(numbers, 10) / 100) : '';
    setCustomSims(prev => ({
      ...prev,
      [comp]: {
        ...prev[comp],
        [field]: formatted
      }
    }));
  };

  const restoreCustom = (comp: string, field: 'rpa' | 'folha' | 'recebimento') => {
    setCustomSims(prev => {
      const current = { ...prev[comp] };
      delete current[field];
      return {
        ...prev,
        [comp]: current
      };
    });
  };

  // Build Simulation Rows
  const simRows = [];
  if (referenceCompetence && referenceCompetence.length === 7 && data.length > 0) {
    const fullTimeline = [...data];
    const refDate = parseISO(`${referenceCompetence}-01`);

    for (let i = 0; i < 3; i++) {
      const simDate = addMonths(refDate, i);
      const compStr = format(simDate, 'yyyy-MM');
      
      const last12 = fullTimeline.slice(-12);
      const avgRpa = last12.reduce((acc, curr) => acc + Number(curr.rpa_competence || 0), 0) / 12;
      const avgFolha = last12.reduce((acc, curr) => acc + Number(curr.rpa_accumulated || 0), 0) / 12;
      const avgRecebimento = last12.reduce((acc, curr) => acc + Number(curr.recebimento || 0), 0) / 12;
      const avgAliquota = last12.reduce((acc, curr) => acc + Number(curr.aliquota_efetiva || 0), 0) / 12;

      const custom = customSims[compStr] || {};
      const customRpaVal = custom.rpa !== undefined ? parseFormattedNumber(custom.rpa) : avgRpa;
      const customFolhaVal = custom.folha !== undefined ? parseFormattedNumber(custom.folha) : avgFolha;
      const customRecebimentoVal = custom.recebimento !== undefined ? parseFormattedNumber(custom.recebimento) : avgRecebimento;

      const finalRpa = customRpaVal;
      const finalFolha = customFolhaVal;
      const finalRecebimento = customRecebimentoVal;

      const rbt12 = last12.reduce((acc, curr) => acc + Number(curr.rpa_competence || 0), 0);
      const folha12 = last12.reduce((acc, curr) => acc + Number(curr.rpa_accumulated || 0), 0);
      const fatorR = rbt12 > 0 ? (folha12 / rbt12) * 100 : 0;

      simRows.push({
        competence: compStr,
        rpa_competence: finalRpa,
        rpa_accumulated: finalFolha,
        recebimento: finalRecebimento,
        rbt12: rbt12,
        payroll_12_months: folha12,
        fatorR: fatorR,
        suggestedRpa: avgRpa,
        suggestedFolha: avgFolha,
        suggestedRecebimento: avgRecebimento,
        suggestedAliquota: avgAliquota,
        customRpaStr: custom.rpa,
        customFolhaStr: custom.folha,
        customRecebimentoStr: custom.recebimento,
        isCustomRpa: custom.rpa !== undefined,
        isCustomFolha: custom.folha !== undefined,
        isCustomRecebimento: custom.recebimento !== undefined
      });

      fullTimeline.push({
        company_id: '',
        competence: compStr,
        rpa_competence: finalRpa,
        rpa_accumulated: finalFolha,
        rbt12: rbt12, 
        rpa_cash: 0, 
        rba: 0, 
        rbaa: 0, 
        payroll_12_months: folha12,
        recebimento: finalRecebimento,
        aliquota_efetiva: avgAliquota
      });
    }
  }

  const renderFatorR = (fatorR: number) => {
    const isGreen = fatorR >= 28;
    return (
      <span className={cn("font-bold", isGreen ? "text-emerald-600" : "text-red-600")}>
        {formatPercent(fatorR)}
      </span>
    );
  };

  const proLaboreVal = parseFormattedNumber(proLaboreStr);
  const dependentesVal = parseInt(dependentesStr, 10) || 0;
  const proLaboreINSS = calcularINSSProLabore(proLaboreVal);
  const proLaboreIRRF = calcularIRRFProLabore(proLaboreVal, dependentesVal, proLaboreINSS);

  // CPP Calculation (Mês Anterior)
  let cppMesAnterior = 0;
  if (data.length > 0) {
    const lastMonth = data[data.length - 1]; // This is the last element (which is the previous month)
    const lastFatorR = lastMonth.rbt12 > 0 ? (lastMonth.payroll_12_months / lastMonth.rbt12) * 100 : 0;
    const lastAnexo = lastFatorR >= 28 ? 'III' : 'V';
    const aliquotaCPP = calcularAliquotaCPP(lastMonth.rbt12, lastAnexo, (lastMonth.aliquota_efetiva || 0) / 100);
    const baseCalculo = lastMonth.rpa_competence || 0;
    cppMesAnterior = baseCalculo * aliquotaCPP;
  }

  // Valores Folha do Mês (Simulation)
  const firstSimRow = simRows.length > 0 ? simRows[0] : null;
  const folhaDoMes = firstSimRow ? firstSimRow.rpa_accumulated : 0;
  const fgtsDoMes = folhaDoMes * 0.08;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Parâmetros do Fator R</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
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

            <div className="flex flex-col space-y-2">
              <Label>Competência</Label>
              <CompetenceInput 
                value={referenceCompetence} 
                onValueChange={setReferenceCompetence} 
              />
            </div>
            
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                onClick={loadDataFromDB} 
                disabled={loading || syncing || !selectedCompany || referenceCompetence.length !== 7}
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Carregar Dados
              </Button>
              <Button 
                onClick={handleSync} 
                disabled={syncing || !selectedCompany || referenceCompetence.length !== 7}
              >
                {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Executar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {data.length > 0 && (
        <div className="flex flex-col space-y-6">
          {/* Histórico */}
          <Card>
            <CardHeader>
              <CardTitle>Histórico (12 Meses Anteriores)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center">Competência</TableHead>
                      <TableHead className="text-center">RPA Total</TableHead>
                      <TableHead className="text-center">Recebimento</TableHead>
                      <TableHead className="text-center">RBT12</TableHead>
                      <TableHead className="text-center">Folha+Enc.</TableHead>
                      <TableHead className="text-center">Folha 12M</TableHead>
                      <TableHead className="text-center">Alíq. Efetiva</TableHead>
                      <TableHead className="text-center">Fator R</TableHead>
                      <TableHead className="text-center">Anexo</TableHead>
                      <TableHead className="text-center">DAS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((row) => {
                      const fatorR = row.rbt12 > 0 ? (row.payroll_12_months / row.rbt12) * 100 : 0;
                      const anexo = fatorR >= 28 ? 'Anexo III' : 'Anexo V';
                      const baseDas = row.recebimento > 0 ? row.recebimento : (row.rpa_competence || 0);
                      const das = baseDas * ((row.aliquota_efetiva || 0) / 100);
                      return (
                        <TableRow key={row.competence}>
                          <TableCell className="text-center font-medium">{format(parseISO(row.competence), 'MM/yyyy')}</TableCell>
                          <TableCell className="text-center">{formatNumber(row.rpa_competence || 0)}</TableCell>
                          <TableCell className="text-center">{formatNumber(row.recebimento || 0)}</TableCell>
                          <TableCell className="text-center">{formatNumber(row.rbt12 || 0)}</TableCell>
                          <TableCell className="text-center">{formatNumber(row.rpa_accumulated || 0)}</TableCell>
                          <TableCell className="text-center">{formatNumber(row.payroll_12_months || 0)}</TableCell>
                          <TableCell className="text-center">{formatPercent(row.aliquota_efetiva || 0)}</TableCell>
                          <TableCell className="text-center">{renderFatorR(fatorR)}</TableCell>
                          <TableCell className="text-center">{anexo}</TableCell>
                          <TableCell className="text-center">{formatNumber(das)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Simulação */}
          <Card>
            <CardHeader>
              <CardTitle>Simulação (Próximos 3 Meses)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center">Competência</TableHead>
                      <TableHead className="text-center min-w-[140px]">RPA Total</TableHead>
                      <TableHead className="text-center">Recebimento</TableHead>
                      <TableHead className="text-center">RBT12</TableHead>
                      <TableHead className="text-center min-w-[140px]">Folha+Enc.</TableHead>
                      <TableHead className="text-center">Folha 12M</TableHead>
                      <TableHead className="text-center">Alíq. Efetiva</TableHead>
                      <TableHead className="text-center">Fator R</TableHead>
                      <TableHead className="text-center">Anexo</TableHead>
                      <TableHead className="text-center">DAS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {simRows.map((row) => {
                      const baseDas = row.recebimento > 0 ? row.recebimento : row.rpa_competence;
                      const das = baseDas * (row.suggestedAliquota / 100);
                      const anexo = row.fatorR >= 28 ? 'Anexo III' : 'Anexo V';
                      return (
                      <TableRow key={row.competence} className={row.isCustomRpa || row.isCustomFolha || row.isCustomRecebimento ? "bg-muted/30" : ""}>
                        <TableCell className="text-center font-medium">{format(parseISO(row.competence), 'MM/yyyy')}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <Input 
                              className={cn("w-28 text-right h-8", row.isCustomRpa && "border-primary")}
                              value={row.isCustomRpa ? row.customRpaStr : formatNumber(row.suggestedRpa)}
                              onChange={(e) => handleCustomChange(row.competence, 'rpa', e.target.value)}
                            />
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-muted-foreground hover:text-primary"
                              onClick={() => restoreCustom(row.competence, 'rpa')}
                              title="Restaurar Média"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <Input 
                              className={cn("w-28 text-right h-8", row.isCustomRecebimento && "border-primary")}
                              value={row.isCustomRecebimento ? row.customRecebimentoStr : formatNumber(row.suggestedRecebimento)}
                              onChange={(e) => handleCustomChange(row.competence, 'recebimento', e.target.value)}
                            />
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-muted-foreground hover:text-primary"
                              onClick={() => restoreCustom(row.competence, 'recebimento')}
                              title="Restaurar Média"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{formatNumber(row.rbt12)}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <Input 
                              className={cn("w-28 text-right h-8", row.isCustomFolha && "border-primary")}
                              value={row.isCustomFolha ? row.customFolhaStr : formatNumber(row.suggestedFolha)}
                              onChange={(e) => handleCustomChange(row.competence, 'folha', e.target.value)}
                            />
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-muted-foreground hover:text-primary"
                              onClick={() => restoreCustom(row.competence, 'folha')}
                              title="Restaurar Média"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{formatNumber(row.payroll_12_months)}</TableCell>
                        <TableCell className="text-center">{formatPercent(row.suggestedAliquota)}</TableCell>
                        <TableCell className="text-center">{renderFatorR(row.fatorR)}</TableCell>
                        <TableCell className="text-center">{anexo}</TableCell>
                        <TableCell className="text-center">{formatNumber(das)}</TableCell>
                      </TableRow>
                    )})}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Pro-labore Section */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Cálculo de Pró-labore</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                <div className="flex flex-col space-y-2">
                  <Label>Valor do Pró-labore</Label>
                  <Input 
                    value={proLaboreStr}
                    onChange={(e) => {
                      const numbers = e.target.value.replace(/\D/g, '');
                      setProLaboreStr(numbers ? new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(parseInt(numbers, 10) / 100) : '');
                    }}
                    placeholder="0,00"
                    className="text-right"
                  />
                </div>
                <div className="flex flex-col space-y-2">
                  <Label>Dependentes</Label>
                  <Input 
                    type="number"
                    min="0"
                    value={dependentesStr}
                    onChange={(e) => setDependentesStr(e.target.value)}
                    className="text-right"
                  />
                </div>
                <div className="flex flex-col space-y-2">
                  <Label>INSS</Label>
                  <div className="h-10 px-3 py-2 border rounded-md bg-muted text-right font-medium">
                    {formatNumber(proLaboreINSS)}
                  </div>
                </div>
                <div className="flex flex-col space-y-2">
                  <Label>IRRF</Label>
                  <div className="h-10 px-3 py-2 border rounded-md bg-muted text-right font-medium">
                    {formatNumber(proLaboreIRRF)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Valores Folha Section */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Valores Folha</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                <div className="flex flex-col space-y-2">
                  <Label>Folha do Mês</Label>
                  <div className="h-10 px-3 py-2 border rounded-md bg-muted text-right font-medium">
                    {formatNumber(folhaDoMes)}
                  </div>
                </div>
                <div className="flex flex-col space-y-2">
                  <Label>FGTS do Mês</Label>
                  <div className="h-10 px-3 py-2 border rounded-md bg-muted text-right font-medium">
                    {formatNumber(fgtsDoMes)}
                  </div>
                </div>
                <div className="flex flex-col space-y-2">
                  <Label>CPP Mês Anterior</Label>
                  <div className="h-10 px-3 py-2 border rounded-md bg-muted text-right font-medium text-amber-700">
                    {formatNumber(cppMesAnterior)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
