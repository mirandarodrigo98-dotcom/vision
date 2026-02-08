'use server';

import db from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { getSession } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import { revalidatePath } from 'next/cache';
import * as Papa from 'papaparse';

export async function createCompany(data: FormData) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  const nome = data.get('nome') as string;
  const razao_social = data.get('razao_social') as string;
  const cnpj = data.get('cnpj') as string;
  const telefone = data.get('telefone') as string;
  const email_contato = data.get('email_contato') as string;
  const code = data.get('code') as string;
  const address_type = data.get('address_type') as string;
  const address_street = data.get('address_street') as string;
  const address_number = data.get('address_number') as string;
  const address_complement = data.get('address_complement') as string;
  const address_zip_code = data.get('address_zip_code') as string;

  if (!nome || !cnpj || !code) {
    return { error: 'Nome, CNPJ e Código são obrigatórios.' };
  }

  try {
    const id = uuidv4();
    await db.prepare(`
      INSERT INTO client_companies (
        id, nome, razao_social, cnpj, telefone, email_contato, code,
        address_type, address_street, address_number, address_complement, address_zip_code,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(
      id, nome, razao_social, cnpj, telefone, email_contato, code,
      address_type, address_street, address_number, address_complement, address_zip_code
    );

    logAudit({
      action: 'CREATE_CLIENT',
      actor_user_id: session.user_id,
      actor_email: session.email,
      role: 'admin',
      entity_type: 'company',
      entity_id: id,
      metadata: { nome, cnpj, code },
      success: true
    });

    revalidatePath('/admin/clients');
    return { success: true };
  } catch (error: any) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.code === '23505') {
      if (error.message.includes('code') || (error.constraint && error.constraint.includes('code'))) {
        return { error: 'Código já cadastrado.' };
      }
      return { error: 'CNPJ já cadastrado.' };
    }
    return { error: 'Erro ao criar empresa.' };
  }
}

export async function updateCompany(id: string, data: FormData) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  const nome = data.get('nome') as string;
  const razao_social = data.get('razao_social') as string;
  const cnpj = data.get('cnpj') as string;
  const telefone = data.get('telefone') as string;
  const email_contato = data.get('email_contato') as string;
  const code = data.get('code') as string;
  const filial = data.get('filial') as string;
  const municipio = data.get('municipio') as string;
  const uf = data.get('uf') as string;
  const data_abertura = data.get('data_abertura') as string;
  const address_type = data.get('address_type') as string;
  const address_street = data.get('address_street') as string;
  const address_number = data.get('address_number') as string;
  const address_complement = data.get('address_complement') as string;
  const address_zip_code = data.get('address_zip_code') as string;

  if (!code) {
    return { error: 'Código é obrigatório.' };
  }

  // Check for linked records to enforce integrity
  const existingCompany = await db.prepare('SELECT code, cnpj FROM client_companies WHERE id = ?').get(id) as { code: string; cnpj: string };
  
  if (existingCompany) {
    const hasLinkedRecords = await db.prepare(`
      SELECT 1 FROM employees WHERE company_id = ?
      UNION SELECT 1 FROM admission_requests WHERE company_id = ?
      UNION SELECT 1 FROM user_companies WHERE company_id = ?
      LIMIT 1
    `).get(id, id, id);

    if (hasLinkedRecords) {
      if (existingCompany.code !== code) {
        return { error: 'Não é permitido alterar o CÓDIGO de uma empresa que possui vínculos (funcionários, admissões, etc).' };
      }
      if (existingCompany.cnpj !== cnpj) {
        return { error: 'Não é permitido alterar o CNPJ de uma empresa que possui vínculos (funcionários, admissões, etc).' };
      }
    }
  }

  try {
    await db.prepare(`
      UPDATE client_companies 
      SET nome = ?, razao_social = ?, cnpj = ?, telefone = ?, email_contato = ?, code = ?, 
          filial = ?, municipio = ?, uf = ?, data_abertura = ?,
          address_type = ?, address_street = ?, address_number = ?, address_complement = ?, address_zip_code = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      nome, razao_social, cnpj, telefone, email_contato, code, 
      filial, municipio, uf, data_abertura, 
      address_type, address_street, address_number, address_complement, address_zip_code,
      id
    );

    logAudit({
      action: 'UPDATE_CLIENT',
      actor_user_id: session.user_id,
      actor_email: session.email,
      role: 'admin',
      entity_type: 'company',
      entity_id: id,
      metadata: { nome, cnpj, code, filial, municipio, uf, data_abertura, address_zip_code },
      success: true
    });

    revalidatePath('/admin/clients');
    return { success: true };
  } catch (error: any) {
     if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.code === '23505') {
       if (error.message.includes('code') || (error.constraint && error.constraint.includes('code'))) {
        return { error: 'Código já cadastrado.' };
      }
      return { error: 'CNPJ já cadastrado.' };
    }
    return { error: 'Erro ao atualizar empresa.' };
  }
}

export async function deleteCompany(id: string) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  // Check for linked records
  const hasLinkedRecords = await db.prepare(`
    SELECT 1 FROM employees WHERE company_id = ?
    UNION SELECT 1 FROM admission_requests WHERE company_id = ?
    UNION SELECT 1 FROM transfer_requests WHERE source_company_id = ? OR target_company_id = ?
    UNION SELECT 1 FROM user_companies WHERE company_id = ?
    LIMIT 1
  `).get(id, id, id, id, id);

  if (hasLinkedRecords) {
    return { error: 'Não é possível excluir a empresa pois existem registros vinculados (funcionários, admissões, usuários, etc).' };
  }

  try {
    const company = await db.prepare('SELECT * FROM client_companies WHERE id = ?').get(id) as any;
    
    await db.prepare('DELETE FROM client_companies WHERE id = ?').run(id);

    logAudit({
      action: 'DELETE_CLIENT',
      actor_user_id: session.user_id,
      actor_email: session.email,
      role: 'admin',
      entity_type: 'company',
      entity_id: id,
      metadata: { company_name: company?.nome || undefined, company_code: company?.code || undefined },
      success: true
    });

    revalidatePath('/admin/clients');
    return { success: true };
  } catch (error) {
    console.error('Error deleting company:', error);
    return { error: 'Erro ao excluir empresa.' };
  }
}

export async function toggleCompanyStatus(id: string, isActive: boolean) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  await db.prepare("UPDATE client_companies SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(isActive ? 1 : 0, id);
  
  logAudit({
    action: 'TOGGLE_CLIENT_STATUS',
    actor_user_id: session.user_id,
    actor_email: session.email,
    role: 'admin',
    entity_type: 'company',
    entity_id: id,
    metadata: { isActive },
    success: true
  });
  
  revalidatePath('/admin/clients');
  return { success: true };
}

const sanitizeString = (str: string | undefined | null) => {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-zA-Z0-9\s\-\.\/,]/g, '') // Keep alphanum, space, dash, dot, slash, comma
    .trim();
};

export async function importCompanies(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return { error: 'Não autorizado' };
  }

  const file = formData.get('file') as File;
  if (!file) {
    return { error: 'Arquivo não fornecido.' };
  }

  // Handle file encoding (likely Windows-1252 for Excel CSVs in Brazil)
  const buffer = await file.arrayBuffer();
  let text = '';
  
  try {
    // Try UTF-8 first
    const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
    text = utf8Decoder.decode(buffer);
  } catch (e) {
    // Fallback to Windows-1252 (ANSI) if UTF-8 fails
    try {
      const fallbackDecoder = new TextDecoder('windows-1252');
      text = fallbackDecoder.decode(buffer);
    } catch (err) {
      console.error('Decoding failed:', err);
      return { error: 'Erro de codificação do arquivo. Salve como UTF-8 ou ANSI.' };
    }
  }

  try {
    const parseResult = Papa.parse(text as any, {
      header: true,
      skipEmptyLines: true,
    }) as unknown as Papa.ParseResult<any>;

    if (parseResult.errors.length > 0) {
      console.error('CSV Parse Errors:', parseResult.errors);
      return { error: 'Erro ao processar arquivo CSV.' };
    }

    const rows = parseResult.data as any[];
    let successCount = 0;
    let errorCount = 0;

    const stmt = db.prepare(`
      INSERT INTO client_companies (
        id, code, filial, cnpj, razao_social, nome, 
        municipio, uf, data_abertura, email_contato,
        address_type, address_street, address_number, address_complement, address_zip_code, address_neighborhood,
        created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, 
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      ON CONFLICT(cnpj) DO UPDATE SET
        code = excluded.code,
        filial = excluded.filial,
        razao_social = excluded.razao_social,
        nome = excluded.nome,
        municipio = excluded.municipio,
        uf = excluded.uf,
        data_abertura = excluded.data_abertura,
        email_contato = excluded.email_contato,
        address_type = excluded.address_type,
        address_street = excluded.address_street,
        address_number = excluded.address_number,
        address_complement = excluded.address_complement,
        address_zip_code = excluded.address_zip_code,
        address_neighborhood = excluded.address_neighborhood,
        updated_at = CURRENT_TIMESTAMP
    `);

    // Using transaction for batch insert
    const insertMany = db.transaction(async (items: any[]) => {
      // Prepared statements for checks
      const findByCnpjStmt = db.prepare('SELECT id, code FROM client_companies WHERE cnpj = ?');
      const findByCodeStmt = db.prepare('SELECT id, cnpj FROM client_companies WHERE code = ?');
      const checkLinksStmt = db.prepare(`
        SELECT 1 FROM employees WHERE company_id = ?
        UNION SELECT 1 FROM admission_requests WHERE company_id = ?
        UNION SELECT 1 FROM user_companies WHERE company_id = ?
        LIMIT 1
      `);

      for (const row of items) {
        try {
        // Mapping fields
        /*
        "CODIGOEMPRESA","CODIGOESTAB","INSCRFEDERAL","DATAINICIOATIV","NOMEESTABCOMPLETO",
        "NOMEFANTASIA","DESCRTIPOLOGRAD","ENDERECOESTAB","NUMENDERESTAB","COMPLENDERESTAB",
        "BAIRROENDERESTAB","NOMEMUNIC","SIGLAESTADO","CEPENDERESTAB","EMAILDPO" 
        */
        let code = row['CODIGOEMPRESA']?.trim();
        const filial = row['CODIGOESTAB']?.trim();
        const cnpj = row['INSCRFEDERAL']?.trim();
        const razao_social = sanitizeString(row['NOMEESTABCOMPLETO']);
        const nome = sanitizeString(row['NOMEFANTASIA']);
        
        const address_type = row['DESCRTIPOLOGRAD']?.trim();
        const address_street = sanitizeString(row['ENDERECOESTAB']);
        const address_number = row['NUMENDERESTAB']?.trim();
        const address_complement = sanitizeString(row['COMPLENDERESTAB']);
        const address_neighborhood = sanitizeString(row['BAIRROENDERESTAB']);
        const municipio = sanitizeString(row['NOMEMUNIC']);
        const uf = row['SIGLAESTADO']?.trim();
        const address_zip_code = row['CEPENDERESTAB']?.trim();
        const email = row['EMAILDPO']?.trim();
        
        const abertura = row['DATAINICIOATIV']?.trim();

        if (!cnpj || !razao_social) {
          console.warn('Skipping row missing CNPJ or EMPRESA:', row);
          errorCount++;
          continue;
        }

        // Convert date DD/MM/YYYY to YYYY-MM-DD
        let data_abertura = null;
        if (abertura) {
            const parts = abertura.split('/');
            if (parts.length === 3) {
                data_abertura = `${parts[2]}-${parts[1]}-${parts[0]}`;
            } else {
                data_abertura = abertura;
            }
        }

          // Check for existing company by CNPJ
          const existingCompany = await findByCnpjStmt.get(cnpj) as { id: string; code: string };

          if (existingCompany) {
             // Company exists. Check integrity rules.
             // Fix: Pass company_id for ALL 3 placeholders in the UNION query
             const isLinked = await checkLinksStmt.get(existingCompany.id, existingCompany.id, existingCompany.id);
             
             if (isLinked) {
                // If linked, prevent Code change.
                // We force the code to be the EXISTING code, so the UPSERT won't change it.
                // Even if the CSV has a different code, we ignore it to preserve integrity.
                if (code && code !== existingCompany.code) {
                   console.warn(`Cannot update Code for linked company ${cnpj}. Preserving existing code.`);
                   code = existingCompany.code;
                }
             }
          }

          // Check if code (the one we are about to use) already exists for a DIFFERENT CNPJ
          if (code) {
             const codeOwner = await findByCodeStmt.get(code) as { id: string; cnpj: string };
             if (codeOwner && codeOwner.cnpj !== cnpj) {
                 console.warn(`Code ${code} already exists for another company ${codeOwner.cnpj}. Skipping.`);
                 errorCount++;
                 continue;
             }
          }

          const id = uuidv4(); 
          
          await stmt.run(
            id, code, filial, cnpj, razao_social, nome,
            municipio, uf, data_abertura, email,
            address_type, address_street, address_number, address_complement, address_zip_code, address_neighborhood
          );
          successCount++;
        } catch (err) {
          console.error('Error inserting row:', row, err);
          errorCount++;
        }
      }
    });

    await insertMany(rows);

    logAudit({
      action: 'IMPORT_COMPANIES_CSV',
      actor_user_id: session.user_id,
      actor_email: session.email,
      role: 'admin',
      entity_type: 'company',
      metadata: { successCount, errorCount },
      success: true
    });

    revalidatePath('/admin/clients');
    return { success: true, count: successCount, errors: errorCount };

  } catch (error) {
    console.error('Import Error:', error);
    return { error: 'Erro ao processar importação.' };
  }
}

export async function getCompanies() {
  const session = await getSession();
  if (!session) return [];

  try {
    const companies = await db.prepare(`
      SELECT id, nome 
      FROM client_companies 
      WHERE is_active = 1
      ORDER BY nome ASC
    `).all();
    return companies as { id: string; nome: string }[];
  } catch (error) {
    console.error('Failed to fetch companies:', error);
    return [];
  }
}
