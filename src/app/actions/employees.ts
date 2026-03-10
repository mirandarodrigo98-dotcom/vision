'use server';

import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import Papa from 'papaparse';
import { parse as parseDate } from 'date-fns';

import { fetchEmployeesFromQuestor as fetchFromIntegration } from './integrations/questor-employee-actions';

const EmployeeSchema = z.object({
  company_id: z.string().min(1, 'Empresa é obrigatória'),
  code: z.string().min(1, 'Código é obrigatório').regex(/^\d+$/, 'Código deve ser numérico'),
  name: z.string().min(1, 'Nome é obrigatório'),
  admission_date: z.string().min(1, 'Data de admissão é obrigatória'),
  birth_date: z.string().min(1, 'Data de nascimento é obrigatória'),
  gender: z.string().min(1, 'Sexo é obrigatório'),
  pis: z.string().optional(),
  cpf: z.string().min(1, 'CPF é obrigatório'),
  esocial_registration: z.string().min(1, 'e-Social é obrigatório'),
});

export async function createEmployee(formData: FormData) {
  const session = await getSession();
  if (!session || (session.role !== 'admin' && session.role !== 'operator')) {
    return { error: 'Unauthorized' };
  }

  const rawData = {
    company_id: formData.get('company_id'),
    code: formData.get('code'),
    name: formData.get('name'),
    admission_date: formData.get('admission_date'),
    birth_date: formData.get('birth_date'),
    gender: formData.get('gender'),
    pis: formData.get('pis'),
    cpf: formData.get('cpf'),
    esocial_registration: formData.get('esocial_registration'),
  };

  const validatedFields = EmployeeSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return { error: 'Campos inválidos', details: validatedFields.error.flatten() };
  }

  const {
    company_id,
    code,
    name,
    admission_date,
    birth_date,
    gender,
    pis,
    cpf,
    esocial_registration,
  } = validatedFields.data;

  try {
    const id = uuidv4();
    await db.prepare(`
      INSERT INTO employees (
        id, company_id, code, name, admission_date, birth_date, gender, pis, cpf, esocial_registration, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(
      id,
      company_id,
      code || null,
      name,
      admission_date || null,
      birth_date || null,
      gender || null,
      pis || null,
      cpf || null,
      esocial_registration || null
    );

    revalidatePath('/admin/employees');
    return { success: true, employeeId: id };
  } catch (error) {
    console.error('Failed to create employee:', error);
    return { error: 'Erro ao criar funcionário' };
  }
}

export async function updateEmployee(id: string, formData: FormData) {
  const session = await getSession();
  if (!session || (session.role !== 'admin' && session.role !== 'operator')) {
    return { error: 'Unauthorized' };
  }

  const rawData = {
    company_id: formData.get('company_id'),
    code: formData.get('code'),
    name: formData.get('name'),
    admission_date: formData.get('admission_date'),
    birth_date: formData.get('birth_date'),
    gender: formData.get('gender'),
    pis: formData.get('pis'),
    cpf: formData.get('cpf'),
    esocial_registration: formData.get('esocial_registration'),
  };

  const validatedFields = EmployeeSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return { error: 'Campos inválidos', details: validatedFields.error.flatten() };
  }

  const {
    company_id,
    code,
    name,
    admission_date,
    birth_date,
    gender,
    pis,
    cpf,
    esocial_registration,
  } = validatedFields.data;

  try {
    await db.prepare(`
      UPDATE employees SET
        company_id = ?,
        code = ?,
        name = ?,
        admission_date = ?,
        birth_date = ?,
        gender = ?,
        pis = ?,
        cpf = ?,
        esocial_registration = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      company_id,
      code || null,
      name,
      admission_date || null,
      birth_date || null,
      gender || null,
      pis || null,
      cpf || null,
      esocial_registration || null,
      id
    );

    revalidatePath('/admin/employees');
    revalidatePath(`/admin/employees/${id}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to update employee:', error);
    return { error: 'Erro ao atualizar funcionário' };
  }
}

export async function getEmployees(optionsOrCompanyId?: string | { companyId?: string; excludePending?: boolean }) {
  const session = await getSession();
  if (!session) return [];

  const options = typeof optionsOrCompanyId === 'string' 
    ? { companyId: optionsOrCompanyId } 
    : optionsOrCompanyId || {};
    
  const { companyId, excludePending } = options;

  try {
    let query = `
      SELECT e.*, c.nome as company_name,
      CASE WHEN (
        EXISTS (SELECT 1 FROM dismissals d WHERE d.employee_id = e.id) OR
        EXISTS (SELECT 1 FROM vacations v WHERE v.employee_id = e.id) OR
        EXISTS (SELECT 1 FROM leaves l WHERE l.employee_id = e.id) OR
        EXISTS (SELECT 1 FROM transfer_requests tr WHERE tr.employee_name = e.name)
      ) THEN 1 ELSE 0 END as has_movements
      FROM employees e
      JOIN client_companies c ON e.company_id = c.id
      WHERE e.dismissal_date IS NULL
    `;

    const params: any[] = [];

    if (excludePending) {
      query += `
        AND NOT EXISTS (
            SELECT 1 FROM dismissals d 
            WHERE d.employee_id = e.id 
            AND d.status NOT IN ('COMPLETED', 'CANCELLED')
        )
        AND NOT EXISTS (
            SELECT 1 FROM vacations v 
            WHERE v.employee_id = e.id 
            AND v.status NOT IN ('COMPLETED', 'CANCELLED')
        )
        AND NOT EXISTS (
            SELECT 1 FROM transfer_requests tr 
            WHERE tr.employee_name = e.name 
            AND tr.source_company_id = e.company_id
            AND tr.status NOT IN ('COMPLETED', 'CANCELLED')
        )
      `;
    }

    // Filter by company permission (if not admin)
    if (session.role === 'client_user') {
      query += ` AND e.company_id IN (SELECT company_id FROM user_companies WHERE user_id = ?)`;
      params.push(session.user_id);
    }

    if (companyId) {
      query += ` AND e.company_id = ?`;
      params.push(companyId);
    }

    query += ` ORDER BY e.name ASC`; // Sort by name

    const employees = await db.prepare(query).all(...params);
    return employees;
  } catch (error) {
    console.error('Failed to fetch employees:', error);
    return [];
  }
}

export async function checkPendingRequests(employeeId: string) {
  try {
    // Check pending dismissals
    const pendingDismissal = await db.prepare(`
        SELECT id, 'Demissão' as type, created_at FROM dismissals 
        WHERE employee_id = ? AND status NOT IN ('COMPLETED', 'CANCELLED')
    `).get(employeeId) as any;

    if (pendingDismissal) return pendingDismissal;

    // Check pending vacations
    const pendingVacation = await db.prepare(`
        SELECT id, 'Férias' as type, created_at FROM vacations 
        WHERE employee_id = ? AND status NOT IN ('COMPLETED', 'CANCELLED')
    `).get(employeeId) as any;

    if (pendingVacation) return pendingVacation;

    // Check pending transfers
    // Fetch employee name first
    const employee = await db.prepare('SELECT name FROM employees WHERE id = ?').get(employeeId) as any;
    if (employee) {
        const pendingTransfer = await db.prepare(`
            SELECT id, 'Transferência' as type, created_at FROM transfer_requests 
            WHERE employee_name = ? AND status NOT IN ('COMPLETED', 'CANCELLED')
        `).get(employee.name) as any;
        if (pendingTransfer) return pendingTransfer;
    }

    return null;
  } catch (error) {
    console.error('Error checking pending requests:', error);
    return null;
  }
}

export async function toggleEmployeeStatus(employeeId: string, isActive: boolean) {
  const session = await getSession();
  if (!session || (session.role !== 'admin' && session.role !== 'operator')) {
    return { error: 'Não autorizado' };
  }

  try {
    const status = isActive ? 1 : 0;
    await db.prepare(`
      UPDATE employees 
      SET is_active = ?, updated_at = datetime('now') 
      WHERE id = ?
    `).run(status, employeeId);

    revalidatePath('/admin/employees');
    return { success: true };
  } catch (error) {
    console.error('Failed to toggle employee status:', error);
    return { error: 'Erro ao atualizar status do funcionário' };
  }
}

export async function importEmployees(formData: FormData) {
  // Functionality preserved as stub due to clean-up
  // If CSV import is required, it should be reimplemented here
  return { error: 'Funcionalidade CSV temporariamente indisponível.' };
}

export async function fetchQuestorEmployees(questorCompanyCode: string) {
  const session = await getSession();
  if (!session || (session.role !== 'admin' && session.role !== 'operator')) {
    return { error: 'Não autorizado' };
  }

  const company = await db.prepare('SELECT id, nome FROM client_companies WHERE code = ?').get(questorCompanyCode) as { id: string, nome: string } | undefined;

  if (!company) {
    return { error: 'Empresa não encontrada no Vision com este código.' };
  }

  console.log(`[Questor Import] Fetching employees via Integration for company ${questorCompanyCode}`);

  try {
    const result = await fetchFromIntegration(questorCompanyCode);

    if (result.error) {
      return { error: result.error };
    }

    if (!result.data || !Array.isArray(result.data)) {
      return { error: 'Formato de resposta inválido do Questor.' };
    }

    const employees = result.data.map((e: any) => ({
      code: String(e.code || e.CODIGOFUNCCONTR),
      name: e.name || e.NOMEFUNC,
      admission_date: e.admission_date, // Keep as string (YYYY-MM-DD) to avoid timezone issues
      birth_date: e.birth_date, // Keep as string (YYYY-MM-DD)
      gender: e.sex, // Use full description (Masculino/Feminino) as returned by integration
      pis: e.pis || e.NUMEROPIS,
      cpf: e.cpf || e.CPFFUNC,
      esocial_registration: e.esocial_registration || e.MATRICULAESOCIAL,
      status: (e.status === 1 || e.status === '1') ? 'active' : 'inactive'
    }));

    return {
      success: true,
      employees,
      companyId: company.id,
      companyName: company.nome
    };
  } catch (error) {
    console.error('Failed to fetch employees from Questor:', error);
    return { error: 'Erro interno ao buscar funcionários.' };
  }
}

export async function deleteEmployee(id: string) {
  const session = await getSession();
  if (!session || (session.role !== 'admin' && session.role !== 'operator')) {
    return { error: 'Não autorizado' };
  }

  try {
    const hasMovements = await checkEmployeeMovements(id);
    if (hasMovements) {
      return { error: 'Funcionário possui movimentações e não pode ser excluído.' };
    }

    await db.prepare('DELETE FROM employees WHERE id = ?').run(id);
    
    revalidatePath('/admin/employees');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete employee:', error);
    return { error: 'Erro ao excluir funcionário.' };
  }
}

export async function deleteEmployeesBatch(ids: string[]) {
  const session = await getSession();
  if (!session || (session.role !== 'admin' && session.role !== 'operator')) {
    return { error: 'Não autorizado' };
  }

  try {
    let deletedCount = 0;
    let errors = 0;

    for (const id of ids) {
      const hasMovements = await checkEmployeeMovements(id);
      if (!hasMovements) {
        await db.prepare('DELETE FROM employees WHERE id = ?').run(id);
        deletedCount++;
      } else {
        errors++;
      }
    }

    revalidatePath('/admin/employees');
    
    if (errors > 0) {
      return { success: true, message: `${deletedCount} excluídos. ${errors} não puderam ser excluídos pois possuem movimentações.` };
    }
    
    return { success: true, message: `${deletedCount} funcionários excluídos com sucesso.` };
  } catch (error) {
    console.error('Failed to delete employees batch:', error);
    return { error: 'Erro ao excluir funcionários.' };
  }
}

async function checkEmployeeMovements(employeeId: string): Promise<boolean> {
  // Check dismissals
  const dismissal = await db.prepare('SELECT 1 FROM dismissals WHERE employee_id = ?').get(employeeId);
  if (dismissal) return true;

  // Check vacations
  const vacation = await db.prepare('SELECT 1 FROM vacations WHERE employee_id = ?').get(employeeId);
  if (vacation) return true;

  // Check leaves (if table exists)
  try {
    const leave = await db.prepare('SELECT 1 FROM leaves WHERE employee_id = ?').get(employeeId);
    if (leave) return true;
  } catch (e) {
    // Ignore if table doesn't exist
  }

  // Check transfers (by name, unfortunately)
  const employee = await db.prepare('SELECT name FROM employees WHERE id = ?').get(employeeId) as { name: string };
  if (employee) {
    const transfer = await db.prepare('SELECT 1 FROM transfer_requests WHERE employee_name = ?').get(employee.name);
    if (transfer) return true;
  }

  return false;
}

export async function saveQuestorEmployees(companyId: string, employees: any[]) {
  const session = await getSession();
  if (!session || (session.role !== 'admin' && session.role !== 'operator')) {
    return { error: 'Não autorizado' };
  }

  let importedCount = 0;
  let skippedCount = 0;

  for (const emp of employees) {
    try {
        // Check if employee exists for THIS company (CPF + Company ID)
        const existing = await db.prepare('SELECT id FROM employees WHERE cpf = ? AND company_id = ?').get(emp.cpf, companyId) as any;

        if (existing) {
            skippedCount++;
        } else {
            const id = uuidv4();
            await db.prepare(`
                INSERT INTO employees (
                id, company_id, code, name, admission_date, birth_date, gender, pis, cpf, esocial_registration, is_active, status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'Admitido', datetime('now'), datetime('now'))
            `).run(
                id,
                companyId,
                emp.code,
                emp.name,
                emp.admission_date,
                emp.birth_date,
                emp.gender,
                emp.pis,
                emp.cpf,
                emp.esocial_registration
            );
            importedCount++;
        }
    } catch (err) {
        console.error(`[Questor Import] Error saving employee ${emp.name}:`, err);
    }
  }

  revalidatePath('/admin/employees');
  
  let message = '';
  if (importedCount > 0 && skippedCount > 0) {
      message = `${importedCount} funcionário(s) importado(s). ${skippedCount} ignorado(s) pois já existem na base.`;
  } else if (importedCount > 0) {
      message = `${importedCount} funcionário(s) importado(s) com sucesso.`;
  } else if (skippedCount > 0) {
      message = `Nenhum funcionário importado. ${skippedCount} registro(s) já existem na base.`;
  } else {
      message = 'Nenhum funcionário processado.';
  }

  return { success: true, count: importedCount, skipped: skippedCount, message };
}
