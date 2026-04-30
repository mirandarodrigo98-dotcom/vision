'use server';

import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

export type PayrollEvent = {
  codigo: string;
  descricao: string;
  referencia: 'Hora' | 'Valor' | 'Dia';
  tipo: 'Provento' | 'Desconto';
};

// Mock function to fetch events from Questor SYN
export async function getPayrollEvents(companyId: string): Promise<{ data?: PayrollEvent[], error?: string }> {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  // TODO: Replace with actual Questor SYN or Questor ZEN API call
  // The user says this comes from Questor Gestão Contábil (cadastros, zen, eventos por empresas zen)
  return {
    data: [
      { codigo: '35', descricao: 'HORAS EXTRAS 50% DIURNAS', referencia: 'Hora', tipo: 'Provento' },
      { codigo: '88', descricao: 'GRATIFICAÇÃO VALOR', referencia: 'Valor', tipo: 'Provento' },
      { codigo: '98', descricao: 'PRÊMIOS', referencia: 'Valor', tipo: 'Provento' },
      { codigo: '381', descricao: 'HORAS FALTAS DIA', referencia: 'Dia', tipo: 'Desconto' },
      { codigo: '507', descricao: 'VALE ADIANTAMENTO', referencia: 'Valor', tipo: 'Desconto' },
    ]
  };
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
      // TODO: Send to Questor ZEN (Q-net Documentos Recebidos)
      // Simulating ZEN API response
      const fakeProtocol = `ZEN-${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,'0')}-${Math.floor(Math.random()*10000)}`;
      
      await db.query(`UPDATE payroll_variables SET zen_protocol = $1 WHERE id = $2`, [fakeProtocol, recordId]);
      
      revalidatePath('/app/payroll-variables');
      revalidatePath('/admin/payroll-variables');
      
      return { success: true, id: recordId, protocol: fakeProtocol, message: 'Lançamento enviado com sucesso para o Questor Zen.' };
    }

    revalidatePath('/app/payroll-variables');
    revalidatePath('/admin/payroll-variables');

    return { success: true, id: recordId, message: 'Rascunho salvo com sucesso.' };

  } catch (error: any) {
    console.error('Error saving payroll variables:', error);
    return { error: 'Erro ao salvar os lançamentos de variáveis.' };
  }
}
