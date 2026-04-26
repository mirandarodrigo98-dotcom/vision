'use server';

import db from '@/lib/db';
import { executeQuestorProcess } from './questor-syn';
import Papa from 'papaparse';
import { startOfMonth, endOfMonth, format, parseISO } from 'date-fns';
import crypto from 'crypto';
import { getSession } from '@/lib/auth';

interface SimplesNacionalParams {
  companyId: string;
  startCompetence: string; // YYYY-MM
  endCompetence: string;   // YYYY-MM
}

export interface SimplesNacionalBillingData {
  company_id: string;
  competence: string;
  rpa_competence: number;
  rpa_cash: number;
  rpa_accumulated: number;
  rbt12: number;
  rba: number;
  rbaa: number;
  payroll_12_months: number;
  recebimento?: number;
  aliquota_efetiva?: number;
}

function parseQuestorSimplesGrid(resultAny: any, params: SimplesNacionalParams): SimplesNacionalBillingData[] | { error: string } {
    let csvData = '';
    if (typeof resultAny.data === 'string') {
        csvData = resultAny.data;
    } else if (typeof resultAny.data === 'object') {
        const dataObj = resultAny.data as any;
        if (dataObj.Exception) return { error: `Erro Questor: ${dataObj.Exception}` };
        if (dataObj.Message) return { error: `Erro Questor: ${dataObj.Message}` };
        if (dataObj.Erro) return { error: `Erro Questor: ${dataObj.Erro}` };
        
        if (dataObj.Data) {
            csvData = dataObj.Data;
        } else if (Array.isArray(dataObj) && dataObj.length > 0 && (dataObj[0].SEQ || dataObj[0].DESCRICAO)) {
             try {
                 csvData = Papa.unparse(dataObj, { delimiter: ';' });
             } catch (e) {
                 return { error: 'Erro ao processar array JSON do Questor' };
             }
        } else if (dataObj.FormClass && dataObj.Widgets) {
             try {
                const bottom = dataObj.Widgets?.bottom || [];
                let foundData: any[] = [];
                for (const b of bottom) {
                    if (b.Itens) {
                        for (const item of b.Itens) {
                            if (item.grids) {
                                for (const grid of item.grids) {
                                    const gridItems = grid.items || grid.dados;
                                    if (gridItems && Array.isArray(gridItems) && gridItems.length > 0) {
                                        const isHistory = (grid.Caption && grid.Caption.includes('12 Meses')) || (grid.nomegrid && grid.nomegrid.includes('Anteriores'));
                                        if (!isHistory) {
                                            foundData = gridItems;
                                            break;
                                        } else if (foundData.length === 0) {
                                            foundData = gridItems;
                                        }
                                    }
                                }
                            }
                            if (foundData.length > 0) break;
                        }
                    }
                    if (foundData.length > 0) break;
                }

                if (foundData.length > 0) {
                    csvData = Papa.unparse(foundData, { delimiter: ';' });
                } else {
                     return { error: 'Nenhum dado encontrado na resposta do Questor (Grid vazia)' };
                }

             } catch (e) {
                 return { error: 'Erro ao processar estrutura JSON do Questor' };
             }
        } else {
            return { error: `Resposta inesperada do Questor: ${JSON.stringify(dataObj).substring(0, 100)}...` };
        }
    }

    const parsed = Papa.parse(csvData, { header: true, skipEmptyLines: true, delimiter: ';' });

    if (parsed.errors.length > 0 && parsed.data.length === 0) {
      return { error: 'Erro ao processar o arquivo CSV retornado' };
    }
    
    const rows = parsed.data as any[];

    const parseValue = (val: any): number => {
      if (typeof val === 'number') return val;
      if (!val) return 0;
      if (typeof val !== 'string') return 0;
      const v = val.toString().replace(/[^\d,.-]/g, '').trim();
      if (v === '') return 0;
      const lastComma = v.lastIndexOf(',');
      const lastDot = v.lastIndexOf('.');
      if (lastComma > lastDot) {
           const clean = v.replace(/\./g, '').replace(',', '.');
           return parseFloat(clean) || 0;
      } else if (lastDot > -1) {
          const clean = v.replace(/,/g, '');
          return parseFloat(clean) || 0;
      } else {
          return parseFloat(v) || 0;
      }
    };

    const processedData: SimplesNacionalBillingData[] = [];
    if (rows.length === 0) return [];

    const headerKeys = Object.keys(rows[0]);
    const findKey = (search: string, exclude?: string) => 
      headerKeys.find(k => {
        const keyLower = k.toLowerCase();
        const searchLower = search.toLowerCase();
        if (exclude && keyLower.includes(exclude.toLowerCase())) return false;
        return keyLower.includes(searchLower);
      });

    const colCompetence = findKey('Competência') || findKey('Mes') || findKey('Mês');
    const colDescription = findKey('Descrição') || findKey('Descricao') || findKey('Historico');
    const hasMonthColumns = headerKeys.some(k => k.match(/^([A-Z]{3}\d{4})(_|$)/));

    if (!hasMonthColumns && colCompetence && !colDescription) {
        const colRpaCompetence = findKey('RPA Competência') || findKey('RPA Comp') || findKey('Receita');
        const colRpaCash = findKey('RPA Caixa');
        const colRecebimento = findKey('Recebimento') || findKey('Mercado Interno Caixa') || findKey('Receita do PA - Mercado Interno Caixa');
        const colRpaAccumulated = findKey('Acumulado') || findKey('Acum');
        const colRbt12 = findKey('RBT12');
        const colRba = findKey('RBA', 'RBAA'); 
        const colRbaa = findKey('RBAA');
        const colAliquotaEfetiva = findKey('Alíquota') || findKey('Aliquota') || findKey('Aliq Efetiva');

        for (const row of rows) {
            if (!row[colCompetence]) continue;
            let competence = '';
            const compVal = row[colCompetence];
            if (compVal.includes('/')) {
                const [mm, yyyy] = compVal.split('/');
                if (mm.length <= 2 && yyyy.length === 4) competence = `${yyyy}-${mm.padStart(2, '0')}`;
            } else if (compVal.match(/^[A-Z][a-z]{2}\d{4}$/)) { 
                const months: {[k:string]:string} = {Jan:'01',Fev:'02',Mar:'03',Abr:'04',Mai:'05',Jun:'06',Jul:'07',Ago:'08',Set:'09',Out:'10',Nov:'11',Dez:'12'};
                const mStr = compVal.substring(0,3);
                const yStr = compVal.substring(3);
                if (months[mStr]) competence = `${yStr}-${months[mStr]}`;
            } else {
                 competence = compVal.substring(0, 7);
            }

            if (!competence || competence < params.startCompetence || competence > params.endCompetence) continue;

            processedData.push({
                company_id: params.companyId,
                competence,
                rpa_competence: parseValue(colRpaCompetence ? row[colRpaCompetence] : '0'),
                recebimento: parseValue(colRecebimento ? row[colRecebimento] : '0'),
                rpa_cash: parseValue(colRpaCash ? row[colRpaCash] : '0'),
                rpa_accumulated: parseValue(colRpaAccumulated ? row[colRpaAccumulated] : '0'),
                rbt12: parseValue(colRbt12 ? row[colRbt12] : '0'),
                rba: parseValue(colRba ? row[colRba] : '0'),
                rbaa: parseValue(colRbaa ? row[colRbaa] : '0'),
                aliquota_efetiva: parseValue(colAliquotaEfetiva ? row[colAliquotaEfetiva] : '0'),
                payroll_12_months: 0
            });
        }
    } else {
        const monthsMap: {[key: string]: string} = {JAN:'01',FEV:'02',MAR:'03',ABR:'04',MAI:'05',JUN:'06',JUL:'07',AGO:'08',SET:'09',OUT:'10',NOV:'11',DEZ:'12'};
        const monthPrefixes = new Set<string>();
        headerKeys.forEach(k => {
             const match = k.match(/^([A-Z]{3}\d{4})(_|$)/);
             if (match) monthPrefixes.add(match[1]);
        });

        const monthData: {[competence: string]: Partial<SimplesNacionalBillingData> & { _aliquotas?: number[] }} = {};

        for (const mPrefix of monthPrefixes) {
             const mStr = mPrefix.substring(0,3);
             const yStr = mPrefix.substring(3);
             if (!monthsMap[mStr]) continue;
             const competence = `${yStr}-${monthsMap[mStr]}`;
             
             if (competence < params.startCompetence || competence > params.endCompetence) continue;

             monthData[competence] = {
                 company_id: params.companyId,
                 competence,
                 rpa_competence: 0, rpa_cash: 0, rpa_accumulated: 0, rbt12: 0, rba: 0, rbaa: 0, payroll_12_months: 0, recebimento: 0, aliquota_efetiva: 0,
                 _aliquotas: []
             };
        }

        for (const row of rows) {
            let rawDesc = '';
            if (colDescription) {
                rawDesc = row[colDescription] || '';
            } else if (headerKeys.length > 0) {
                 rawDesc = row[headerKeys[0]] || '';
            }
            
            let desc = rawDesc.replace(/&nbsp;/gi, ' ').replace(/&NBSP/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

            for (const mPrefix of monthPrefixes) {
                const mStr = mPrefix.substring(0,3);
                const yStr = mPrefix.substring(3);
                if (!monthsMap[mStr]) continue;
                const competence = `${yStr}-${monthsMap[mStr]}`;
                
                if (monthData[competence]) {
                     let aliqStr = row[`${mPrefix}_ALIQUOTA`] || row[`${mPrefix}_ALIQ`];
                     if (!aliqStr) {
                         const aliqKey = headerKeys.find(k => k.startsWith(mPrefix) && (k.toUpperCase().includes('ALIQUOTA') || k.toUpperCase().includes('ALIQ')));
                         if (aliqKey) aliqStr = row[aliqKey];
                     }

                     if (aliqStr) {
                         const aliqVal = parseValue(aliqStr);
                         if (aliqVal > 0) {
                             const monthDataEntry = monthData[competence] as any;
                             if (!monthDataEntry._aliquotas) monthDataEntry._aliquotas = [];
                             if (!monthDataEntry._aliquotas.includes(aliqVal)) {
                                 monthDataEntry._aliquotas.push(aliqVal);
                             }
                         }
                     }
                }
            }

            let targetField: keyof SimplesNacionalBillingData | null = null;
            
            if (desc.includes('RBT12 - TOTAL')) targetField = 'rbt12';
            else if (desc.includes('RBA - TOTAL')) targetField = 'rba';
            else if (desc.includes('RBAA - TOTAL')) targetField = 'rbaa';
            else if (desc.includes('RECEITA DO PA - TOTAL')) targetField = 'rpa_competence';
            else if (desc.includes('RECEITA DO PA - MERCADO INTERNO CAIXA')) targetField = 'recebimento';
            else if (desc.includes('RECEITA DO PA - MERCADO INTERNO') && desc.includes('CAIXA')) targetField = 'recebimento';
            else if (desc.includes('RECEITA DO PA') && desc.includes('MERCADO') && desc.includes('CAIXA')) targetField = 'recebimento';
            else if (desc.includes('RECEITA') && desc.includes('MERCADO INTERNO') && desc.includes('CAIXA')) targetField = 'recebimento';
            else if (desc.includes('RECEITA') && desc.includes('MERCADO') && desc.includes('CAIXA')) targetField = 'recebimento';
            else if (desc.includes('RECEITA') && desc.includes('CAIXA')) targetField = 'recebimento';
            else if (desc.includes('MERCADO INTERNO') && desc.includes('CAIXA')) targetField = 'recebimento';
            else if (desc.includes('RECEBIMENTO') || desc.includes('RECEBIMENTOS')) targetField = 'recebimento';
            else if (desc.includes('MERCADO INTERNO')) targetField = 'recebimento';
            else if (desc.includes('RBT12') && desc.includes('TOTAL')) targetField = 'rbt12';
            else if (desc.includes('RBA') && desc.includes('TOTAL') && !desc.includes('RBAA')) targetField = 'rba';
            else if (desc.includes('RBAA') && desc.includes('TOTAL')) targetField = 'rbaa';
            else if (desc.includes('RECEITA DO PA') && desc.includes('TOTAL')) targetField = 'rpa_competence';
            else if (desc.includes('RECEITA') && desc.includes('PA') && desc.includes('TOTAL')) targetField = 'rpa_competence';
            else if (desc.includes('FOLHA') && desc.includes('ENCARGOS') && (desc.includes('MES') || desc.includes('MENSAL')) && !desc.includes('ANTERIORES') && !desc.includes('ACUMULADO') && !desc.includes('12 MESES') && !desc.includes('13') && !desc.includes('DECIMO')) {
                 targetField = 'rpa_accumulated';
            }
            else if (desc.includes('FOLHA') && desc.includes('ENCARGOS') && desc.includes('ANTERIORES')) {
                 targetField = 'payroll_12_months';
            }

            if (targetField) {
                for (const mPrefix of monthPrefixes) {
                    const mStr = mPrefix.substring(0,3);
                    const yStr = mPrefix.substring(3);
                    if (!monthsMap[mStr]) continue;
                    const competence = `${yStr}-${monthsMap[mStr]}`;
                    
                    if (monthData[competence]) {
                        let valStr = '';
                        
                        if (targetField === 'rpa_competence' || targetField === 'recebimento') {
                             valStr = row[`${mPrefix}_VALOR`] || row[`${mPrefix}_BASE`] || row[`${mPrefix}`];
                             if (!valStr) {
                                 const valKey = headerKeys.find(k => k.startsWith(mPrefix) && k.toUpperCase().includes('VALOR'));
                                 if (valKey) valStr = row[valKey];
                             }
                             if (!valStr) {
                                 const baseKey = headerKeys.find(k => k.startsWith(mPrefix) && k.toUpperCase().includes('BASE'));
                                 if (baseKey) valStr = row[baseKey];
                             }
                             if (!valStr) {
                                 const fallbackKey = headerKeys.find(k => k.startsWith(mPrefix) && row[k] && row[k].trim() !== '' && row[k] !== '0,00' && row[k] !== '0.00' && row[k] !== '0');
                                 if (fallbackKey && !fallbackKey.toUpperCase().includes('ALIQ')) {
                                     valStr = row[fallbackKey];
                                 }
                             }
                        } else if (targetField === 'rbt12' || targetField === 'rba' || targetField === 'rbaa') {
                             valStr = row[`${mPrefix}_BASE`] || row[`${mPrefix}_VALOR`] || row[`${mPrefix}`];
                        } else if (targetField === 'rpa_accumulated' || targetField === 'payroll_12_months') {
                             valStr = row[`${mPrefix}_VALOR`] || row[`${mPrefix}_BASE`] || row[`${mPrefix}`];
                        } else {
                             const potentialKeys = [`${mPrefix}_BASE`, `${mPrefix}_VALOR`, `${mPrefix}`, `${mPrefix}_SIMPLES`];
                             for (const pk of potentialKeys) {
                                if (row[pk] && row[pk].trim() !== '') {
                                    valStr = row[pk];
                                    break;
                                }
                             }
                        }
                        
                        if (!valStr) {
                             const anyKey = headerKeys.find(k => k.startsWith(mPrefix) && row[k] && row[k].trim() !== '');
                             if (anyKey) valStr = row[anyKey];
                        }

                        if (valStr) {
                             const val = parseValue(valStr);
                             const currentVal = (monthData[competence] as any)[targetField] || 0;
                             if (val > 0) {
                                 (monthData[competence] as any)[targetField] = currentVal + val;
                             } else if (currentVal === 0) {
                                 (monthData[competence] as any)[targetField] = 0;
                             }
                        }
                    }
                }
            }
        }

        Object.values(monthData).forEach(d => {
            const md = d as any;
            if (md._aliquotas && md._aliquotas.length > 0) {
                const sum = md._aliquotas.reduce((a: number, b: number) => a + b, 0);
                md.aliquota_efetiva = sum / md._aliquotas.length;
            }
            delete md._aliquotas;
            processedData.push(md as SimplesNacionalBillingData);
        });
    }

    return processedData;
}

export async function fetchSimplesNacionalBilling(params: SimplesNacionalParams) {
  const session = await getSession();
  if (!session) return { success: false, error: 'Não autorizado' };

  if (session.role === 'client_user') {
    const hasAccess = (await db.query(`SELECT 1 FROM user_companies WHERE user_id = $1 AND company_id = $2`, [session.user_id, params.companyId])).rows[0];
    if (!hasAccess) return { success: false, error: 'Sem permissão para esta empresa.' };
  } else if (session.role === 'operator') {
    const restricted = (await db.query(`SELECT 1 FROM user_restricted_companies WHERE user_id = $1 AND company_id = $2`, [session.user_id, params.companyId])).rows[0];
    if (restricted) return { success: false, error: 'Sem permissão para esta empresa.' };
  }

  try {
    // 1. Get Company Code
    const company = (await db.query(`SELECT code, filial FROM client_companies WHERE id = $1`, [params.companyId])).rows[0] as { code: number, filial: number } | undefined;

    if (!company) {
      return { error: 'Empresa não encontrada' };
    }

    // 2. Prepare Questor Params
    // Questor treats competence dates as the first day of the month
    const startDate = startOfMonth(parseISO(params.startCompetence + '-01'));
    const endDate = startOfMonth(parseISO(params.endCompetence + '-01'));

    const questorParams = {
      pCodigoEmpresa: company.code.toString(),
      pFilial: company.filial ? company.filial.toString() : '1', // Assuming filial might be needed, default 1
      pCompetInicial: format(startDate, 'dd/MM/yyyy'),
      pCompetFinal: format(endDate, 'dd/MM/yyyy'),
      pDetalhar: '0', // Não
      pOcultar: '1', // Sim
    };
    
    // 3. Execute Routine
    const result = await executeQuestorProcess('TnFisDPGerarSSimplesFederal', questorParams);

    if (result.error) {
      return { success: false, error: result.error };
    }

    if (!result.data) {
      return { success: false, error: 'Dados vazios retornados pelo Questor' };
    }

    let processedData = parseQuestorSimplesGrid(result, params);
    if (!Array.isArray(processedData)) {
        return { success: false, error: processedData.error };
    }

    // FALLBACK: If missing Folha data, try TnFisDPAnaliseSSimples
    const missingFolhaMonths = processedData.filter(d => d.rpa_accumulated === 0 && d.payroll_12_months === 0);
    if (missingFolhaMonths.length > 0 || processedData.length === 0) {
        const analiseParams = {
            pCodigoEmpresa: company.code.toString(),
            pFilial: company.filial ? company.filial.toString() : '1',
            pCompetInicial: format(startDate, 'dd/MM/yyyy'),
            pCompetFinal: format(endDate, 'dd/MM/yyyy'),
            pDetalhar: '0',
            pOcultar: '1'
        };
        const resultAnalise = await executeQuestorProcess('TnFisDPAnaliseSSimples', analiseParams);
        if (!resultAnalise.error && resultAnalise.data) {
            const analiseData = parseQuestorSimplesGrid(resultAnalise, params);
            if (Array.isArray(analiseData)) {
                if (processedData.length === 0) {
                    processedData = analiseData;
                } else {
                    for (const item of processedData) {
                        if (item.rpa_accumulated === 0 && item.payroll_12_months === 0) {
                            const analiseItem = analiseData.find(a => a.competence === item.competence);
                            if (analiseItem) {
                                item.rpa_accumulated = analiseItem.rpa_accumulated;
                                item.payroll_12_months = analiseItem.payroll_12_months;
                            }
                        }
                    }
                }
            }
        }
    }

    if (processedData.length > 0) {
        // Use a transaction to batch insert/update
        const insertMany = db.transaction(async (data: SimplesNacionalBillingData[]) => {
            for (const item of data) {
                const id = crypto.randomUUID();
                await db.query(`
                  INSERT INTO simples_nacional_billing (
                    id, company_id, competence, rpa_competence, rpa_cash, rpa_accumulated, rbt12, rba, rbaa, payroll_12_months, recebimento, aliquota_efetiva, updated_at
                  ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW()
                  )
                  ON CONFLICT(company_id, competence) DO UPDATE SET
                    rpa_competence = excluded.rpa_competence,
                    rpa_cash = excluded.rpa_cash,
                    rpa_accumulated = excluded.rpa_accumulated,
                    rbt12 = excluded.rbt12,
                    rba = excluded.rba,
                    rbaa = excluded.rbaa,
                    payroll_12_months = excluded.payroll_12_months,
                    recebimento = excluded.recebimento,
                    aliquota_efetiva = excluded.aliquota_efetiva,
                    updated_at = NOW()
                `, [id, item.company_id, item.competence, item.rpa_competence, item.rpa_cash, item.rpa_accumulated, item.rbt12, item.rba, item.rbaa, item.payroll_12_months, item.recebimento || 0, item.aliquota_efetiva || 0]);
            }
        });
        
        await insertMany(processedData);
    }
    
    return { success: true, count: processedData.length };

  } catch (error: any) {
    console.error('Error fetching Simples Nacional billing:', error);
    return { success: false, error: error.message || 'Erro interno ao buscar faturamento' };
  }
}

export async function getStoredSimplesNacionalBilling(companyId: string, startCompetence: string, endCompetence: string) {
  try {
    const data = (await db.query(`
      SELECT * FROM simples_nacional_billing
      WHERE company_id = $1 
      AND competence >= $2 
      AND competence <= $3
      ORDER BY competence ASC
    `, [companyId, startCompetence, endCompetence])).rows;
    
    return { success: true, data };
  } catch (error: any) {
    console.error('Error getting stored Simples Nacional billing:', error);
    return { success: false, error: `Erro ao buscar dados salvos: ${error.message}` };
  }
}
