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

    const resultAny = result as any;

    let csvData = '';
    if (typeof resultAny.data === 'string') {
        csvData = resultAny.data;
    } else if (typeof resultAny.data === 'object') {
        // Check for common error fields in JSON
        const dataObj = resultAny.data as any;
        if (dataObj.Exception) return { success: false, error: `Erro Questor: ${dataObj.Exception}` };
        if (dataObj.Message) return { success: false, error: `Erro Questor: ${dataObj.Message}` };
        if (dataObj.Erro) return { success: false, error: `Erro Questor: ${dataObj.Erro}` };
        
        // If it's a JSON with Data field inside (nested)
        if (dataObj.Data) {
            csvData = dataObj.Data;
        } else if (Array.isArray(dataObj) && dataObj.length > 0 && (dataObj[0].SEQ || dataObj[0].DESCRICAO)) {
             // Handle raw JSON array with SEQ, TIPO, DESCRICAO, etc.
             console.log('Detected flat JSON array from Questor, converting to CSV');
             try {
                 csvData = Papa.unparse(dataObj, { delimiter: ';' });
             } catch (e) {
                 console.error('Error unparsing raw JSON array:', e);
                 return { success: false, error: 'Erro ao processar array JSON do Questor' };
             }
        } else if (dataObj.FormClass && dataObj.Widgets) {
             // Handle FormClass/Widgets structure (Questor Grid Response)
             // Structure: { Widgets: { bottom: [ { Itens: [ { grids: [ { nomegrid: "...", dados: [ ... ] } ] } ] } ] } }
             try {
                // Navigate deep structure to find 'dados'
                const bottom = dataObj.Widgets?.bottom || [];
                let foundData: any[] = [];
                
                for (const b of bottom) {
                    if (b.Itens) {
                        for (const item of b.Itens) {
                            if (item.grids) {
                                for (const grid of item.grids) {
                                    // Check for 'items' (seen in logs) or 'dados'
                                    const gridItems = grid.items || grid.dados;
                                    if (gridItems && Array.isArray(gridItems) && gridItems.length > 0) {
                                        // Prefer the grid that is NOT "12 Meses anteriores" if possible, 
                                        // or look for specific columns if needed.
                                        // For now, let's take the first non-empty grid, or prioritize "Demonstrativo" if we can identify it.
                                        
                                        // Log grid name/caption for debugging
                                        console.log(`Found grid: ${grid.Caption || grid.nomegrid} with ${gridItems.length} items`);
                                        
                                        // If this is the "12 Meses anteriores" grid, we might want to skip it if we are looking for the main "Demonstrativo".
                                        // The main grid usually comes first or has a specific caption.
                                        // Let's store it, but keep looking if it's the "12 Meses" one and we haven't found the main one yet.
                                        const isHistory = (grid.Caption && grid.Caption.includes('12 Meses')) || (grid.nomegrid && grid.nomegrid.includes('Anteriores'));
                                        
                                        if (!isHistory) {
                                            foundData = gridItems;
                                            break; // Found the main grid!
                                        } else if (foundData.length === 0) {
                                            foundData = gridItems; // Fallback to history grid if nothing else found yet
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
                    console.log('First item structure:', JSON.stringify(foundData[0], null, 2));
                    // Convert JSON array to CSV for uniform processing
                    csvData = Papa.unparse(foundData, { delimiter: ';' });
                } else {
                     console.log('Questor JSON Dump:', JSON.stringify(dataObj, null, 2)); // Log full response for debugging
                     return { success: false, error: 'Nenhum dado encontrado na resposta do Questor (Grid vazia)' };
                }

             } catch (e) {
                 console.error('Error parsing Questor Grid JSON:', e);
                 return { success: false, error: 'Erro ao processar estrutura JSON do Questor' };
             }
        } else {
            // Fallback: try to convert entire object to string if it looks like data, 
            // or return error if it looks like a structured response without CSV
            console.error('Unexpected JSON response from Questor:', JSON.stringify(dataObj));
            return { success: false, error: `Resposta inesperada do Questor: ${JSON.stringify(dataObj).substring(0, 100)}...` };
        }
    }

    // 4. Parse CSV
    const parsed = Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true,
      delimiter: ';', // Questor usually uses semicolon
    });

    if (parsed.errors.length > 0 && parsed.data.length === 0) {
      console.error('CSV Parse Error:', parsed.errors);
      return { success: false, error: 'Erro ao processar o arquivo CSV retornado' };
    }
    
    const rows = parsed.data as any[];
    console.log('CSV Rows Preview:', rows.slice(0, 2));

    // 5. Process and Save Data
    // Helper to parse float from string (Handles PT-BR "1.234,56" and US "1,234.56" or "1234.56")
    const parseValue = (val: any): number => {
      if (typeof val === 'number') return val;
      if (!val) return 0;
      if (typeof val !== 'string') return 0;
      
      const v = val.toString().replace(/[^\d,.-]/g, '').trim();
      if (v === '') return 0;

      // Heuristic: Identify decimal separator by position
      const lastComma = v.lastIndexOf(',');
      const lastDot = v.lastIndexOf('.');
      
      if (lastComma > lastDot) {
          // PT-BR: "1.234,56" or "1234,56"
          // Remove dots (thousands), replace comma with dot (decimal)
           const clean = v.replace(/\./g, '').replace(',', '.');
           return parseFloat(clean) || 0;
      } else if (lastDot > -1) {
          // US: "1,234.56" or "1234.56"
          // Remove commas (thousands), keep dot (decimal)
          const clean = v.replace(/,/g, '');
          return parseFloat(clean) || 0;
      } else {
          // Integer or clean number
          return parseFloat(v) || 0;
      }
    };

    const processedData: SimplesNacionalBillingData[] = [];
    if (rows.length === 0) return { success: true, count: 0 };

    // Keys mapping helper
    const headerKeys = Object.keys(rows[0]);
    const findKey = (search: string, exclude?: string) => 
      headerKeys.find(k => {
        const keyLower = k.toLowerCase();
        const searchLower = search.toLowerCase();
        if (exclude && keyLower.includes(exclude.toLowerCase())) return false;
        return keyLower.includes(searchLower);
      });

    // Detect Layout: Flat (Standard) vs Pivot (Demonstrativo)
    const colCompetence = findKey('Competência') || findKey('Mes') || findKey('Mês');
    const colDescription = findKey('Descrição') || findKey('Descricao') || findKey('Historico');

    // We prioritize Pivot Layout if there are MonthYear columns in the header (e.g. JAN2024...)
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
            // Parse Competence
            let competence = '';
            const compVal = row[colCompetence];
            if (compVal.includes('/')) {
                const [mm, yyyy] = compVal.split('/');
                if (mm.length <= 2 && yyyy.length === 4) competence = `${yyyy}-${mm.padStart(2, '0')}`;
            } else if (compVal.match(/^[A-Z][a-z]{2}\d{4}$/)) { 
                // Handle Jan2024 format
                const months: {[k:string]:string} = {Jan:'01',Fev:'02',Mar:'03',Abr:'04',Mai:'05',Jun:'06',Jul:'07',Ago:'08',Set:'09',Out:'10',Nov:'11',Dez:'12'};
                const mStr = compVal.substring(0,3);
                const yStr = compVal.substring(3);
                if (months[mStr]) competence = `${yStr}-${months[mStr]}`;
            } else {
                 competence = compVal.substring(0, 7); // Fallback YYYY-MM
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
                payroll_12_months: 0 // Will need to be fetched/updated separately if not available
            });
        }
    } else {
        console.log('Detected PIVOT layout (Demonstrativo) or fallback');
        // Rows are categories, Columns are Months (Jan2024, Fev2024...)
        // We need to aggregate data by Month.
        
        // 1. Identify Month Columns
        // In the log, columns are like "JAN2024_BASE", "JAN2024_ALIQUOTA", "JAN2024_SIMPLES"
        // We need to extract the unique Month prefixes (e.g., "JAN2024") from these keys.
        const monthsMap: {[key: string]: string} = {JAN:'01',FEV:'02',MAR:'03',ABR:'04',MAI:'05',JUN:'06',JUL:'07',AGO:'08',SET:'09',OUT:'10',NOV:'11',DEZ:'12'};
        
        const monthPrefixes = new Set<string>();
        headerKeys.forEach(k => {
             // Match start with MonthYear (e.g. JAN2024) followed by underscore or end
             const match = k.match(/^([A-Z]{3}\d{4})(_|$)/);
             if (match) {
                 monthPrefixes.add(match[1]);
             }
        });

        // Initialize data structure for each month found
        const monthData: {[competence: string]: Partial<SimplesNacionalBillingData> & { _aliquotas?: number[] }} = {};

        for (const mPrefix of monthPrefixes) {
             const mStr = mPrefix.substring(0,3); // JAN
             const yStr = mPrefix.substring(3);   // 2024
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

        // 2. Iterate Rows to find categories and fill month data
        for (const row of rows) {
            // Clean description: remove HTML entities like &nbsp; and normalize spaces
            // Handle explicit uppercase &NBSP and standard &nbsp;
            let rawDesc = '';
            if (colDescription) {
                rawDesc = row[colDescription] || '';
            } else if (headerKeys.length > 0) {
                 // Fallback: use first column as description if specific column not found
                 rawDesc = row[headerKeys[0]] || '';
            }
            
            let desc = rawDesc.replace(/&nbsp;/gi, ' ').replace(/&NBSP/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            
            // Debug: Log specific rows to help identification
            if (desc.includes('FOLHA') || desc.includes('RECEITA')) {
                console.log(`Row Candidate: ${desc}`);
            }

            // Extract unique Aliquotas from ANY row that has an Aliquota column
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
                         // Some rows might have 0 or empty for Aliquota, we only want positive values
                         if (aliqVal > 0) {
                             const monthDataEntry = monthData[competence] as any;
                             if (!monthDataEntry._aliquotas) monthDataEntry._aliquotas = [];
                             // Use unique values to avoid double counting if a Total row repeats the Anexo's aliquota
                             if (!monthDataEntry._aliquotas.includes(aliqVal)) {
                                 monthDataEntry._aliquotas.push(aliqVal);
                             }
                         }
                     }
                }
            }

            // Map Description to Field
            let targetField: keyof SimplesNacionalBillingData | null = null;
            
            // Check against expected row headers from the image/log
            // Image shows: "9.02.01 RBT12 - Total", "9.03.01 RBA - Total", "9.04.01 RBAA - Total"
            // "9.01.01 Receita do PA - Total" or "Receita do PA - Mercado Interno" depending on grouping
            
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
            else if (desc.includes('MERCADO INTERNO')) targetField = 'recebimento'; // Fallback mais agressivo
            // Also check for partial matches if the prefix changes
            else if (desc.includes('RBT12') && desc.includes('TOTAL')) targetField = 'rbt12';
            else if (desc.includes('RBA') && desc.includes('TOTAL') && !desc.includes('RBAA')) targetField = 'rba';
            else if (desc.includes('RBAA') && desc.includes('TOTAL')) targetField = 'rbaa';
            else if (desc.includes('RECEITA DO PA') && desc.includes('TOTAL')) targetField = 'rpa_competence';
            else if (desc.includes('RECEITA') && desc.includes('PA') && desc.includes('TOTAL')) targetField = 'rpa_competence'; // Broader match for RPA
            
            // Mapping for "Folha+Encargos" (Folha de Salários Incluídos Encargos no Mês)
            // Image: "9.01.02 Folha de Salários Incluídos Encargos no Mês"
            else if (desc.includes('FOLHA') && desc.includes('ENCARGOS') && (desc.includes('MES') || desc.includes('MENSAL')) && !desc.includes('ANTERIORES') && !desc.includes('ACUMULADO') && !desc.includes('12 MESES') && !desc.includes('13') && !desc.includes('DECIMO')) {
                 targetField = 'rpa_accumulated';
            }
            // Mapping for "Folha 12 meses" (Folha de Salários Incluídos Encargos Períodos Anteriores)
            // Image: "9.02.02 Folha de Salários Incluídos Encargos Períodos Anteriores"
            else if (desc.includes('FOLHA') && desc.includes('ENCARGOS') && desc.includes('ANTERIORES')) {
                 targetField = 'payroll_12_months';
            }

            // REMOVED mapping for "SIMPLES Devido no Mês" -> rpa_cash as it is now "Alíq.Efetiva" derived from RPA row
            
            if (targetField) {
                console.log(`Matched row '${desc}' to field '${targetField}'`);
                
                if (targetField === 'rpa_competence') {
                     // Log keys of the RPA row to debug missing months and Aliquota column name
                     const samplePrefix = Array.from(monthPrefixes)[0]; 
                     const relevantKeys = headerKeys.filter(k => k.startsWith(samplePrefix));
                     console.log(`[Questor Debug] RPA Row Keys for ${samplePrefix}:`, relevantKeys);
                }

                if (targetField === 'rpa_accumulated') {
                    // Debug which months have data in this row
                    const populatedMonths: string[] = [];
                    monthPrefixes.forEach(m => {
                         const hasVal = headerKeys.some(k => k.startsWith(m) && row[k] && row[k].toString().trim() !== '');
                         if (hasVal) populatedMonths.push(m);
                    });
                    console.log(`[Folha Debug] Row '${desc}' has values for months: ${populatedMonths.join(', ')}`);
                }

                // For this row, iterate over all valid month columns and extract value
                for (const mPrefix of monthPrefixes) {
                    const mStr = mPrefix.substring(0,3);
                    const yStr = mPrefix.substring(3);
                    if (!monthsMap[mStr]) continue;
                    const competence = `${yStr}-${monthsMap[mStr]}`;
                    
                    if (monthData[competence]) {
                        // Determine which column holds the value for this prefix
                        // Based on logs: "JAN2024_BASE", "JAN2024_ALIQUOTA", "JAN2024_SIMPLES"
                        
                        let valStr = '';
                        
                        // Debug Log
                        // console.log(`[Questor Parsing] Month: ${competence}, Field: ${targetField}, Row Keys:`, headerKeys.filter(k => k.startsWith(mPrefix)));

                        if (targetField === 'rpa_competence' || targetField === 'recebimento') {
                             // Receita do PA - Total (RPA Total) or Caixa
                             // Try to find a column named exactly "VALOR" or ending in "VALOR"
                             valStr = row[`${mPrefix}_VALOR`] || row[`${mPrefix}_BASE`] || row[`${mPrefix}`];
                             
                             // Extra check for "VALOR" substring
                             if (!valStr) {
                                 const valKey = headerKeys.find(k => k.startsWith(mPrefix) && k.toUpperCase().includes('VALOR'));
                                 if (valKey) valStr = row[valKey];
                             }
                             // Look for "BASE"
                             if (!valStr) {
                                 const baseKey = headerKeys.find(k => k.startsWith(mPrefix) && k.toUpperCase().includes('BASE'));
                                 if (baseKey) valStr = row[baseKey];
                             }
                             // Look for ANY valid column starting with the prefix if it's still empty
                             if (!valStr) {
                                 const fallbackKey = headerKeys.find(k => k.startsWith(mPrefix) && row[k] && row[k].trim() !== '' && row[k] !== '0,00' && row[k] !== '0.00' && row[k] !== '0');
                                 if (fallbackKey) {
                                     // Prevent picking up Aliquota percentages accidentally
                                     if (!fallbackKey.toUpperCase().includes('ALIQ')) {
                                         valStr = row[fallbackKey];
                                     }
                                 }
                             }
                        } else if (targetField === 'rbt12') {
                             // RBT12 - Total -> Likely BASE (Revenue 12 months)
                             valStr = row[`${mPrefix}_BASE`] || row[`${mPrefix}_VALOR`] || row[`${mPrefix}`];
                        } else if (targetField === 'rba') {
                             // RBA - Total -> Likely BASE
                             valStr = row[`${mPrefix}_BASE`] || row[`${mPrefix}_VALOR`] || row[`${mPrefix}`];
                        } else if (targetField === 'rbaa') {
                             // RBAA - Total -> Likely BASE
                             valStr = row[`${mPrefix}_BASE`] || row[`${mPrefix}_VALOR`] || row[`${mPrefix}`];
                        } else if (targetField === 'rpa_accumulated' || targetField === 'payroll_12_months') {
                             // Folha+Encargos OR Folha 12 Meses -> Value column
                             valStr = row[`${mPrefix}_VALOR`] || row[`${mPrefix}_BASE`] || row[`${mPrefix}`];
                        } else {
                             // Default fallback
                             const potentialKeys = [`${mPrefix}_BASE`, `${mPrefix}_VALOR`, `${mPrefix}`, `${mPrefix}_SIMPLES`];
                             for (const pk of potentialKeys) {
                                if (row[pk] && row[pk].trim() !== '') {
                                    valStr = row[pk];
                                    break;
                                }
                             }
                        }
                        
                        // Final check: if valStr is still empty, try to find any key starting with prefix that has a value
                        if (!valStr) {
                             const anyKey = headerKeys.find(k => k.startsWith(mPrefix) && row[k] && row[k].trim() !== '');
                             if (anyKey) valStr = row[anyKey];
                        }

                        if (valStr) {
                             // console.log(`[Questor Parsing] Found Value String: "${valStr}" for ${targetField}`);
                             const val = parseValue(valStr);
                             
                             const currentVal = (monthData[competence] as any)[targetField] || 0;
                             
                             // If it's a new value > 0, we sum it up to handle multiple rows (e.g. different Anexos) mapping to the same field
                             if (val > 0) {
                                 if (currentVal > 0) {
                                     console.warn(`[Questor Accumulate] Field ${targetField} for ${competence} being accumulated! Old: ${currentVal}, Adding: ${val}. Row: ${desc}`);
                                 } else {
                                     console.log(`[Questor Success] Found ${targetField} for ${competence}: ${val} (Row: ${desc})`);
                                 }
                                 (monthData[competence] as any)[targetField] = currentVal + val;
                             } else if (currentVal === 0) {
                                 // If the new value is 0 and we don't have a value yet, set it to 0
                                 (monthData[competence] as any)[targetField] = 0;
                             }
                        } else if (targetField === 'recebimento') {
                             console.warn(`[Questor Missing] Could not find value for ${targetField} in ${competence} (Row: ${desc}). Checked keys:`, headerKeys.filter(k => k.startsWith(mPrefix)));
                        }
                    }
                }
            }
        }

        // 3. Convert map to array and calculate mean for Aliquota Efetiva
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
