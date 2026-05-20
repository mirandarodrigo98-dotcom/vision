'use server';

import { Client } from 'pg';
import { format, isValid, parse } from 'date-fns';

import { getUserPermissions } from '@/app/actions/permissions';
import { getPostgreeConfig } from '@/app/actions/integrations/postgree';
import { getSession } from '@/lib/auth';
import {
  buildRowSelectionKey,
  createEmptyAggregateTotals,
  getSourceMetricValue,
  ICMS_SOURCE_LABELS,
  type IcmsAggregateTotals,
  type IcmsSourceKey,
  type IcmsTotalsSource,
  type TotalIcmsRjRow,
  suggestMetricFromDescription,
} from '@/lib/fiscal-icms-apuracao';

const AGGREGATE_DATE_COLUMNS = ['datalcto', 'dataemissao', 'datamovimento', 'dataentrada', 'datasaida', 'data'];
const OPERACAO_DESCRIPTION_COLUMNS = ['descricao', 'descricaofis', 'nome'];
const TOTALICMSRJ_TABLE_CANDIDATES = ['TOTALICMSRJ', 'totalicmsrj'];
const OPERACAOFIS_TABLE_CANDIDATES = ['operacaofis', 'OPERACAOFIS'];
const AGGREGATE_TABLE_CANDIDATES: Record<'lctofissaiproduto' | 'lctofisentproduto', string[]> = {
  lctofissaiproduto: ['lctofissaiproduto', 'LCTOFISSAIPRODUTO'],
  lctofisentproduto: ['lctofisentproduto', 'LCTOFISENTPRODUTO'],
};

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

function quoteIdentifier(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
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

  const normalized = String(value).trim().replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
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

async function withPostgreeClient<T>(callback: (client: Client, schemaName: string) => Promise<T>) {
  const config = await getPostgreeConfig();
  if (!config || !config.is_active) {
    throw new Error('A integração Postgree não está configurada ou está inativa.');
  }

  const client = new Client({
    host: config.host,
    port: config.port,
    database: config.database_name,
    user: config.username,
    password: config.password,
    ssl: config.ssl_enabled ? { rejectUnauthorized: false } : undefined,
  });

  try {
    await client.connect();
    const schemaName = config.schema_name || 'public';
    await client.query(`SET search_path TO ${quoteIdentifier(schemaName)}`);
    return await callback(client, schemaName);
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function queryAggregateSource(
  client: Client,
  tableName: 'lctofissaiproduto' | 'lctofisentproduto',
  companyCode: string,
  estabCode: string,
  startIso: string,
  endIso: string,
): Promise<IcmsTotalsSource> {
  let lastError: Error | null = null;

  for (const tableCandidate of AGGREGATE_TABLE_CANDIDATES[tableName]) {
    for (const dateColumn of AGGREGATE_DATE_COLUMNS) {
      const sql = `
        SELECT
          COALESCE(SUM(COALESCE(valortotal, 0)), 0) AS valortotal,
          COALESCE(SUM(COALESCE(basecalculoicms, 0)), 0) AS basecalculoicms,
          COALESCE(SUM(COALESCE(valoricms, 0)), 0) AS valoricms,
          COALESCE(SUM(COALESCE(outrasicms, 0)), 0) AS outrasicms,
          COALESCE(SUM(COALESCE(isentasicms, 0)), 0) AS isentasicms
        FROM ${quoteIdentifier(tableCandidate)}
        WHERE CAST(codigoempresa AS TEXT) = $1
          AND CAST(codigoestab AS TEXT) = $2
          AND CAST(${quoteIdentifier(dateColumn)} AS DATE) BETWEEN $3::date AND $4::date
      `;

      try {
        const result = await client.query(sql, [companyCode, estabCode, startIso, endIso]);
        const aggregateRow = result.rows[0] || {};
        return {
          key: tableName,
          label: ICMS_SOURCE_LABELS[tableName],
          tableName: tableCandidate,
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
  }

  throw lastError ?? new Error(`Nao foi possivel consultar a tabela ${tableName}.`);
}

async function queryTotalIcmsRows(
  client: Client,
  companyCode: string,
  estabCode: string,
  startIso: string,
  endIso: string,
) {
  let lastError: Error | null = null;

  for (const totalTable of TOTALICMSRJ_TABLE_CANDIDATES) {
    for (const operacaoTable of OPERACAOFIS_TABLE_CANDIDATES) {
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
            COALESCE(o.${quoteIdentifier(descriptionColumn)}, '') AS descricaooperacaofis
          FROM ${quoteIdentifier(totalTable)} t
          LEFT JOIN ${quoteIdentifier(operacaoTable)} o
            ON CAST(o.codigooperacaofis AS TEXT) = CAST(t.codigooperacaofis AS TEXT)
          WHERE CAST(t.codigoempresa AS TEXT) = $1
            AND CAST(t.codigoestab AS TEXT) = $2
            AND CAST(t.datatotal AS DATE) BETWEEN $3::date AND $4::date
          ORDER BY t.datatotal, t.seq, t.codigooperacaofis
        `;

        try {
          const result = await client.query(sql, [companyCode, estabCode, startIso, endIso]);
          return { rows: result.rows, descriptionColumn, tableName: totalTable };
        } catch (error) {
          lastError = error instanceof Error ? error : new Error('Erro ao consultar TOTALICMSRJ.');
        }
      }
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

    return await withPostgreeClient(async (client) => {
      const [totalIcmsResult, saidaSource, entradaSource] = await Promise.all([
        queryTotalIcmsRows(client, companyCode, estabCode, startIso, endIso),
        queryAggregateSource(client, 'lctofissaiproduto', companyCode, estabCode, startIso, endIso),
        queryAggregateSource(client, 'lctofisentproduto', companyCode, estabCode, startIso, endIso),
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
    });
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

    return await withPostgreeClient(async (client) => {
      let lastError: Error | null = null;

      for (const totalTable of TOTALICMSRJ_TABLE_CANDIDATES) {
        const sql = `
          UPDATE ${quoteIdentifier(totalTable)}
          SET valortotal = $1
          WHERE CAST(codigoempresa AS TEXT) = $2
            AND CAST(codigoestab AS TEXT) = $3
            AND CAST(codigooperacaofis AS TEXT) = $4
            AND CAST(datatotal AS DATE) = $5::date
            AND CAST(seq AS TEXT) = $6
          RETURNING codigoempresa, codigoestab, codigooperacaofis, datatotal, valortotal, seq, valortexto
        `;

        try {
          const result = await client.query(sql, [newValue, companyCode, estabCode, operationCode, totalDate, seq]);
          const updatedRow = result.rows[0];

          if (!updatedRow) {
            return { success: false, error: 'Nenhum registro da TOTALICMSRJ foi atualizado com os critérios informados.' };
          }

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
          lastError = error instanceof Error ? error : new Error('Erro ao atualizar TOTALICMSRJ.');
        }
      }

      return {
        success: false,
        error: lastError?.message || 'Erro ao atualizar TOTALICMSRJ.',
      };
    });
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
