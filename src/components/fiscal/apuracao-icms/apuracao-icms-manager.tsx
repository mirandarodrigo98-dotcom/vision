'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, Database, Loader2, PlayCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { fetchIcmsApuracao, updateTotalIcmsRjValue } from '@/app/actions/fiscal/apuracao-icms';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  buildRowSelectionKey,
  ICMS_METRIC_LABELS,
  ICMS_METRIC_OPTIONS,
  ICMS_SOURCE_LABELS,
  type IcmsMetricKey,
  type IcmsSourceKey,
  type IcmsTotalsSource,
  type TotalIcmsRjRow,
} from '@/lib/fiscal-icms-apuracao';

interface ApuracaoIcmsData {
  filters: {
    companyCode: string;
    estabCode: string;
    startDate: string;
    endDate: string;
  };
  metadata: {
    totalicmsrjDateColumn: string;
    operacaoDescriptionColumn: string;
    saidaDateColumn: string;
    entradaDateColumn: string;
  };
  comparison: {
    totalIcmsRjAtual: number;
    valorIcmsConsolidado: number;
    diferencaIcms: number;
  };
  sources: Record<IcmsSourceKey, IcmsTotalsSource>;
  rows: TotalIcmsRjRow[];
}

interface RowSelectionState {
  sourceKey: IcmsSourceKey;
  metricKey: IcmsMetricKey;
}

function getMonthStart() {
  const now = new Date();
  return `01/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
}

function getToday() {
  const now = new Date();
  return `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
}

function formatSignedCurrency(value: number) {
  const signal = value > 0 ? '+' : '';
  return `${signal}${formatCurrency(value)}`;
}

function formatDisplayDate(value: string) {
  if (!value) return '-';

  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [year, month, day] = value.substring(0, 10).split('-');
    return `${day}/${month}/${year}`;
  }

  return value;
}

function createInitialSelections(rows: TotalIcmsRjRow[]) {
  return rows.reduce<Record<string, RowSelectionState>>((acc, row) => {
    acc[buildRowSelectionKey(row)] = {
      sourceKey: row.suggestedSourceKey,
      metricKey: row.suggestedMetricKey || 'valoricms',
    };
    return acc;
  }, {});
}

function TotalsList({ source }: { source: IcmsTotalsSource }) {
  return (
    <div className="space-y-2">
      {ICMS_METRIC_OPTIONS.map((metric) => (
        <div
          key={`${source.key}-${metric.key}`}
          className="flex items-center justify-between rounded-md border bg-slate-50 px-3 py-2 text-sm"
        >
          <span className="text-slate-600">{metric.label}</span>
          <span className="font-semibold text-slate-800">{formatCurrency(source.totals[metric.key])}</span>
        </div>
      ))}
    </div>
  );
}

export function ApuracaoIcmsManager() {
  const [filters, setFilters] = useState({
    companyCode: '',
    estabCode: '1',
    startDate: getMonthStart(),
    endDate: getToday(),
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApuracaoIcmsData | null>(null);
  const [selections, setSelections] = useState<Record<string, RowSelectionState>>({});
  const [updatingRowKey, setUpdatingRowKey] = useState<string | null>(null);

  const sourceOptions = useMemo(
    () => [
      { key: 'consolidado' as IcmsSourceKey, label: ICMS_SOURCE_LABELS.consolidado },
      { key: 'lctofissaiproduto' as IcmsSourceKey, label: ICMS_SOURCE_LABELS.lctofissaiproduto },
      { key: 'lctofisentproduto' as IcmsSourceKey, label: ICMS_SOURCE_LABELS.lctofisentproduto },
    ],
    [],
  );

  const handleProcessar = async () => {
    if (!filters.companyCode || !filters.estabCode || !filters.startDate || !filters.endDate) {
      toast.error('Preencha codigo da empresa, filial e periodo para processar.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetchIcmsApuracao(filters);
      if (!response.success || !response.data) {
        toast.error(response.error || 'Nao foi possivel consultar a Apuracao ICMS.');
        return;
      }

      setResult(response.data);
      setSelections(createInitialSelections(response.data.rows));
      toast.success('Apuracao ICMS processada com sucesso.');
    } catch (error) {
      toast.error('Erro inesperado ao consultar a Apuracao ICMS.');
    } finally {
      setLoading(false);
    }
  };

  const updateSelection = (
    rowKey: string,
    partial: Partial<RowSelectionState>,
    fallback: RowSelectionState,
  ) => {
    setSelections((prev) => ({
      ...prev,
      [rowKey]: {
        ...(prev[rowKey] || fallback),
        ...partial,
      },
    }));
  };

  const getSelectedSource = (rowKey: string, row: TotalIcmsRjRow) => {
    const selection = selections[rowKey] || {
      sourceKey: row.suggestedSourceKey,
      metricKey: row.suggestedMetricKey || 'valoricms',
    };
    return result?.sources[selection.sourceKey];
  };

  const getSelectedMetric = (rowKey: string, row: TotalIcmsRjRow) => {
    return selections[rowKey]?.metricKey || row.suggestedMetricKey || 'valoricms';
  };

  const getSelectedValue = (rowKey: string, row: TotalIcmsRjRow) => {
    const source = getSelectedSource(rowKey, row);
    const metric = getSelectedMetric(rowKey, row);
    if (!source) return 0;
    return source.totals[metric] || 0;
  };

  const handleAtualizarLinha = async (row: TotalIcmsRjRow) => {
    if (!result) return;

    const rowKey = buildRowSelectionKey(row);
    const newValue = getSelectedValue(rowKey, row);

    setUpdatingRowKey(rowKey);
    try {
      const response = await updateTotalIcmsRjValue({
        companyCode: result.filters.companyCode,
        estabCode: result.filters.estabCode,
        startDate: result.filters.startDate,
        endDate: result.filters.endDate,
        operationCode: row.codigooperacaofis,
        totalDate: formatDisplayDate(row.datatotal),
        seq: row.seq,
        newValue,
      });

      if (!response.success || !response.data) {
        toast.error(response.error || 'Nao foi possivel atualizar a TOTALICMSRJ.');
        return;
      }

      setResult((prev) => {
        if (!prev) return prev;

        const rows = prev.rows.map((currentRow) => {
          const currentKey = buildRowSelectionKey(currentRow);
          if (currentKey !== rowKey) return currentRow;

          const source = getSelectedSource(rowKey, currentRow);
          const metric = getSelectedMetric(rowKey, currentRow);
          const selectedValue = source ? source.totals[metric] : response.data.valortotal;

          return {
            ...currentRow,
            valortotal: response.data.valortotal,
            valortexto: response.data.valortexto,
            suggestedMetricKey: metric,
            suggestedSourceKey: source?.key || currentRow.suggestedSourceKey,
            suggestedValue: selectedValue,
            differenceToSuggestion: selectedValue - response.data.valortotal,
          };
        });

        const totalIcmsRjAtual = rows.reduce((acc, item) => acc + item.valortotal, 0);

        return {
          ...prev,
          rows,
          comparison: {
            totalIcmsRjAtual,
            valorIcmsConsolidado: prev.comparison.valorIcmsConsolidado,
            diferencaIcms: prev.comparison.valorIcmsConsolidado - totalIcmsRjAtual,
          },
        };
      });

      toast.success('Registro da TOTALICMSRJ atualizado com sucesso.');
    } catch (error) {
      toast.error('Erro inesperado ao atualizar a TOTALICMSRJ.');
    } finally {
      setUpdatingRowKey(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight text-slate-800">Apuracao ICMS</h2>
        <p className="text-sm text-muted-foreground">
          Consulte a tabela TOTALICMSRJ, compare com os totalizadores de lancamentos fiscais e atualize os registros necessarios.
        </p>
        <p className="text-xs text-slate-500">
          Datas no formato DD/MM/AAAA. O processamento usa conexao direta com o banco configurado em Integracoes &gt; Postgree.
        </p>
      </div>

      <Card className="border-t-4 border-t-indigo-600 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-indigo-600" />
            Parametros da Apuracao
          </CardTitle>
          <CardDescription>
            Informe codigo da empresa, filial e periodo para consultar a TOTALICMSRJ e os totalizadores fiscais.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="space-y-2">
              <Label htmlFor="companyCode">Codigo da Empresa</Label>
              <Input
                id="companyCode"
                placeholder="Ex: 1"
                value={filters.companyCode}
                onChange={(event) => setFilters((prev) => ({ ...prev, companyCode: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="estabCode">Codigo da Filial</Label>
              <Input
                id="estabCode"
                placeholder="Ex: 1"
                value={filters.estabCode}
                onChange={(event) => setFilters((prev) => ({ ...prev, estabCode: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate">Data Inicial</Label>
              <Input
                id="startDate"
                placeholder="DD/MM/AAAA"
                value={filters.startDate}
                onChange={(event) => setFilters((prev) => ({ ...prev, startDate: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Data Final</Label>
              <Input
                id="endDate"
                placeholder="DD/MM/AAAA"
                value={filters.endDate}
                onChange={(event) => setFilters((prev) => ({ ...prev, endDate: event.target.value }))}
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleProcessar}
                disabled={loading}
                className="w-full bg-slate-800 hover:bg-slate-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <PlayCircle className="mr-2 h-4 w-4" />
                    Processar
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {result && (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Comparacao Principal</CardTitle>
                <CardDescription>
                  Valor atual somado da TOTALICMSRJ versus valor de ICMS consolidado.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-md border bg-slate-50 px-3 py-2">
                  <div className="text-xs text-slate-500">TOTALICMSRJ atual</div>
                  <div className="text-lg font-semibold text-slate-800">
                    {formatCurrency(result.comparison.totalIcmsRjAtual)}
                  </div>
                </div>
                <div className="rounded-md border bg-indigo-50 px-3 py-2">
                  <div className="text-xs text-indigo-700">ICMS consolidado</div>
                  <div className="text-lg font-semibold text-indigo-800">
                    {formatCurrency(result.comparison.valorIcmsConsolidado)}
                  </div>
                </div>
                <div
                  className={`rounded-md border px-3 py-2 ${
                    result.comparison.diferencaIcms === 0
                      ? 'bg-emerald-50 text-emerald-800'
                      : 'bg-amber-50 text-amber-800'
                  }`}
                >
                  <div className="text-xs">Diferenca</div>
                  <div className="text-lg font-semibold">{formatSignedCurrency(result.comparison.diferencaIcms)}</div>
                </div>
              </CardContent>
            </Card>

            {[result.sources.lctofissaiproduto, result.sources.lctofisentproduto, result.sources.consolidado].map((source) => (
              <Card key={source.key} className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{source.label}</CardTitle>
                  <CardDescription>
                    Tabela `{source.tableName}` usando a coluna `{source.dateColumn || 'nao detectada'}`.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <TotalsList source={source} />
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-indigo-600" />
                Resultado da TOTALICMSRJ
              </CardTitle>
              <CardDescription>
                Consulta baseada em `datatotal` e descricao obtida da tabela `operacaofis` pela coluna `{result.metadata.operacaoDescriptionColumn}`.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md border bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Foram encontrados <strong>{result.rows.length}</strong> registro(s) na `TOTALICMSRJ` para empresa{' '}
                <strong>{result.filters.companyCode}</strong>, filial <strong>{result.filters.estabCode}</strong>.
              </div>

              <div className="overflow-x-auto rounded-md border bg-white">
                <table className="min-w-[1550px] w-full text-sm">
                  <thead className="bg-slate-50 text-slate-700">
                    <tr>
                      <th className="px-3 py-3 text-left font-semibold">Data</th>
                      <th className="px-3 py-3 text-left font-semibold">Seq</th>
                      <th className="px-3 py-3 text-left font-semibold">Operacao</th>
                      <th className="px-3 py-3 text-left font-semibold">Descricao</th>
                      <th className="px-3 py-3 text-right font-semibold">Valor Atual</th>
                      <th className="px-3 py-3 text-left font-semibold">Origem</th>
                      <th className="px-3 py-3 text-left font-semibold">Campo Totalizador</th>
                      <th className="px-3 py-3 text-right font-semibold">Novo Valor</th>
                      <th className="px-3 py-3 text-right font-semibold">Diferenca</th>
                      <th className="px-3 py-3 text-center font-semibold">Atualizar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {result.rows.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-4 py-12 text-center text-slate-500">
                          Nenhum registro encontrado para os filtros informados.
                        </td>
                      </tr>
                    ) : (
                      result.rows.map((row) => {
                        const rowKey = buildRowSelectionKey(row);
                        const defaultSelection = {
                          sourceKey: row.suggestedSourceKey,
                          metricKey: row.suggestedMetricKey || 'valoricms',
                        };
                        const selectedSource = getSelectedSource(rowKey, row);
                        const selectedMetric = getSelectedMetric(rowKey, row);
                        const selectedValue = getSelectedValue(rowKey, row);
                        const difference = selectedValue - row.valortotal;

                        return (
                          <tr key={rowKey} className="hover:bg-slate-50/70">
                            <td className="px-3 py-3 text-slate-600">{formatDisplayDate(row.datatotal)}</td>
                            <td className="px-3 py-3 text-slate-600">{row.seq}</td>
                            <td className="px-3 py-3 font-medium text-slate-700">{row.codigooperacaofis}</td>
                            <td className="px-3 py-3 text-slate-600">
                              <div className="max-w-[320px] whitespace-normal">
                                {row.descricaooperacaofis || 'Descricao nao localizada'}
                                {row.suggestedMetricKey && (
                                  <div className="mt-1 inline-flex items-center rounded-full bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700">
                                    Sugestao: {ICMS_METRIC_LABELS[row.suggestedMetricKey]}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-3 text-right font-semibold text-slate-800">
                              {formatCurrency(row.valortotal)}
                            </td>
                            <td className="px-3 py-3">
                              <Select
                                value={selectedSource?.key || defaultSelection.sourceKey}
                                onValueChange={(value) =>
                                  updateSelection(
                                    rowKey,
                                    { sourceKey: value as IcmsSourceKey },
                                    defaultSelection,
                                  )
                                }
                              >
                                <SelectTrigger className="w-[230px] bg-white">
                                  <SelectValue placeholder="Selecione a origem" />
                                </SelectTrigger>
                                <SelectContent>
                                  {sourceOptions.map((source) => (
                                    <SelectItem key={`${rowKey}-${source.key}`} value={source.key}>
                                      {source.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-3 py-3">
                              <Select
                                value={selectedMetric}
                                onValueChange={(value) =>
                                  updateSelection(
                                    rowKey,
                                    { metricKey: value as IcmsMetricKey },
                                    defaultSelection,
                                  )
                                }
                              >
                                <SelectTrigger className="w-[220px] bg-white">
                                  <SelectValue placeholder="Selecione o campo" />
                                </SelectTrigger>
                                <SelectContent>
                                  {ICMS_METRIC_OPTIONS.map((metric) => (
                                    <SelectItem key={`${rowKey}-${metric.key}`} value={metric.key}>
                                      {metric.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-3 py-3 text-right font-semibold text-indigo-700">
                              {formatCurrency(selectedValue)}
                            </td>
                            <td
                              className={`px-3 py-3 text-right font-semibold ${
                                difference === 0
                                  ? 'text-emerald-700'
                                  : difference > 0
                                    ? 'text-amber-700'
                                    : 'text-rose-700'
                              }`}
                            >
                              {formatSignedCurrency(difference)}
                            </td>
                            <td className="px-3 py-3 text-center">
                              <Button
                                size="sm"
                                onClick={() => handleAtualizarLinha(row)}
                                disabled={updatingRowKey === rowKey}
                                className="bg-emerald-600 hover:bg-emerald-700"
                              >
                                {updatingRowKey === rowKey ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Atualizando
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    Atualizar
                                  </>
                                )}
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
