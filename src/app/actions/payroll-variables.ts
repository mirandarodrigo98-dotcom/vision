'use server';

import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { executeQuestorProcess } from './integrations/questor-syn';

import { uploadToZen, getZenClientByCnpj, findZenCategoryByNames, sendDocumentToZen } from './integrations/questor-zen';

export type PayrollEvent = {
  codigo: string;
  descricao: string;
  referencia: 'Hora' | 'Valor' | 'Dia';
  tipo: 'Provento' | 'Desconto';
};

// Function to fetch events from Questor SYN
export async function getPayrollEvents(companyId: string): Promise<{ data?: PayrollEvent[], error?: string }> {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

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

    console.log(`[Payroll] Buscando eventos para a empresa ${companyCode} (EventosZen)`);
    
    // Passando o código da empresa em vários formatos possíveis de parâmetro
    // pois consultas personalizadas no Questor podem variar o nome da variável.
    const result = await executeQuestorProcess('EventosZen', { 
      'CODIGOEMPRESA': companyCode,
      'E.CODIGOEMPRESA': companyCode,
      'pCodigoEmpresa': companyCode,
      'z.CodigoEmpresa': companyCode,
      'z.codigoempresa': companyCode,
      'EMPRESA': companyCode
    });

    if (!result.error && result.data && Array.isArray(result.data)) {
          const events = result.data.map((item: any) => {
            const rawRef = String(item.REFERENCIA || item.TIPO_REFERENCIA || item.referencia || item.REFEREVENTO || item.referevento || item.ReferEvento || 'Valor');
            const rawTipo = String(item.TIPO || item.TIPO_EVENTO || item.tipo || item.TIPOEVENTO || item.tipoevento || item.TipoEvento || 'Provento');
            
            return {
              codigo: String(item.CODIGO || item.CODIGOEVENTO || item.EVENTO || item.codigo || item.codigo_evento || item.evento || item.codigoevento || ''),
              descricao: String(item.DESCRICAO || item.NOME || item.descricao || item.nome || item.DESCREVENTO || item.descrevento || 'Evento sem descrição').replace(/&nbsp;?/gi, ' ').replace(/;/g, '').replace(/\s+/g, ' ').trim(),
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
  } catch (error: any) {
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
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function savePayrollVariables(
  companyId: string,
  monthReference: string, // YYYY-MM
  eventsData: any,
  isDraft: boolean
) {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  try {
    // Save to database
    const status = isDraft ? 'draft' : 'sent';
    
    const result = await db.query(`
      INSERT INTO payroll_variables (company_id, created_by_user_id, month_reference, status, events_data)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [companyId, session.user_id, monthReference, status, JSON.stringify(eventsData)]);

    const recordId = result.rows[0].id;

    if (!isDraft) {
      // 1. Buscar a empresa para pegar o CNPJ
      const companyRes = await db.query(`SELECT cnpj, name FROM client_companies WHERE id = $1`, [companyId]);
      if (companyRes.rowCount === 0) throw new Error('Empresa não encontrada');
      const company = companyRes.rows[0];

      // 2. Resgatar todos os funcionários da empresa para cruzar o ID com o código
      const employeesRes = await db.query(`SELECT id, code FROM employees WHERE company_id = $1`, [companyId]);
      const empMap: Record<string, string> = {};
      employeesRes.rows.forEach(e => {
        empMap[e.id] = e.code || '';
      });

      // 3. Gerar o arquivo CSV em memória
      const payload = eventsData as {
        selectedEvents: string[];
        employeeValues: Record<string, Record<string, string>>;
      };

      let csvContent = 'CodigoEmpregado;CodigoEvento;Valor\n';
      let hasData = false;

      for (const [empId, events] of Object.entries(payload.employeeValues)) {
        const empCode = empMap[empId];
        if (!empCode) continue;

        for (const [evtCode, value] of Object.entries(events)) {
          if (value && value.trim() !== '') {
            csvContent += `${empCode};${evtCode};${value}\n`;
            hasData = true;
          }
        }
      }

      if (!hasData) {
        throw new Error('Nenhum dado válido para enviar ao Questor Zen.');
      }

      // 4. Integração com a API do Questor Zen
      const cnpj = String(company.cnpj).replace(/\D/g, '');
      const clientId = await getZenClientByCnpj(cnpj);
      if (!clientId) {
        throw new Error('Cliente não encontrado no Questor Zen (CNPJ inválido ou não cadastrado).');
      }

      const categoryId = await findZenCategoryByNames('Departamento Pessoal', 'Documentos');
      if (!categoryId) {
        throw new Error('Categoria "Departamento Pessoal > Documentos" não encontrada no Questor Zen.');
      }

      const filename = `variaveis_folha_${companyId}_${monthReference}_${Date.now()}.csv`;
      const fileId = await uploadToZen(filename, csvContent);
      if (!fileId) {
        throw new Error('Falha ao realizar o upload do arquivo para o Questor Zen.');
      }

      // O Questor Zen exige a competência no formato MM/YYYY. Ex: 2026-05 -> 05/2026
      const [yyyy, mm] = monthReference.split('-');
      const zenCompetencia = `${mm}/${yyyy}`;
      
      const docResult = await sendDocumentToZen({
        CodigoCategoria: categoryId,
        CodigoCliente: clientId,
        CodigoArquivo: fileId,
        Titulo: `Lançamentos Eventos Variáveis`,
        Observacao: `Variáveis da Folha - ${monthReference} (Gerado pelo Vision)`,
        DataCompetencia: zenCompetencia,
        AtributosAdicionais: {
          TipoDocumento: 'Lançamentos Eventos Variáveis'
        }
      });

      if (!docResult.success || !docResult.protocol) {
        throw new Error(docResult.error || 'Falha ao vincular o documento no Questor Zen.');
      }

      const protocol = docResult.protocol;

      // 5. Atualizar o protocolo no banco de dados
      await db.query(`UPDATE payroll_variables SET zen_protocol = $1 WHERE id = $2`, [protocol, recordId]);
      
      revalidatePath('/app/payroll-variables');
      revalidatePath('/admin/payroll-variables');
      
      return { success: true, id: recordId, protocol, message: 'Lançamento enviado com sucesso para o Questor Zen.' };
    }

    revalidatePath('/app/payroll-variables');
    revalidatePath('/admin/payroll-variables');

    return { success: true, id: recordId, message: 'Rascunho salvo com sucesso.' };

  } catch (error: any) {
    console.error('Error saving payroll variables:', error);
    return { error: error.message || 'Erro ao salvar os lançamentos de variáveis.' };
  }
}
