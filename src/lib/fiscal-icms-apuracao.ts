export type IcmsMetricKey =
  | 'valortotal'
  | 'basecalculoicms'
  | 'valoricms'
  | 'outrasicms'
  | 'isentasicms';

export type IcmsSourceKey =
  | 'lctofissaiproduto'
  | 'lctofisentproduto'
  | 'consolidado';

export interface IcmsAggregateTotals {
  valortotal: number;
  basecalculoicms: number;
  valoricms: number;
  outrasicms: number;
  isentasicms: number;
}

export interface IcmsTotalsSource {
  key: IcmsSourceKey;
  label: string;
  tableName: string;
  dateColumn: string;
  totals: IcmsAggregateTotals;
}

export interface TotalIcmsRjRow {
  codigoempresa: string;
  codigoestab: string;
  codigooperacaofis: string;
  descricaooperacaofis: string;
  datatotal: string;
  valortotal: number;
  seq: string;
  valortexto: string;
  suggestedMetricKey: IcmsMetricKey | null;
  suggestedSourceKey: IcmsSourceKey;
  suggestedValue: number | null;
  differenceToSuggestion: number | null;
}

export const ICMS_METRIC_LABELS: Record<IcmsMetricKey, string> = {
  valortotal: 'Valor Total',
  basecalculoicms: 'Base de Calculo ICMS',
  valoricms: 'Valor ICMS',
  outrasicms: 'Outras ICMS',
  isentasicms: 'Isentas ICMS',
};

export const ICMS_SOURCE_LABELS: Record<IcmsSourceKey, string> = {
  lctofissaiproduto: 'Lcto Fiscal Saida Produto',
  lctofisentproduto: 'Lcto Fiscal Entrada Produto',
  consolidado: 'Consolidado Saida + Entrada',
};

export const ICMS_METRIC_OPTIONS: Array<{ key: IcmsMetricKey; label: string }> = [
  { key: 'valortotal', label: ICMS_METRIC_LABELS.valortotal },
  { key: 'basecalculoicms', label: ICMS_METRIC_LABELS.basecalculoicms },
  { key: 'valoricms', label: ICMS_METRIC_LABELS.valoricms },
  { key: 'outrasicms', label: ICMS_METRIC_LABELS.outrasicms },
  { key: 'isentasicms', label: ICMS_METRIC_LABELS.isentasicms },
];

export function createEmptyAggregateTotals(): IcmsAggregateTotals {
  return {
    valortotal: 0,
    basecalculoicms: 0,
    valoricms: 0,
    outrasicms: 0,
    isentasicms: 0,
  };
}

export function suggestMetricFromDescription(description: string, fallbackText?: string): IcmsMetricKey {
  const normalized = `${description || ''} ${fallbackText || ''}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (normalized.includes('base')) return 'basecalculoicms';
  if (normalized.includes('isenta')) return 'isentasicms';
  if (normalized.includes('outra')) return 'outrasicms';
  if (normalized.includes('contabil') || normalized.includes('valor total') || normalized.includes('total')) {
    return 'valortotal';
  }

  return 'valoricms';
}

export function getSourceMetricValue(source: IcmsTotalsSource, metric: IcmsMetricKey): number {
  return source.totals[metric] ?? 0;
}

export function buildRowSelectionKey(row: Pick<TotalIcmsRjRow, 'codigooperacaofis' | 'datatotal' | 'seq'>): string {
  return `${row.codigooperacaofis}::${row.datatotal}::${row.seq}`;
}
