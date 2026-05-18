'use server';

import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

import { executeQuestorProcess } from './integrations/questor-syn';
import { getZenClientByCnpj, findZenCategoryByNames, getZenVariableEvents, sendQuestorZenRegFormByClient } from './integrations/questor-zen';

export type PayrollEvent = {
  codigo: string;
  descricao: string;
  referencia: 'Hora' | 'Valor' | 'Dia';
  tipo: 'Provento' | 'Desconto';
};

type RegistroWebEventoVariavelZen = {
  CODIGOEMPRESA?: string;
  CODIGOPERCALCULO?: string;
  CODIGOPERCALCULO_RESULTFIELD?: string;
  SEQ?: string;
  CODIGOFUNCCONTR?: string;
  CODIGOFUNCCONTR_RESULTFIELD?: string;
  CODIGOEVENTO?: string;
  CODIGOEVENTO_RESULTFIELD?: string;
  REFEREVENTO?: string;
  VALOREVENTO?: string;
  CODIGOBENEF?: string;
  CODIGOBENEF_RESULTFIELD?: string;
  CODIGOCENTROCUSTO?: string;
  CODIGOCENTROCUSTO_RESULTFIELD?: string;
  CODIGOOUTEMP?: string;
  CODIGOOUTEMP_RESULTFIELD?: string;
  CODIGOPROFTIPOAULA?: string;
  CODIGOPROFTIPOAULA_RESULTFIELD?: string;
  BUSCARULTVALORCALC?: string;
  ORIGEMDADO?: string;
  REFERVALOR?: string;
};

type QuestorProcessEventRow = Record<string, unknown>;
type PayrollVariablesPayload = {
  selectedEvents: string[];
  employeeValues: Record<string, Record<string, string>>;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function scoreNormalizedQuestorText(value: string): number {
  let score = 0;
  if (/[A-Za-z]/.test(value)) score += 1;
  if (/[ÁÀÃÂÉÊÍÓÔÕÚÜÇáàãâéêíóôõúüç]/.test(value)) score += 3;
  if (value.includes('�')) score -= 4;
  if (/[ÃÂ�├┬]/.test(value)) score -= 3;
  return score;
}

function decodeCp437Utf8Mojibake(value: string): string {
  if (!/[├┬╞╟╔╚╩╦╠╣╬╨╤╥]/.test(value)) {
    return value;
  }

  try {
    const decoder = new TextDecoder('ibm437');
    const inverseMap = new Map<string, number>();
    for (let index = 0; index <= 255; index += 1) {
      inverseMap.set(decoder.decode(Uint8Array.of(index)), index);
    }

    const bytes: number[] = [];
    for (const char of value) {
      if (char.charCodeAt(0) <= 0x7f) {
        bytes.push(char.charCodeAt(0));
        continue;
      }

      const byte = inverseMap.get(char);
      if (byte === undefined) {
        return value;
      }
      bytes.push(byte);
    }

    return Buffer.from(bytes).toString('utf8');
  } catch {
    return value;
  }
}

function normalizeQuestorText(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';

  let normalized = raw;
  if (/[ÃÂ�├┬]/.test(normalized)) {
    try {
      normalized = Buffer.from(normalized, 'latin1').toString('utf8');
    } catch {
      normalized = raw;
    }
  }

  const cp437Candidate = decodeCp437Utf8Mojibake(raw);
  if (scoreNormalizedQuestorText(cp437Candidate) > scoreNormalizedQuestorText(normalized)) {
    normalized = cp437Candidate;
  }

  return normalized
    .replace(/&nbsp;?/gi, ' ')
    .replace(/;/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatarValorQuestorWeb(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';

  if (raw.includes(':')) {
    return raw.replace(/[^\d:]/g, '');
  }

  const compact = raw.replace(/\s+/g, '');
  if (compact.includes(',')) {
    return compact.replace(/\.(?=\d{3}(?:\D|$))/g, '');
  }

  if (/^\d+\.\d{1,2}$/.test(compact)) {
    return compact.replace('.', ',');
  }

  return compact;
}

function montarLabelEventoParaPortal(eventInfo?: PayrollEvent): string {
  if (!eventInfo) return '';
  return `${eventInfo.descricao}/${eventInfo.referencia}`.trim();
}

function montarCabecalhoEventoPortal(eventCode: string, eventInfo?: PayrollEvent): string {
  const descricao = (eventInfo?.descricao || '').split('/')[0].trim();
  return `(${eventCode})  ${descricao || eventCode}`;
}

function formatCpf(cpf?: string | null): string {
  const digits = String(cpf || '').replace(/\D/g, '');
  if (digits.length !== 11) return '';
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function montarNomeFuncionarioGrid(employee: { name: string; cpf?: string }) {
  const formattedCpf = formatCpf(employee.cpf);
  return formattedCpf ? `${employee.name} (${formattedCpf})` : employee.name;
}

function montarValorGridPortal(record: RegistroWebEventoVariavelZen): string {
  return String(record.REFEREVENTO || record.REFERVALOR || record.VALOREVENTO || '').trim();
}

// Function to fetch events from Questor SYN
export async function getPayrollEvents(companyId: string, bypassAuth = false): Promise<{ data?: PayrollEvent[], error?: string }> {
  let sessionUserId: string | undefined;
  if (!bypassAuth) {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };
    sessionUserId = session.user_id;
  }

  try {
    // Estrutura real atual de client_companies não possui integration_code.
    const company = (await db.query(`SELECT code, cnpj FROM client_companies WHERE id = $1`, [companyId])).rows[0];
    if (!company) return { error: 'Empresa não encontrada' };

    const cnpjDigits = String(company.cnpj || '').replace(/\D/g, '');
    const fallbackCompanyCode = cnpjDigits ? String(parseInt(cnpjDigits.substring(0, 8), 10)) : '';
    const companyCode = String(company.code || fallbackCompanyCode || '');

    if (!companyCode) {
      console.warn('[Payroll] Código da empresa não encontrado para busca de eventos.');
      return { data: [] };
    }

    if (sessionUserId) {
      try {
        console.log(`[Payroll] Buscando eventos para a empresa ${companyCode} via portal do Questor Zen`);
        const zenEvents = await getZenVariableEvents(sessionUserId, companyCode, String(company.cnpj || ''));
        if (zenEvents.length > 0) {
          return { data: zenEvents };
        }
      } catch (zenError: unknown) {
        console.warn('[Payroll] Falha ao buscar eventos via portal do Questor Zen, usando fallback da consulta personalizada:', getErrorMessage(zenError));
      }
    }

    console.log(`[Payroll] Buscando eventos para a empresa ${companyCode} via consulta personalizada EventosZen`);

    const result = await executeQuestorProcess('EventosZen', {
      'CODIGOEMPRESA': companyCode,
      'CodigoEmpresa': companyCode,
      'z.CodigoEmpresa': companyCode
    });

    if (!result.error && result.data && Array.isArray(result.data)) {
          const events = result.data.map((item) => {
            const eventRow = item as QuestorProcessEventRow;
            const rawRef = String(eventRow.REFERENCIA || eventRow.TIPO_REFERENCIA || eventRow.referencia || eventRow.REFEREVENTO || eventRow.referevento || eventRow.ReferEvento || 'Valor');
            const rawTipo = String(eventRow.TIPO || eventRow.TIPO_EVENTO || eventRow.tipo || eventRow.TIPOEVENTO || eventRow.tipoevento || eventRow.TipoEvento || 'Provento');
            
            return {
              codigo: String(eventRow.CODIGO || eventRow.CODIGOEVENTO || eventRow.EVENTO || eventRow.codigo || eventRow.codigo_evento || eventRow.evento || eventRow.codigoevento || ''),
              descricao: normalizeQuestorText(eventRow.DESCRICAO || eventRow.NOME || eventRow.descricao || eventRow.nome || eventRow.DESCREVENTO || eventRow.descrevento || 'Evento sem descrição'),
              referencia: rawRef.toLowerCase().includes('hora') ? 'Hora' : rawRef.toLowerCase().includes('dia') ? 'Dia' : 'Valor',
              tipo: rawTipo.toUpperCase().includes('DESC') ? 'Desconto' : 'Provento'
            };
          }).filter(e => e.codigo);
        if (events.length > 0) {
          return { data: events };
        }
        return { data: [] };
    } else {
        console.warn('[Payroll] Custom query EventosZen failed or empty:', result.error);
        return { data: [] }; // No events found for this company
    }
  } catch (error: unknown) {
    console.error('Erro ao buscar eventos:', error);
    // Não quebrar a tela do cliente por erro de integração.
    return { data: [] };
  }
}

export async function getCompanyEmployees(companyId: string) {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  try {
    const employees = (await db.query(`
      SELECT id, code as codigo, name as nome, cpf
      FROM employees
      WHERE company_id = $1 AND is_active = 1
      ORDER BY name ASC
    `, [companyId])).rows;
    
    return { data: employees };
  } catch (error: unknown) {
    return { error: getErrorMessage(error) };
  }
}

export async function savePayrollVariables(
  companyId: string,
  monthReference: string, // YYYY-MM
  eventsData: unknown,
  isDraft: boolean,
  mockSessionUserId?: string
) {
  let sessionUserId = mockSessionUserId;
  if (!sessionUserId) {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };
    sessionUserId = session.user_id;
  }

  try {
    // Save to database
    const status = isDraft ? 'draft' : 'sent';
    
    const result = await db.query(`
      INSERT INTO payroll_variables (company_id, created_by_user_id, month_reference, status, events_data)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [companyId, sessionUserId, monthReference, status, JSON.stringify(eventsData)]);

    const recordId = result.rows[0].id;

    if (!isDraft) {
      // 1. Buscar a empresa para pegar o CNPJ e o Código
      const companyRes = await db.query(`SELECT code, cnpj, nome as name FROM client_companies WHERE id = $1`, [companyId]);
      if (companyRes.rowCount === 0) throw new Error('Empresa não encontrada');
      const company = companyRes.rows[0];

      // 2. Resgatar todos os funcionários da empresa para cruzar o ID com o código
      const employeesRes = await db.query(`SELECT id, code, name, cpf FROM employees WHERE company_id = $1`, [companyId]);
      const empMap: Record<string, {code: string, name: string, cpf?: string}> = {};
      const empByCode: Record<string, {code: string, name: string, cpf?: string}> = {};
      employeesRes.rows.forEach(e => {
        const employeeData = { code: e.code || '', name: e.name || '', cpf: e.cpf || '' };
        empMap[e.id] = employeeData;
        if (employeeData.code) {
          empByCode[String(employeeData.code)] = employeeData;
        }
      });

      // 3. Buscar detalhes dos eventos para saber se é Valor, Hora ou Dia
      const eventsRes = await getPayrollEvents(companyId, !!mockSessionUserId);
      const eventsMap: Record<string, PayrollEvent> = {};
      if (eventsRes.data) {
        eventsRes.data.forEach(e => {
          eventsMap[e.codigo] = e;
        });
      }

      const payload = eventsData as PayrollVariablesPayload;

      const webRecords: RegistroWebEventoVariavelZen[] = [];

      for (const [empId, events] of Object.entries(payload.employeeValues)) {
        const employee = empMap[empId];
        if (!employee?.code) continue;

        for (const [evtCode, value] of Object.entries(events)) {
          if (value && value.trim() !== '') {
            const eventInfo = eventsMap[evtCode];
            const isReference = eventInfo && (eventInfo.referencia === 'Hora' || eventInfo.referencia === 'Dia');
            const portalValue = formatarValorQuestorWeb(value);

            const webRecord: RegistroWebEventoVariavelZen = {
              CODIGOEMPRESA: String(company.code || ''),
              CODIGOPERCALCULO: '',
              CODIGOPERCALCULO_RESULTFIELD: '',
              SEQ: '',
              CODIGOFUNCCONTR: String(employee.code),
              CODIGOFUNCCONTR_RESULTFIELD: employee.name,
              CODIGOEVENTO: `${String(evtCode).trim()} `,
              CODIGOEVENTO_RESULTFIELD: montarLabelEventoParaPortal(eventInfo),
              REFEREVENTO: isReference ? portalValue : '',
              VALOREVENTO: '',
              CODIGOBENEF: '',
              CODIGOBENEF_RESULTFIELD: '',
              CODIGOCENTROCUSTO: '',
              CODIGOCENTROCUSTO_RESULTFIELD: '',
              CODIGOOUTEMP: '',
              CODIGOOUTEMP_RESULTFIELD: '',
              CODIGOPROFTIPOAULA: '',
              CODIGOPROFTIPOAULA_RESULTFIELD: '',
              BUSCARULTVALORCALC: '',
              ORIGEMDADO: '',
              REFERVALOR: isReference ? '' : portalValue,
            };

            webRecords.push(webRecord);
          }
        }
      }

      if (!webRecords.length) {
        throw new Error('Nenhum dado válido para enviar ao Questor Zen.');
      }

      let categoryId = await findZenCategoryByNames('Questor', 'Lançamentos Eventos Variáveis');
      if (!categoryId) {
        console.warn('Categoria Questor não encontrada via API, usando ID fixo da NZD.');
        categoryId = '64b6d631273adf21d4750e53';
      }
      console.log(`[Payroll] Categoria Zen: ${categoryId}`);

      // 7. Pega o código do cliente no Zen baseado no CNPJ
      const zenClientCode = await getZenClientByCnpj(company.cnpj);
      if (!zenClientCode) throw new Error('Cliente não encontrado no Questor Zen usando o CNPJ ' + company.cnpj);
      console.log(`[Payroll] Cliente Zen: ${zenClientCode}`);

      const uniqueEventCodes = Array.from(new Set(
        webRecords.map((record) => String(record.CODIGOEVENTO || '').trim()).filter(Boolean)
      ));

      const groupedRows = new Map<string, { code: string; displayName: string; values: Map<string, string> }>();
      for (const record of webRecords) {
        const employeeCode = String(record.CODIGOFUNCCONTR || '').trim();
        if (!employeeCode) continue;

        if (!groupedRows.has(employeeCode)) {
          const employeeData = empByCode[employeeCode];
          groupedRows.set(employeeCode, {
            code: employeeCode,
            displayName: employeeData ? montarNomeFuncionarioGrid(employeeData) : String(record.CODIGOFUNCCONTR_RESULTFIELD || '').trim(),
            values: new Map<string, string>(),
          });
        }

        groupedRows.get(employeeCode)!.values.set(String(record.CODIGOEVENTO || '').trim(), montarValorGridPortal(record));
      }

      const gridHeaders = [
        'Cod.',
        'Usuário do Cliente',
        ...uniqueEventCodes.map((eventCode) => montarCabecalhoEventoPortal(eventCode, eventsMap[eventCode])),
      ];

      const gridRows = Array.from(groupedRows.values()).map((row) => ([
        row.code,
        row.displayName,
        ...uniqueEventCodes.map((eventCode) => row.values.get(eventCode) || ''),
      ]));

      const webResult = await sendQuestorZenRegFormByClient({
        userId: sessionUserId,
        clientOwnerDocument: zenClientCode,
        companyCode: String(company.code || ''),
        categoryId,
        formName: 'TnFpaDMEventoVariavelZEN',
        formTitle: 'Lançamentos Eventos Variáveis',
        documentSubject: 'Lançamentos Eventos Variáveis',
        documentObservation: 'Importação Vision',
        selectedEvents: uniqueEventCodes,
        selectedEventItems: uniqueEventCodes.map((eventCode) => ({
          code: eventCode,
          label: montarLabelEventoParaPortal(eventsMap[eventCode]),
        })),
        records: webRecords.map((record) =>
          Object.fromEntries(
            Object.entries(record).map(([key, value]) => [key, String(value ?? '')])
          )
        ),
        gridHeaders,
        gridRows,
      });

      if (!webResult.success) {
        throw new Error(`Erro ao integrar com Questor Zen via portal: ${webResult.error}`);
      }

      const syncId = `SYNC-ZEN-WEB-${webResult.documentId || Date.now()}`;
      
      await db.query(`UPDATE payroll_variables SET zen_protocol = $1 WHERE id = $2`, [syncId, recordId]);
      
      revalidatePath('/app/payroll-variables');
      revalidatePath('/admin/payroll-variables');
      
      return { success: true, id: recordId, protocol: syncId, message: 'Lançamento enviado ao Questor Zen pelo fluxo web autenticado com sucesso.' };
    }

    revalidatePath('/app/payroll-variables');
    revalidatePath('/admin/payroll-variables');

    return { success: true, id: recordId, message: 'Rascunho salvo com sucesso.' };

  } catch (error: unknown) {
    console.error('Error saving payroll variables:', error);
    return { error: getErrorMessage(error) || 'Erro ao salvar os lançamentos de variáveis.' };
  }
}
