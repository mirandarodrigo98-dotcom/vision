'use server';

import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import Papa from 'papaparse';
import { parse as parseDate } from 'date-fns';

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

export async function getEmployees() {
  const session = await getSession();
  if (!session) return [];

  try {
    const employees = await db.prepare(`
      SELECT e.*, c.nome as company_name 
      FROM employees e
      JOIN client_companies c ON e.company_id = c.id
      ORDER BY e.created_at DESC
    `).all();
    return employees;
  } catch (error) {
    console.error('Failed to fetch employees:', error);
    return [];
  }
}

export async function importEmployees(formData: FormData) {
  const session = await getSession();
  if (!session || (session.role !== 'admin' && session.role !== 'operator')) {
    return { error: 'Não autorizado' };
  }

  const file = formData.get('file') as File;

  if (!file) {
    return { error: 'Arquivo é obrigatório' };
  }

  try {
    const csvText = await file.text();
    const { data, errors } = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().replace(/"/g, ''),
    });

    if (errors.length > 0) {
      console.error('Erros no CSV:', errors);
      return { error: 'Erro ao processar o arquivo CSV' };
    }

      // Pre-fetch all active companies to map by code
    const companies = await db.prepare('SELECT id, code FROM client_companies WHERE is_active = 1').all() as { id: string; code: string }[];
    const companyMap = new Map<string, string>();
    companies.forEach(c => {
      if (c.code) companyMap.set(c.code, c.id);
    });

    let count = 0;
    const errorsList: string[] = [];

    const insert = db.transaction(async (rows: any[]) => {
      const stmt = db.prepare(`
        INSERT INTO employees (
          id, company_id, code, name, admission_date, birth_date, gender, pis, cpf, esocial_registration, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-03:00'), datetime('now', '-03:00'))
      `);

      for (const [index, row] of rows.entries()) {
        // "codigoempresa","codigofuncpessoa","nomefunc","dataadm","datanasc","sexo","pisfunc","cpffunc","matriculaesocial"
        
        const companyCode = row.codigoempresa;
        if (!companyCode) {
           errorsList.push(`Linha ${index + 2}: Código da empresa não informado.`);
           continue;
        }

        const companyId = companyMap.get(companyCode);

        if (!companyId) {
          errorsList.push(`Linha ${index + 2}: Empresa com código '${companyCode}' não encontrada.`);
          continue; // Skip if company not found
        }

        // Handle gender mapping
        let gender = null;
        if (row.sexo === '1') gender = 'M';
        else if (row.sexo === '2') gender = 'F';
        
        // Handle date parsing
        let admissionDate = null;
        if (row.dataadm) {
          try {
            const parsed = parseDate(row.dataadm, 'dd/MM/yyyy', new Date());
            if (!isNaN(parsed.getTime())) admissionDate = parsed.toISOString();
          } catch (e) {}
        }

        let birthDate = null;
        if (row.datanasc) {
          try {
            const parsed = parseDate(row.datanasc, 'dd/MM/yyyy', new Date());
            if (!isNaN(parsed.getTime())) birthDate = parsed.toISOString();
          } catch (e) {}
        }

        await stmt.run(
          uuidv4(),
          companyId,
          row.codigofuncpessoa || null,
          row.nomefunc,
          admissionDate,
          birthDate,
          gender,
          row.pisfunc || null,
          row.cpffunc || null,
          row.matriculaesocial || null
        );
        count++;
      }
    });

    await insert(data);
    revalidatePath('/admin/employees');
    
    if (count === 0 && errorsList.length > 0) {
      return { error: `Nenhum funcionário importado. Erros: ${errorsList.slice(0, 3).join('; ')}...` };
    }

    return { success: true, count, warnings: errorsList.length > 0 ? errorsList : undefined };
  } catch (error) {
    console.error('Import failed:', error);
    return { error: 'Falha na importação. Verifique o formato do arquivo.' };
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
      UPDATE employees 
      SET company_id = ?, code = ?, name = ?, admission_date = ?, birth_date = ?, gender = ?, pis = ?, cpf = ?, esocial_registration = ?, updated_at = datetime('now', '-03:00')
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
    return { success: true };
  } catch (error) {
    console.error('Failed to update employee:', error);
    return { error: 'Erro ao atualizar funcionário' };
  }
}

export async function getEmployeesByCompany(companyId: string) {
  const session = await getSession();
  if (!session) return [];

  // Verify access
  if (session.role === 'client_user') {
     const hasAccess = await db.prepare('SELECT 1 FROM user_companies WHERE user_id = ? AND company_id = ?').get(session.user_id, companyId);
     if (!hasAccess) return [];
  }

  try {
    const employees = await db.prepare(`
      SELECT id, name, cpf
      FROM employees e
      WHERE company_id = ? AND is_active = 1
      AND NOT EXISTS (
        SELECT 1 FROM transfer_requests tr 
        WHERE tr.employee_name = e.name 
        AND tr.source_company_id = e.company_id
        AND tr.status NOT IN ('COMPLETED', 'CANCELED', 'REJECTED')
      )
      ORDER BY name ASC
    `).all(companyId) as any[];
    return employees;
  } catch (error) {
    console.error('Failed to fetch company employees:', error);
    return [];
  }
}

export async function toggleEmployeeStatus(id: string, isActive: boolean) {
  const session = await getSession();
  if (!session || (session.role !== 'admin' && session.role !== 'operator')) {
    return { error: 'Unauthorized' };
  }

  try {
    await db.prepare(`
      UPDATE employees 
      SET is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(isActive ? 1 : 0, id);

    revalidatePath('/admin/employees');
    return { success: true };
  } catch (error) {
    console.error('Failed to toggle employee status:', error);
    return { error: 'Erro ao alterar status do funcionário' };
  }
}
