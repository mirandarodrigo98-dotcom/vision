'use server';

import db from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { getSession } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import { validateCNPJ } from '@/lib/validators';
import { revalidatePath } from 'next/cache';
import * as Papa from 'papaparse';
import { randomUUID } from 'crypto';

function extractSociosFromForm(data: FormData) {
  const sociosMap = new Map<number, any>();
  for (const [key, value] of data.entries() as any) {
    const match = String(key).match(/^socio\[(\d+)\]\[(.+)\]$/);
    if (match) {
      const index = Number(match[1]);
      const field = match[2];
      if (!sociosMap.has(index)) sociosMap.set(index, {});
      const obj = sociosMap.get(index);
      obj[field] = value;
      sociosMap.set(index, obj);
    }
  }
  const socios = Array.from(sociosMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, v]) => ({
      nome: (v['nome'] as string) || '',
      cpf: (v['cpf'] as string) || '',
      data_nascimento: (v['data_nascimento'] as string) || '',
      rg: (v['rg'] as string) || '',
      cnh: (v['cnh'] as string) || '',
      participacao_percent: v['participacao_percent'] != null ? Number(v['participacao_percent']) : 0,
      cep: (v['cep'] as string) || '',
      logradouro_tipo: (v['logradouro_tipo'] as string) || '',
      logradouro: (v['logradouro'] as string) || '',
      numero: (v['numero'] as string) || '',
      complemento: (v['complemento'] as string) || '',
      bairro: (v['bairro'] as string) || '',
      municipio: (v['municipio'] as string) || '',
      uf: (v['uf'] as string) || '',
    }));
  return socios;
}

async function insertCompanyHistorySnapshot(companyId: string, source: string) {
  const company = await db
    .prepare(
      `SELECT id, code, nome, razao_social, cnpj, telefone, email_contato, address_type, address_street, address_number, address_complement, address_zip_code, address_neighborhood, municipio, uf, data_abertura, is_active, capital_social_centavos
       FROM client_companies WHERE id = ?`
    )
    .get(companyId) as any;
  if (!company) return;
  await db
    .prepare(
      `INSERT INTO societario_company_history (
        id, company_id, code, nome, razao_social, cnpj, telefone, email_contato, address_type, address_street, address_number, address_complement, address_zip_code, address_neighborhood, municipio, uf, data_abertura, status, capital_social_centavos, snapshot_at, source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)`
    )
    .run(
      uuidv4(),
      company.id,
      company.code || null,
      company.nome || null,
      company.razao_social || null,
      company.cnpj || null,
      company.telefone || null,
      company.email_contato || null,
      company.address_type || null,
      company.address_street || null,
      company.address_number || null,
      company.address_complement || null,
      company.address_zip_code || null,
      company.address_neighborhood || null,
      company.municipio || null,
      company.uf || null,
      company.data_abertura || null,
      company.is_active ? 'ATIVA' : 'INATIVA',
      company.capital_social_centavos ?? null,
      source
    );
}

async function upsertCompanySocios(companyId: string, sociosInput: any[], actorUserId?: string) {
  if (!sociosInput || sociosInput.length === 0) return;
  const sum = sociosInput.reduce((acc, s) => acc + (s.participacao_percent || 0), 0);
  const rounded = Math.round(sum * 100) / 100;
  if (rounded !== 100) {
    throw new Error('O total das participações dos sócios deve ser exatamente 100%.');
  }
  const upsertSocioStmt = db.prepare(`
    INSERT INTO societario_socios (id, cpf, nome, data_nascimento, rg, cnh, cep, logradouro_tipo, logradouro, numero, complemento, bairro, municipio, uf, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    ON CONFLICT(cpf) DO UPDATE SET
      nome = excluded.nome,
      data_nascimento = excluded.data_nascimento,
      rg = excluded.rg,
      cnh = excluded.cnh,
      cep = excluded.cep,
      logradouro_tipo = excluded.logradouro_tipo,
      logradouro = excluded.logradouro,
      numero = excluded.numero,
      complemento = excluded.complemento,
      bairro = excluded.bairro,
      municipio = excluded.municipio,
      uf = excluded.uf,
      updated_at = datetime('now')
  `);
  const findSocioByCpfStmt = db.prepare(`SELECT id FROM societario_socios WHERE cpf = ?`);
  const upsertLinkStmt = db.prepare(`
    INSERT INTO societario_company_socios (id, company_id, socio_id, participacao_percent, created_at, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    ON CONFLICT(company_id, socio_id) DO UPDATE SET
      participacao_percent = excluded.participacao_percent,
      updated_at = datetime('now')
  `);
  const insertSocioHistoryStmt = db.prepare(`
    INSERT INTO societario_socio_history (
      id, socio_id, cpf, nome, data_nascimento, rg, cnh, cep, logradouro_tipo, logradouro, numero, complemento, bairro, municipio, uf, snapshot_at, source
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)
  `);

  for (const s of sociosInput) {
    const cpfDigits = String(s.cpf || '').replace(/\D/g, '');
    const socioIdExisting = await findSocioByCpfStmt.get(cpfDigits) as { id: string } | undefined;
    const socioId = socioIdExisting?.id || uuidv4();
    await upsertSocioStmt.run(
      socioId,
      cpfDigits,
      s.nome || '',
      s.data_nascimento || null,
      s.rg || null,
      s.cnh || null,
      s.cep || null,
      s.logradouro_tipo || null,
      s.logradouro || null,
      s.numero || null,
      s.complemento || null,
      s.bairro || null,
      s.municipio || null,
      s.uf || null
    );
    await upsertLinkStmt.run(randomUUID(), companyId, socioId, s.participacao_percent || 0);
    await insertSocioHistoryStmt.run(
      uuidv4(),
      socioId,
      cpfDigits,
      s.nome || '',
      s.data_nascimento || null,
      s.rg || null,
      s.cnh || null,
      s.cep || null,
      s.logradouro_tipo || null,
      s.logradouro || null,
      s.numero || null,
      s.complemento || null,
      s.bairro || null,
      s.municipio || null,
      s.uf || null,
      'company_form'
    );
  }
}

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
  const address_neighborhood = data.get('address_neighborhood') as string;
  const address_zip_code = data.get('address_zip_code') as string;
  const capitalStr = (data.get('capital_social_centavos') as string) || '';
  const capital_social_centavos = capitalStr ? Number(capitalStr) : null;

  if (!nome || !cnpj || !code) {
    return { error: 'Nome, CNPJ e Código são obrigatórios.' };
  }

  try {
    const id = uuidv4();
    await db.prepare(`
      INSERT INTO client_companies (
        id, nome, razao_social, cnpj, telefone, email_contato, code, capital_social_centavos,
        address_type, address_street, address_number, address_complement, address_neighborhood, address_zip_code,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(
      id, nome, razao_social, cnpj, telefone, email_contato, code, capital_social_centavos,
      address_type, address_street, address_number, address_complement, address_neighborhood, address_zip_code
    );

    const socios = extractSociosFromForm(data);
    if (socios.length > 0) {
      await upsertCompanySocios(id, socios, session.user_id);
    }
    await insertCompanyHistorySnapshot(id, 'company_form');

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
  const address_neighborhood = data.get('address_neighborhood') as string;
  const address_zip_code = data.get('address_zip_code') as string;
  const capitalStr = (data.get('capital_social_centavos') as string) || '';
  const capital_social_centavos = capitalStr ? Number(capitalStr) : null;

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
      SET 
          nome = COALESCE(?, nome), 
          razao_social = COALESCE(?, razao_social), 
          cnpj = COALESCE(?, cnpj), 
          telefone = COALESCE(?, telefone), 
          email_contato = COALESCE(?, email_contato), 
          code = COALESCE(?, code), 
          filial = COALESCE(?, filial), 
          municipio = COALESCE(?, municipio), 
          uf = COALESCE(?, uf), 
          data_abertura = COALESCE(?, data_abertura), 
          capital_social_centavos = COALESCE(?, capital_social_centavos),
          address_type = COALESCE(?, address_type), 
          address_street = COALESCE(?, address_street), 
          address_number = COALESCE(?, address_number), 
          address_complement = COALESCE(?, address_complement), 
          address_neighborhood = COALESCE(?, address_neighborhood), 
          address_zip_code = COALESCE(?, address_zip_code),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      nome, razao_social, cnpj, telefone, email_contato, code, 
      filial, municipio, uf, data_abertura, capital_social_centavos,
      address_type, address_street, address_number, address_complement, address_neighborhood, address_zip_code,
      id
    );

    const socios = extractSociosFromForm(data);
    if (socios.length > 0) {
      await upsertCompanySocios(id, socios, session.user_id);
    }
    await insertCompanyHistorySnapshot(id, 'company_form');

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
    if (typeof error?.message === 'string' && error.message.includes('O total das participações dos sócios')) {
      return { error: error.message };
    }
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.code === '23505') {
      if (error.message.includes('code') || (error.constraint && error.constraint.includes('code'))) {
        return { error: 'Código já cadastrado.' };
      }
      return { error: 'CNPJ já cadastrado.' };
    }
    console.error('UPDATE_COMPANY_ERROR', error);
    return { error: String(error?.message || 'Erro ao atualizar empresa.') };
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

  try {
    await db.prepare("UPDATE client_companies SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(isActive ? 1 : 0, id);
  } catch (error) {
    console.error('Failed to toggle company status:', error);
    return { error: 'Erro ao alterar status.' };
  }
  
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

        if (!validateCNPJ(cnpj)) {
          console.warn('Skipping row with invalid CNPJ:', row);
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

export async function getCompanyDetailsFull(id: string) {
  const session = await getSession();
  if (!session) return null;
  try {
    const company = await db.prepare(`
      SELECT
        id, code, razao_social, nome, cnpj, telefone, email_contato,
        address_type, address_street, address_number, address_complement,
        address_neighborhood, address_zip_code, municipio, uf,
        capital_social_centavos
      FROM client_companies
      WHERE id = ?
    `).get(id) as {
      id: string;
      code: string | null;
      razao_social: string | null;
      nome: string | null;
      cnpj: string | null;
      telefone: string | null;
      email_contato: string | null;
      address_type: string | null;
      address_street: string | null;
      address_number: string | null;
      address_complement: string | null;
      address_neighborhood: string | null;
      address_zip_code: string | null;
      municipio: string | null;
      uf: string | null;
      capital_social_centavos: number | null;
    } | undefined;
    return company || null;
  } catch (error) {
    console.error('Failed to fetch company details:', error);
    return null;
  }
}

export async function getCompanySocios(companyId: string) {
  const session = await getSession();
  if (!session) return [];
  try {
    const socios = await db
      .prepare(
        `
        SELECT 
          ss.nome,
          ss.cpf,
          ss.data_nascimento,
          ss.rg,
          ss.cnh,
          scs.participacao_percent,
          ss.cep,
          ss.logradouro_tipo,
          ss.logradouro,
          ss.numero,
          ss.complemento,
          ss.bairro,
          ss.municipio,
          ss.uf
        FROM societario_company_socios scs
        JOIN societario_socios ss ON ss.id = scs.socio_id
        WHERE scs.company_id = ?
        ORDER BY ss.nome ASC
        `
      )
      .all(companyId);
    return socios as {
      nome: string;
      cpf: string;
      data_nascimento?: string | null;
      rg?: string | null;
      cnh?: string | null;
      participacao_percent?: number | null;
      cep?: string | null;
      logradouro_tipo?: string | null;
      logradouro?: string | null;
      numero?: string | null;
      complemento?: string | null;
      bairro?: string | null;
      municipio?: string | null;
      uf?: string | null;
    }[];
  } catch (error) {
    console.error('Failed to fetch company socios:', error);
    return [];
  }
}
