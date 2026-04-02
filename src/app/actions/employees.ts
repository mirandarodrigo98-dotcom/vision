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

  // Check operator access
  if (session.role === 'operator') {
    const restricted = await db.prepare('SELECT 1 FROM user_restricted_companies WHERE user_id = ? AND company_id = ?').get(session.user_id, company_id);
    if (restricted) return { error: 'Sem permissão para esta empresa.' };
  }

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

  // Check operator access
  if (session.role === 'operator') {
    const restricted = await db.prepare('SELECT 1 FROM user_restricted_companies WHERE user_id = ? AND company_id = ?').get(session.user_id, company_id);
    if (restricted) return { error: 'Sem permissão para esta empresa.' };
  }

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
    } else if (session.role === 'operator') {
      query += ` AND e.company_id NOT IN (SELECT company_id FROM user_restricted_companies WHERE user_id = ?)`;
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

export async function getEmployeesByCompany(companyId: string) {
  return getEmployees(companyId);
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
    if (session.role === 'operator') {
      const employee = await db.prepare('SELECT company_id FROM employees WHERE id = ?').get(employeeId) as { company_id: string } | undefined;
      if (employee) {
        const restricted = await db.prepare('SELECT 1 FROM user_restricted_companies WHERE user_id = ? AND company_id = ?').get(session.user_id, employee.company_id);
        if (restricted) return { error: 'Sem permissão para esta empresa.' };
      }
    }

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

export async function importEmployees(formData: FormData): Promise<{ success: boolean; count?: number; error?: string }> {
  // Functionality preserved as stub due to clean-up
  // If CSV import is required, it should be reimplemented here
  return { success: false, error: 'Funcionalidade CSV temporariamente indisponível.' };
}

export async function fetchQuestorEmployees(questorCompanyCode: string) {
  const session = await getSession();
  if (!session || (session.role !== 'admin' && session.role !== 'operator')) {
    return { success: false, error: 'Não autorizado' };
  }

  const company = await db.prepare('SELECT id, nome FROM client_companies WHERE code = ?').get(questorCompanyCode) as { id: string, nome: string } | undefined;

  if (!company) {
    return { success: false, error: 'Empresa não encontrada para este código.' };
  }

  if (session.role === 'operator') {
    const restricted = await db.prepare('SELECT 1 FROM user_restricted_companies WHERE user_id = ? AND company_id = ?').get(session.user_id, company.id);
    if (restricted) return { success: false, error: 'Sem permissão para esta empresa.' };
  }

  try {
    const result = await fetchFromIntegration(questorCompanyCode);
    revalidatePath('/admin/employees');
    
    if (result.success && result.data) {
        return {
            success: true,
            employees: result.data,
            companyId: company.id,
            companyName: company.nome
        };
    }
    
    return { 
        success: false, 
        error: result.error || 'Erro desconhecido ao buscar dados.' 
    };
  } catch (error) {
    console.error('Failed to sync employees:', error);
    return { success: false, error: 'Erro na sincronização.' };
  }
}

export async function deleteEmployee(id: string) {
  console.log('[Action] deleteEmployee called for id:', id);
  const session = await getSession();
  if (!session || (session.role !== 'admin' && session.role !== 'operator')) {
    return { success: false, error: 'Não autorizado' };
  }

  try {
    if (session.role === 'operator') {
      const employee = await db.prepare('SELECT company_id FROM employees WHERE id = ?').get(id) as { company_id: string } | undefined;
      if (employee) {
        const restricted = await db.prepare('SELECT 1 FROM user_restricted_companies WHERE user_id = ? AND company_id = ?').get(session.user_id, employee.company_id);
        if (restricted) return { success: false, error: 'Sem permissão para esta empresa.' };
      }
    }

    // Check for movements
    const hasMovements = await db.prepare(`
      SELECT 1 FROM (
        SELECT employee_id FROM dismissals WHERE employee_id = ?
        UNION ALL
        SELECT employee_id FROM vacations WHERE employee_id = ?
        UNION ALL
        SELECT employee_id FROM leaves WHERE employee_id = ?
        UNION ALL
        SELECT id FROM transfer_requests WHERE employee_name = (SELECT name FROM employees WHERE id = ?)
      ) LIMIT 1
    `).get(id, id, id, id);

    if (hasMovements) {
      return { success: false, error: 'Não é possível excluir funcionário com movimentações.' };
    }

    await db.prepare('DELETE FROM employees WHERE id = ?').run(id);
    revalidatePath('/admin/employees');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete employee:', error);
    return { success: false, error: 'Erro ao excluir funcionário' };
  }
}

export async function deleteEmployeesBatch(ids: string[]) {
  const session = await getSession();
  if (!session || (session.role !== 'admin' && session.role !== 'operator')) {
    return { success: false, error: 'Não autorizado' };
  }

  try {
    if (session.role === 'operator') {
      // Check all employees
      for (const id of ids) {
        const employee = await db.prepare('SELECT company_id FROM employees WHERE id = ?').get(id) as { company_id: string } | undefined;
        if (employee) {
            const restricted = await db.prepare('SELECT 1 FROM user_restricted_companies WHERE user_id = ? AND company_id = ?').get(session.user_id, employee.company_id);
            if (restricted) return { success: false, error: `Sem permissão para excluir funcionário (ID: ${id}) de empresa restrita.` };
        }
      }
    }

    // Helper to check one employee
    const checkEmployee = db.prepare(`
      SELECT 1 FROM (
        SELECT employee_id FROM dismissals WHERE employee_id = ?
        UNION ALL
        SELECT employee_id FROM vacations WHERE employee_id = ?
        UNION ALL
        SELECT employee_id FROM leaves WHERE employee_id = ?
        UNION ALL
        SELECT id FROM transfer_requests WHERE employee_name = (SELECT name FROM employees WHERE id = ?)
      ) LIMIT 1
    `);

    const deleteStmt = db.prepare('DELETE FROM employees WHERE id = ?');

    const transaction = db.transaction(async (employeeIds: string[]) => {
      for (const id of employeeIds) {
        const hasMovements = await checkEmployee.get(id, id, id, id) as any;
        if (hasMovements) {
          throw new Error(`Funcionário com ID ${id} possui movimentações.`);
        }
        await deleteStmt.run(id);
      }
    });

    await transaction(ids);
    revalidatePath('/admin/employees');
    return { success: true, message: `${ids.length} funcionários excluídos com sucesso.` };
  } catch (error: any) {
    console.error('Failed to delete employees batch:', error);
    return { success: false, error: error.message || 'Erro ao excluir funcionários em lote' };
  }
}

export async function saveQuestorEmployees(companyId: string, employees: any[]) {
    const session = await getSession();
    if (!session || (session.role !== 'admin' && session.role !== 'operator')) {
        return { success: false, error: 'Não autorizado' };
    }

    if (session.role === 'operator') {
        const restricted = await db.prepare('SELECT 1 FROM user_restricted_companies WHERE user_id = ? AND company_id = ?').get(session.user_id, companyId);
        if (restricted) return { success: false, error: 'Sem permissão para esta empresa.' };
    }

    try {
        const checkStmt = db.prepare('SELECT id FROM employees WHERE company_id = ? AND cpf = ?');
        const insertStmt = db.prepare(`
            INSERT INTO employees (
                id, company_id, code, name, admission_date, birth_date, gender, pis, cpf, esocial_registration, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `);
        
        let importedCount = 0;
        let ignoredCount = 0;

        const transaction = db.transaction(async (emps: any[]) => {
            for (const emp of emps) {
                const existing = await checkStmt.get(companyId, emp.cpf) as any;
                if (existing) {
                    ignoredCount++;
                    continue;
                }
                
                await insertStmt.run(
                    uuidv4(),
                    companyId,
                    emp.code,
                    emp.name,
                    emp.admission_date,
                    emp.birth_date,
                    emp.sex || emp.gender,
                    emp.pis,
                    emp.cpf,
                    emp.esocial_registration
                );
                importedCount++;
            }
        });

        await transaction(employees);
        revalidatePath('/admin/employees');
        return { 
            success: true, 
            message: `${importedCount} funcionários importados. ${ignoredCount} já existiam e foram ignorados.` 
        };
    } catch (error) {
        console.error('Failed to save Questor employees:', error);
        return { success: false, error: 'Erro ao salvar funcionários do Questor.' };
    }
}
