'use server';

import { format, isValid, parse } from 'date-fns';

import { getUserPermissions } from '@/app/actions/permissions';
import { executeQuestorSQL } from '@/app/actions/integrations/questor-syn';
import { getSession } from '@/lib/auth';
import {
  buildRowSelectionKey,
  createEmptyAggregateTotals,
  getSourceMetricValue,
  ICMS_SOURCE_LABELS,
  type IcmsAggregateTotals,
  type IcmsMetricKey,
  type IcmsSourceKey,
  type IcmsTotalsSource,
  type TotalIcmsRjRow,
  suggestMetricFromDescription,
} from '@/lib/fiscal-icms-apuracao';

const AGGREGATE_DATE_COLUMNS = ['datalcto', 'dataemissao', 'datamovimento', 'dataentrada', 'datasaida', 'data'];
const OPERACAO_DESCRIPTION_COLUMNS = ['descricao', 'descricaofis', 'nome'];

interface ApuracaoIcmsFilters {
  companyCode: string;
  estabCode: string;
  startDate: string;
  endDate: string;
}

interface UpdateTotalIcmsRjInput extends ApuracaoIcmsFilters {
  operationCode: string;
  totalDate: string;
  seq: string;
  newValue: number;
}

function parseNumericCode(value: string, fieldLabel: string) {
  const normalized = String(value || '').trim();
  if (!/^\d+$/.test(normalized)) {
    throw new Error(`${fieldLabel} deve conter apenas numeros.`);
  }
  return normalized;
}

function parseDateInput(value: string, fieldLabel: string) {
  const parsed = parse(String(value || '').trim(), 'dd/MM/yyyy', new Date());
  if (!isValid(parsed)) {
    throw new Error(`${fieldLabel} invalida. Use o formato DD/MM/AAAA.`);
  }
  return format(parsed, 'yyyy-MM-dd');
}

function parseNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (value == null) return 0;

  const normalized = String(value)
    .trim()
    .replace(/\./g, '')
    .replace(',', '.');

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toSqlDecimal(value: number) {
  return Number.isFinite(value) ? value.toFixed(2) : '0.00';
}

function toSqlStringDate(value: string) {
  return `'${value}'`;
}

function normalizeRowKeys(row: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key.toLowerCase(), value]),
  );
}

function normalizeQuestorRows(data: unknown): Record<string, unknown>[] {
  if (!data) return [];

  if (Array.isArray(data)) {
    return data
      .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
      .map(normalizeRowKeys);
  }

  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      return normalizeQuestorRows(parsed);
    } catch {
      return [];
    }
  }

  if (typeof data === 'object') {
    const objectData = data as Record<string, unknown>;
    for (const candidateKey of ['data', 'rows', 'items', 'result', 'results']) {
      if (candidateKey in objectData) {
        const nested = normalizeQuestorRows(objectData[candidateKey]);
        if (nested.length > 0) return nested;
      }
    }
    return [normalizeRowKeys(objectData)];
  }

  return [];
}

async function ensureFiscalAccess() {
  const session = await getSession();
  if (!session) {
    throw new Error('Nao autorizado.');
  }

  if (session.role === 'admin') {
    return session;
  }

  const permissions = await getUserPermissions();
  if (!permissions.includes('fiscal.view')) {
    throw new Error('Sem permissao para acessar o modulo Fiscal.');
  }

  return session;
}

async function executeQuestorRows(sql: string) {
  const result = await executeQuestorSQL(sql, 'nrwexJSON');
  if (result.error) {
    throw new Error(result.error);
  }
  return normalizeQuestorRows(result.data);
}

async function queryAggregateSource(
  tableName: 'lctofissaiproduto' | 'lctofisentproduto',
  companyCode: string,
  estabCode: string,
  startIso: string,
  endIso: string,
): Promise<IcmsTotalsSource> {
  let lastError: Error | null = null;

  for (const dateColumn of AGGREGATE_DATE_COLUMNS) {
    const sql = `
      SELECT
        COALESCE(SUM(COALESCE(valortotal, 0)), 0) AS valortotal,
        COALESCE(SUM(COALESCE(basecalculoicms, 0)), 0) AS basecalculoicms,
        COALESCE(SUM(COALESCE(valoricms, 0)), 0) AS valoricms,
        COALESCE(SUM(COALESCE(outrasicms, 0)), 0) AS outrasicms,
        COALESCE(SUM(COALESCE(isentasicms, 0)), 0) AS isentasicms
      FROM ${tableName}
      WHERE codigoempresa = ${companyCode}
        AND codigoestab = ${estabCode}
        AND ${dateColumn} BETWEEN ${toSqlStringDate(startIso)} AND ${toSqlStringDate(endIso)}
    `;

    try {
      const rows = await executeQuestorRows(sql);
      const aggregateRow = rows[0] || {};
      return {
        key: tableName,
        label: ICMS_SOURCE_LABELS[tableName],
        tableName,
        dateColumn,
        totals: {
          valortotal: parseNumber(aggregateRow.valortotal),
          basecalculoicms: parseNumber(aggregateRow.basecalculoicms),
          valoricms: parseNumber(aggregateRow.valoricms),
          outrasicms: parseNumber(aggregateRow.outrasicms),
          isentasicms: parseNumber(aggregateRow.isentasicms),
        },
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Erro ao consultar totalizadores.');
    }
  }

  throw lastError ?? new Error(`Nao foi possivel consultar a tabela ${tableName}.`);
}

async function queryTotalIcmsRows(
  companyCode: string,
  estabCode: string,
  startIso: string,
  endIso: string,
) {
  let lastError: Error | null = null;

  for (const descriptionColumn of OPERACAO_DESCRIPTION_COLUMNS) {
    const sql = `
      SELECT
        t.codigoempresa,
        t.codigoestab,
        t.codigooperacaofis,
        t.datatotal,
        t.valortotal,
        t.seq,
        t.valortexto,
        COALESCE(o.${descriptionColumn}, '') AS descricaooperacaofis
      FROM TOTALICMSRJ t
      LEFT JOIN operacaofis o
        ON o.codigooperacaofis = t.codigooperacaofis
      WHERE t.codigoempresa = ${companyCode}
        AND t.codigoestab = ${estabCode}
        AND t.datatotal BETWEEN ${toSqlStringDate(startIso)} AND ${toSqlStringDate(endIso)}
      ORDER BY t.datatotal, t.seq, t.codigooperacaofis
    `;

    try {
      const rows = await executeQuestorRows(sql);
      return { rows, descriptionColumn };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Erro ao consultar TOTALICMSRJ.');
    }
  }

  throw lastError ?? new Error('Nao foi possivel consultar a tabela TOTALICMSRJ.');
}

function combineAggregateTotals(a: IcmsAggregateTotals, b: IcmsAggregateTotals): IcmsAggregateTotals {
  return {
    valortotal: a.valortotal + b.valortotal,
    basecalculoicms: a.basecalculoicms + b.basecalculoicms,
    valoricms: a.valoricms + b.valoricms,
    outrasicms: a.outrasicms + b.outrasicms,
    isentasicms: a.isentasicms + b.isentasicms,
  };
}

function buildRowsWithSuggestions(
  rows: Record<string, unknown>[],
  consolidatedSource: IcmsTotalsSource,
): TotalIcmsRjRow[] {
  return rows.map((row) => {
    const descricao = String(row.descricaooperacaofis || '');
    const valortexto = String(row.valortexto || '');
    const suggestedMetricKey = suggestMetricFromDescription(descricao, valortexto);
    const suggestedValue = getSourceMetricValue(consolidatedSource, suggestedMetricKey);
    const currentValue = parseNumber(row.valortotal);

    return {
      codigoempresa: String(row.codigoempresa || ''),
      codigoestab: String(row.codigoestab || ''),
      codigooperacaofis: String(row.codigooperacaofis || ''),
      descricaooperacaofis: descricao,
      datatotal: String(row.datatotal || ''),
      valortotal: currentValue,
      seq: String(row.seq || ''),
      valortexto,
      suggestedMetricKey,
      suggestedSourceKey: 'consolidado',
      suggestedValue,
      differenceToSuggestion: suggestedValue - currentValue,
    };
  });
}

export async function fetchIcmsApuracao(filters: ApuracaoIcmsFilters) {
  try {
    await ensureFiscalAccess();

    const companyCode = parseNumericCode(filters.companyCode, 'Codigo da empresa');
    const estabCode = parseNumericCode(filters.estabCode, 'Codigo da filial');
    const startIso = parseDateInput(filters.startDate, 'Data inicial');
    const endIso = parseDateInput(filters.endDate, 'Data final');

    if (startIso > endIso) {
      return { success: false, error: 'A data inicial deve ser menor ou igual a data final.' };
    }

    const [totalIcmsResult, saidaSource, entradaSource] = await Promise.all([
      queryTotalIcmsRows(companyCode, estabCode, startIso, endIso),
      queryAggregateSource('lctofissaiproduto', companyCode, estabCode, startIso, endIso),
      queryAggregateSource('lctofisentproduto', companyCode, estabCode, startIso, endIso),
    ]);

    const consolidatedTotals = combineAggregateTotals(saidaSource.totals, entradaSource.totals);
    const consolidatedSource: IcmsTotalsSource = {
      key: 'consolidado',
      label: ICMS_SOURCE_LABELS.consolidado,
      tableName: 'consolidado',
      dateColumn: `${saidaSource.dateColumn} + ${entradaSource.dateColumn}`,
      totals: consolidatedTotals,
    };

    const rows = buildRowsWithSuggestions(totalIcmsResult.rows, consolidatedSource);
    const totalIcmsRjAtual = rows.reduce((acc, row) => acc + row.valortotal, 0);

    return {
      success: true,
      data: {
        filters: {
          companyCode,
          estabCode,
          startDate: filters.startDate,
          endDate: filters.endDate,
        },
        metadata: {
          totalicmsrjDateColumn: 'datatotal',
          operacaoDescriptionColumn: totalIcmsResult.descriptionColumn,
          saidaDateColumn: saidaSource.dateColumn,
          entradaDateColumn: entradaSource.dateColumn,
        },
        comparison: {
          totalIcmsRjAtual,
          valorIcmsConsolidado: consolidatedSource.totals.valoricms,
          diferencaIcms: consolidatedSource.totals.valoricms - totalIcmsRjAtual,
        },
        sources: {
          lctofissaiproduto: saidaSource,
          lctofisentproduto: entradaSource,
          consolidado: consolidatedSource,
        },
        rows,
      },
    };
  } catch (error) {
    console.error('Erro ao consultar Apuracao ICMS:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao consultar a Apuracao ICMS.',
    };
  }
}

export async function updateTotalIcmsRjValue(input: UpdateTotalIcmsRjInput) {
  try {
    await ensureFiscalAccess();

    const companyCode = parseNumericCode(input.companyCode, 'Codigo da empresa');
    const estabCode = parseNumericCode(input.estabCode, 'Codigo da filial');
    const operationCode = parseNumericCode(input.operationCode, 'Codigo da operacao fiscal');
    const seq = parseNumericCode(input.seq, 'Sequencia');
    const totalDate = parseDateInput(input.totalDate, 'Data do total');
    const newValue = Number(input.newValue);

    if (!Number.isFinite(newValue)) {
      return { success: false, error: 'Valor informado para atualizacao invalido.' };
    }

    const updateSql = `
      UPDATE TOTALICMSRJ
      SET valortotal = ${toSqlDecimal(newValue)}
      WHERE codigoempresa = ${companyCode}
        AND codigoestab = ${estabCode}
        AND codigooperacaofis = ${operationCode}
        AND datatotal = ${toSqlStringDate(totalDate)}
        AND seq = ${seq}
    `;

    const updateResult = await executeQuestorSQL(updateSql, 'nrwexJSON');
    if (updateResult.error) {
      return { success: false, error: updateResult.error };
    }

    const selectSql = `
      SELECT
        codigoempresa,
        codigoestab,
        codigooperacaofis,
        datatotal,
        valortotal,
        seq,
        valortexto
      FROM TOTALICMSRJ
      WHERE codigoempresa = ${companyCode}
        AND codigoestab = ${estabCode}
        AND codigooperacaofis = ${operationCode}
        AND datatotal = ${toSqlStringDate(totalDate)}
        AND seq = ${seq}
    `;

    const rows = await executeQuestorRows(selectSql);
    const updatedRow = rows[0] || {};

    return {
      success: true,
      data: {
        codigoempresa: String(updatedRow.codigoempresa || companyCode),
        codigoestab: String(updatedRow.codigoestab || estabCode),
        codigooperacaofis: String(updatedRow.codigooperacaofis || operationCode),
        datatotal: String(updatedRow.datatotal || totalDate),
        seq: String(updatedRow.seq || seq),
        valortotal: parseNumber(updatedRow.valortotal || newValue),
        valortexto: String(updatedRow.valortexto || ''),
        selectionKey: buildRowSelectionKey({
          codigooperacaofis: String(updatedRow.codigooperacaofis || operationCode),
          datatotal: String(updatedRow.datatotal || totalDate),
          seq: String(updatedRow.seq || seq),
        }),
      },
    };
  } catch (error) {
    console.error('Erro ao atualizar TOTALICMSRJ:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao atualizar TOTALICMSRJ.',
    };
  }
}

export function getDefaultIcmsSources() {
  return {
    lctofissaiproduto: {
      key: 'lctofissaiproduto' as IcmsSourceKey,
      label: ICMS_SOURCE_LABELS.lctofissaiproduto,
      tableName: 'lctofissaiproduto',
      dateColumn: '',
      totals: createEmptyAggregateTotals(),
    },
    lctofisentproduto: {
      key: 'lctofisentproduto' as IcmsSourceKey,
      label: ICMS_SOURCE_LABELS.lctofisentproduto,
      tableName: 'lctofisentproduto',
      dateColumn: '',
      totals: createEmptyAggregateTotals(),
    },
    consolidado: {
      key: 'consolidado' as IcmsSourceKey,
      label: ICMS_SOURCE_LABELS.consolidado,
      tableName: 'consolidado',
      dateColumn: '',
      totals: createEmptyAggregateTotals(),
    },
  };
}
