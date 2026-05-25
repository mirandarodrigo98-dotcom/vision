import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export type CobrancaTotals = {
  registros: number;
  valorConta: number;
  recebido: number;
  aReceber: number;
  desconto: number;
  juros: number;
  emAtraso: number;
  honorarios: number;
};

type ExportColumn = {
  key: string;
  headerName: string;
  isNumeric: boolean;
  width?: number;
};

type ExportSnapshot = {
  columns: ExportColumn[];
  rows: Array<Record<string, string | number>>;
  totals: CobrancaTotals;
};

const NUMERIC_FIELDS = new Set([
  'valor_documento',
  'valor_pago_calculado',
  'saldo_a_receber',
  'valor_desconto',
  'valor_juros',
]);

export function createEmptyCobrancaTotals(): CobrancaTotals {
  return {
    registros: 0,
    valorConta: 0,
    recebido: 0,
    aReceber: 0,
    desconto: 0,
    juros: 0,
    emAtraso: 0,
    honorarios: 0,
  };
}

export function collectFilteredCobrancaRows(gridApi: any): any[] {
  if (!gridApi) return [];

  const rows: any[] = [];
  gridApi.forEachNodeAfterFilterAndSort((node: any) => {
    if (node?.data) {
      rows.push(node.data);
    }
  });

  return rows;
}

export function calculateCobrancaTotals(rows: any[]): CobrancaTotals {
  return rows.reduce<CobrancaTotals>((acc, row) => {
    const valorConta = toNumber(row?.valor_documento);
    const recebido = toNumber(row?.valor_pago_calculado);
    const desconto = toNumber(row?.valor_desconto ?? row?.resumo?.desconto);
    const juros = toNumber(row?.valor_juros ?? row?.resumo?.juros);
    const aReceber = Math.max(0, valorConta - recebido);
    const status = normalizeText(row?.status_titulo);
    const categoria = normalizeText(row?.nome_categoria);

    acc.registros += 1;
    acc.valorConta += valorConta;
    acc.recebido += recebido;
    acc.aReceber += aReceber;
    acc.desconto += desconto;
    acc.juros += juros;

    if (status === 'ATRASADO') {
      acc.emAtraso += aReceber;
    }

    if (categoria.includes('HONORAR')) {
      acc.honorarios += valorConta;
    }

    return acc;
  }, createEmptyCobrancaTotals());
}

export function exportFilteredCobrancaToXlsx(params: {
  gridApi: any;
  companyLabel: string;
  periodLabel: string;
  dateFilterLabel: string;
  filePrefix: string;
}) {
  const snapshot = buildExportSnapshot(params.gridApi);
  if (!snapshot.rows.length) {
    return false;
  }

  const generatedAt = new Date();
  const summaryRows = [
    ['Empresa', params.companyLabel],
    ['Filtro de data', params.dateFilterLabel],
    ['Periodo consultado', params.periodLabel],
    ['Gerado em', generatedAt.toLocaleString('pt-BR')],
    ['Registros filtrados', snapshot.totals.registros],
    ['Valor total', snapshot.totals.valorConta],
    ['Em atraso', snapshot.totals.emAtraso],
    ['Honorarios', snapshot.totals.honorarios],
    ['Recebido', snapshot.totals.recebido],
    ['A receber', snapshot.totals.aReceber],
    ['Descontos', snapshot.totals.desconto],
    ['Juros', snapshot.totals.juros],
    [],
  ];

  const headerRow = snapshot.columns.map((column) => column.headerName);
  const dataRows = snapshot.rows.map((row) =>
    snapshot.columns.map((column) => row[column.key] ?? '')
  );

  const worksheet = XLSX.utils.aoa_to_sheet([
    [`Relatorio de Contas a Receber - ${params.companyLabel}`],
    [],
    ...summaryRows,
    headerRow,
    ...dataRows,
  ]);

  worksheet['!cols'] = snapshot.columns.map((column) => ({
    wch: Math.max(14, Math.min(Math.ceil((column.width || 140) / 7), 40)),
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Contas a Receber');
  XLSX.writeFile(workbook, `${buildSafeFileName(params.filePrefix, generatedAt)}.xlsx`);

  return true;
}

export function exportFilteredCobrancaToPdf(params: {
  gridApi: any;
  companyLabel: string;
  periodLabel: string;
  dateFilterLabel: string;
  filePrefix: string;
}) {
  const snapshot = buildExportSnapshot(params.gridApi);
  if (!snapshot.rows.length) {
    return false;
  }

  const generatedAt = new Date();
  const orientation = snapshot.columns.length > 8 ? 'landscape' : 'portrait';
  const doc = new jsPDF({ orientation });

  doc.setFontSize(16);
  doc.text(`Relatorio de Contas a Receber - ${params.companyLabel}`, 14, 16);

  doc.setFontSize(10);
  doc.text(`Filtro de data: ${params.dateFilterLabel}`, 14, 24);
  doc.text(`Periodo consultado: ${params.periodLabel}`, 14, 30);
  doc.text(`Gerado em: ${generatedAt.toLocaleString('pt-BR')}`, 14, 36);

  const summaryBody = [
    ['Registros filtrados', String(snapshot.totals.registros)],
    ['Valor total', formatCurrency(snapshot.totals.valorConta)],
    ['Em atraso', formatCurrency(snapshot.totals.emAtraso)],
    ['Honorarios', formatCurrency(snapshot.totals.honorarios)],
    ['Recebido', formatCurrency(snapshot.totals.recebido)],
    ['A receber', formatCurrency(snapshot.totals.aReceber)],
    ['Descontos', formatCurrency(snapshot.totals.desconto)],
    ['Juros', formatCurrency(snapshot.totals.juros)],
  ];

  autoTable(doc, {
    startY: 42,
    head: [['Totalizador', 'Valor']],
    body: summaryBody,
    theme: 'grid',
    headStyles: { fillColor: [234, 88, 12] },
    styles: { fontSize: 9 },
    columnStyles: {
      1: { halign: 'right' },
    },
  });

  const body = snapshot.rows.map((row) =>
    snapshot.columns.map((column) => {
      const value = row[column.key];
      return column.isNumeric ? formatNumber(toNumber(value)) : String(value ?? '-');
    })
  );

  autoTable(doc, {
    startY: ((doc as any).lastAutoTable?.finalY || 42) + 8,
    head: [snapshot.columns.map((column) => column.headerName)],
    body,
    theme: 'grid',
    headStyles: { fillColor: [31, 41, 55] },
    styles: {
      fontSize: 7,
      cellPadding: 1.8,
      overflow: 'linebreak',
    },
    columnStyles: snapshot.columns.reduce<Record<number, { halign?: 'left' | 'right' }>>((acc, column, index) => {
      if (column.isNumeric) {
        acc[index] = { halign: 'right' };
      }
      return acc;
    }, {}),
    margin: { top: 12, right: 10, bottom: 12, left: 10 },
  });

  doc.save(`${buildSafeFileName(params.filePrefix, generatedAt)}.pdf`);
  return true;
}

function buildExportSnapshot(gridApi: any): ExportSnapshot {
  const columns = getVisibleColumns(gridApi);
  const rows: Array<Record<string, string | number>> = [];
  const rawRows: any[] = [];

  if (!gridApi || !columns.length) {
    return {
      columns,
      rows,
      totals: createEmptyCobrancaTotals(),
    };
  }

  gridApi.forEachNodeAfterFilterAndSort((node: any) => {
    if (!node?.data) return;

    rawRows.push(node.data);

    const row: Record<string, string | number> = {};
    for (const column of columns) {
      const rawValue = typeof node.getDataValue === 'function'
        ? node.getDataValue(column.key, 'value')
        : node.data?.[column.key];
      row[column.key] = column.isNumeric ? toNumber(rawValue) : stringifyValue(rawValue);
    }
    rows.push(row);
  });

  return {
    columns,
    rows,
    totals: calculateCobrancaTotals(rawRows),
  };
}

function getVisibleColumns(gridApi: any): ExportColumn[] {
  if (!gridApi?.getAllDisplayedColumns) {
    return [];
  }

  return gridApi
    .getAllDisplayedColumns()
    .filter((column: any) => column?.getColDef?.()?.headerName)
    .map((column: any) => {
      const colDef = column.getColDef();
      const key = column.getColId();

      return {
        key,
        headerName: colDef.headerName || key,
        isNumeric: colDef.filter === 'agNumberColumnFilter' || NUMERIC_FIELDS.has(key),
        width: colDef.width || column.getActualWidth?.(),
      };
    });
}

function buildSafeFileName(prefix: string, date: Date) {
  const stamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
    '_',
    String(date.getHours()).padStart(2, '0'),
    String(date.getMinutes()).padStart(2, '0'),
  ].join('');

  return `${prefix.replace(/[^a-z0-9_-]/gi, '_')}_${stamp}`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function normalizeText(value: unknown) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
}

function stringifyValue(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  return String(value);
}

function toNumber(value: unknown) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === 'string') {
    const normalized = value.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}
