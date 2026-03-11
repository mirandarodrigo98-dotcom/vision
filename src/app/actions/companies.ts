'use server';

import db from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { getSession } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import { revalidatePath } from 'next/cache';
import * as Papa from 'papaparse';
import { randomUUID } from 'crypto';

import { fetchQuestorData } from './integrations/questor-syn';

export async function saveQuestorCompany(companyData: any) {
    const session = await getSession();
    if (!session || (session.role !== 'admin' && session.role !== 'operator')) {
      return { error: 'Não autorizado' };
    }

    try {
        console.log('--- SAVING QUESTOR COMPANY ---');
        console.log('Code:', companyData.code);
        console.log('Capital Social:', companyData.capital_social_centavos);
        console.log('Address Type:', companyData.address_type);

        // Verifica se a empresa já existe para Atualizar ou Inserir
        let existingId: string | null = null;
        let existingNome: string | null = null;

        if (companyData.cnpj) {
            const existing = await db.prepare('SELECT id, nome FROM client_companies WHERE cnpj = ?').get(companyData.cnpj) as any;
            if (existing) {
                existingId = existing.id;
                existingNome = existing.nome;
            }
        }
        
        // Se não achou por CNPJ, tenta por Código (mas cuidado, código pode duplicar em sistemas diferentes)
        // O ideal é confiar no CNPJ. Se não tiver CNPJ, aí sim Código.
        if (!existingId && companyData.code) {
             const existing = await db.prepare('SELECT id, nome FROM client_companies WHERE code = ?').get(companyData.code) as any;
             if (existing) {
                 existingId = existing.id;
                 existingNome = existing.nome;
             }
        }

        if (existingId) {
            // ATUALIZAÇÃO (UPDATE)
            await db.prepare(`
                UPDATE client_companies SET
                    code = ?, nome = ?, razao_social = ?, filial = ?, telefone = ?, email_contato = ?,
                    address_street = ?, address_number = ?, address_complement = ?, address_neighborhood = ?, address_zip_code = ?,
                    municipio = ?, uf = ?, data_abertura = ?, capital_social_centavos = ?, address_type = ?,
                    is_active = ?, updated_at = datetime('now')
                WHERE id = ?
            `).run(
                companyData.code,
                companyData.nome,
                companyData.razao_social,
                companyData.filial,
                companyData.telefone,
                companyData.email_contato,
                companyData.address_street,
                companyData.address_number,
                companyData.address_complement,
                companyData.address_neighborhood,
                companyData.address_zip_code,
                companyData.municipio,
                companyData.uf,
                companyData.data_abertura,
                companyData.capital_social_centavos,
                companyData.address_type,
                companyData.is_active,
                existingId
            );

            // Importar/Atualizar Sócios
            if (companyData.socios && Array.isArray(companyData.socios) && companyData.socios.length > 0) {
                 await upsertCompanySocios(existingId, companyData.socios, session.user_id);
            }

            await logAudit({
                actor_user_id: session.user_id,
                role: session.role,
                action: 'UPDATE_CLIENT',
                entity_type: 'client_companies',
                entity_id: existingId,
                metadata: { source: 'Questor Import Update', code: companyData.code, nome: companyData.nome },
                success: true
            });

            revalidatePath('/admin/companies');
            revalidatePath('/admin/clients');
            return { success: true, message: `Empresa ${existingNome} atualizada com sucesso!` };
        }

        // INSERÇÃO (INSERT)
        const id = uuidv4();
        
        await db.prepare(`
            INSERT INTO client_companies (
                id, code, nome, razao_social, cnpj, 
                filial, telefone, email_contato, 
                address_street, address_number, address_complement, address_neighborhood, address_zip_code, 
                municipio, uf, data_abertura, capital_social_centavos, address_type,
                is_active, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `).run(
            id,
            companyData.code,
            companyData.nome,
            companyData.razao_social,
            companyData.cnpj,
            companyData.filial,
            companyData.telefone,
            companyData.email_contato,
            companyData.address_street,
            companyData.address_number,
            companyData.address_complement,
            companyData.address_neighborhood,
            companyData.address_zip_code,
            companyData.municipio,
            companyData.uf,
            companyData.data_abertura,
            companyData.capital_social_centavos,
            companyData.address_type,
            companyData.is_active
        );

        // Importar Sócios se houver
        if (companyData.socios && Array.isArray(companyData.socios) && companyData.socios.length > 0) {
            try {
                await upsertCompanySocios(id, companyData.socios, session.user_id);
            } catch (socioError: any) {
                console.error('Erro ao importar sócios:', socioError);
                // Não falha a importação da empresa, mas avisa
                await logAudit({
                    actor_user_id: session.user_id,
                    role: session.role,
                    action: 'CREATE_CLIENT_SOCIOS_ERROR',
                    entity_type: 'client_companies',
                    entity_id: id,
                    metadata: { error: socioError.message },
                    success: false
                });
                return { success: true, message: `Empresa importada, mas houve erro nos sócios: ${socioError.message}` };
            }
        }

        await logAudit({
            actor_user_id: session.user_id,
            role: session.role,
            action: 'CREATE_CLIENT',
            entity_type: 'client_companies',
            entity_id: id,
            metadata: { source: 'Questor Import Single', code: companyData.code, nome: companyData.nome },
            success: true
        });

        revalidatePath('/admin/companies');
        revalidatePath('/admin/clients');

        return { success: true, message: 'Empresa importada com sucesso!' };

    } catch (error: any) {
        console.error('Failed to save company:', error);
        return { error: 'Erro ao salvar empresa: ' + error.message };
    }
}

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
      is_representative: v['is_representative'] === 'true' || v['is_representative'] === 'on',
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
    INSERT INTO societario_company_socios (id, company_id, socio_id, participacao_percent, is_representative, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    ON CONFLICT(company_id, socio_id) DO UPDATE SET
      participacao_percent = excluded.participacao_percent,
      is_representative = excluded.is_representative,
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
    await upsertLinkStmt.run(randomUUID(), companyId, socioId, s.participacao_percent || 0, s.is_representative ? 1 : 0);
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
    return { error: 'Não autorizado' };
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

  if (!nome || !cnpj || !code || !filial) {
    return { error: 'Nome, CNPJ, Código e Filial são obrigatórios.' };
  }

  try {
    const id = uuidv4();
    await db.prepare(`
      INSERT INTO client_companies (
        id, nome, razao_social, cnpj, telefone, email_contato, code, filial, municipio, uf, data_abertura, capital_social_centavos,
        address_type, address_street, address_number, address_complement, address_neighborhood, address_zip_code, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
    `).run(
      id,
      nome,
      razao_social || null,
      cnpj,
      telefone || null,
      email_contato || null,
      code,
      filial,
      municipio || null,
      uf || null,
      data_abertura || null,
      capital_social_centavos,
      address_type || null,
      address_street || null,
      address_number || null,
      address_complement || null,
      address_neighborhood || null,
      address_zip_code || null
    );

    // Socios
    const socios = extractSociosFromForm(data);
    await upsertCompanySocios(id, socios);

    // Initial snapshot
    await insertCompanyHistorySnapshot(id, 'initial_creation');

    logAudit(session.user_id, session.role, 'CREATE', 'client_companies', id, { nome, cnpj }, true);
    revalidatePath('/admin/companies');
    return { success: true, companyId: id };
  } catch (error) {
    console.error('Failed to create company:', error);
    logAudit(session.user_id, session.role, 'CREATE', 'client_companies', 'new', { nome, cnpj, error: String(error) }, false);
    return { error: 'Erro ao criar empresa' };
  }
}

export async function updateCompany(companyId: string, data: FormData) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return { error: 'Não autorizado' };
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

  try {
    await db.prepare(`
      UPDATE client_companies SET
        nome = ?, razao_social = ?, cnpj = ?, telefone = ?, email_contato = ?, code = ?, filial = ?, municipio = ?, uf = ?, data_abertura = ?, capital_social_centavos = ?,
        address_type = ?, address_street = ?, address_number = ?, address_complement = ?, address_neighborhood = ?, address_zip_code = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      nome,
      razao_social || null,
      cnpj,
      telefone || null,
      email_contato || null,
      code,
      filial,
      municipio || null,
      uf || null,
      data_abertura || null,
      capital_social_centavos,
      address_type || null,
      address_street || null,
      address_number || null,
      address_complement || null,
      address_neighborhood || null,
      address_zip_code || null,
      companyId
    );

    // Socios
    const socios = extractSociosFromForm(data);
    await upsertCompanySocios(companyId, socios);

    // Snapshot after update
    await insertCompanyHistorySnapshot(companyId, 'update_form');

    logAudit(session.user_id, session.role, 'UPDATE', 'client_companies', companyId, { nome, cnpj }, true);
    revalidatePath('/admin/companies');
    revalidatePath(`/admin/companies/${companyId}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to update company:', error);
    logAudit(session.user_id, session.role, 'UPDATE', 'client_companies', companyId, { error: String(error) }, false);
    return { error: 'Erro ao atualizar empresa' };
  }
}

export async function toggleCompanyStatus(companyId: string, isActive: boolean) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return { error: 'Não autorizado' };
  }

  try {
    const status = isActive ? 1 : 0;
    // If activating, we also clear deleted_at if it was set
    if (isActive) {
      await db.prepare("UPDATE client_companies SET is_active = 1, deleted_at = NULL, updated_at = datetime('now') WHERE id = ?").run(companyId);
    } else {
      await db.prepare("UPDATE client_companies SET is_active = 0, updated_at = datetime('now') WHERE id = ?").run(companyId);
    }
    
    logAudit(session.user_id, session.role, 'UPDATE', 'client_companies', companyId, { is_active: status }, true);
    revalidatePath('/admin/companies');
    return { success: true };
  } catch (error) {
    console.error('Failed to toggle company status:', error);
    return { error: 'Erro ao atualizar status da empresa' };
  }
}

export async function checkCompanyMovements(companyId: string): Promise<boolean> {
  const employee = await db.prepare('SELECT 1 FROM employees WHERE company_id = ?').get(companyId);
  if (employee) return true;

  const admission = await db.prepare('SELECT 1 FROM admission_requests WHERE company_id = ?').get(companyId);
  if (admission) return true;

  const transfer = await db.prepare('SELECT 1 FROM transfer_requests WHERE source_company_id = ? OR target_company_id = ?').get(companyId, companyId);
  if (transfer) return true;

  const user = await db.prepare('SELECT 1 FROM user_companies WHERE company_id = ?').get(companyId);
  if (user) return true;

  // Check societario processes
  const process = await db.prepare('SELECT 1 FROM societario_processes WHERE company_id = ?').get(companyId);
  if (process) return true;

  return false;
}

async function cleanupCompanyDependencies(companyId: string) {
  // Delete history
  await db.prepare('DELETE FROM societario_company_history WHERE company_id = ?').run(companyId);
  
  // Delete partners links
  await db.prepare('DELETE FROM societario_company_socios WHERE company_id = ?').run(companyId);

  // Delete profiles
  await db.prepare('DELETE FROM societario_profiles WHERE company_id = ?').run(companyId);

  // Delete logs
  await db.prepare('DELETE FROM societario_logs WHERE company_id = ?').run(companyId);

  // Delete billing info
  await db.prepare('DELETE FROM simples_nacional_billing WHERE company_id = ?').run(companyId);
}

export async function deleteCompany(companyId: string) {
  const session = await getSession();
  if (!session || (session.role !== 'admin' && session.role !== 'operator')) {
    return { error: 'Não autorizado' };
  }

  try {
    const hasMovements = await checkCompanyMovements(companyId);
    if (hasMovements) {
      return { error: 'Esta empresa possui movimentações (funcionários, admissões, processos societários, etc.) e não pode ser excluída.' };
    }

    // Cleanup dependencies before deleting the company
    await cleanupCompanyDependencies(companyId);

    await db.prepare("DELETE FROM client_companies WHERE id = ?").run(companyId);
    
    await logAudit(session.user_id, session.role, 'DELETE', 'client_companies', companyId, {}, true);
    revalidatePath('/admin/companies');
    revalidatePath('/admin/clients');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete company:', error);
    return { error: 'Erro ao excluir empresa' };
  }
}

export async function deleteCompaniesBatch(companyIds: string[]) {
  const session = await getSession();
  if (!session || (session.role !== 'admin' && session.role !== 'operator')) {
    return { error: 'Não autorizado' };
  }

  let deletedCount = 0;
  let errors = 0;

  try {
    const deleteStmt = db.prepare("DELETE FROM client_companies WHERE id = ?");

    for (const id of companyIds) {
      const hasMovements = await checkCompanyMovements(id);
      if (!hasMovements) {
        // Cleanup dependencies before deleting
        await cleanupCompanyDependencies(id);
        
        deleteStmt.run(id);
        deletedCount++;
        await logAudit(session.user_id, session.role, 'DELETE', 'client_companies', id, { batch: true }, true);
      } else {
        errors++;
      }
    }

    revalidatePath('/admin/companies');
    revalidatePath('/admin/clients');
    
    if (errors > 0) {
      return { success: true, message: `${deletedCount} empresas excluídas. ${errors} não puderam ser excluídas pois possuem movimentações.` };
    }
    
    return { success: true, message: `${deletedCount} empresas excluídas com sucesso.` };
  } catch (error) {
    console.error('Failed to delete companies batch:', error);
    return { error: 'Erro ao excluir empresas em lote' };
  }
}

export async function getCompaniesForSelect() {
  const session = await getSession();
  if (!session) return [];

  let query = `SELECT id, nome, razao_social, code, cnpj FROM client_companies WHERE is_active = 1`;
  const params: any[] = [];

  if (session.role === 'client_user') {
    query += ` AND id IN (SELECT company_id FROM user_companies WHERE user_id = ?)`;
    params.push(session.user_id);
  }

  query += ` ORDER BY nome ASC`;

  const companies = await db.prepare(query).all(...params);
  return companies;
}

export async function importCompanies(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return { error: 'Não autorizado' };
  }

  const file = formData.get('file') as File;
  if (!file) {
    return { error: 'Arquivo inválido' };
  }

  try {
    const text = await file.text();
    const result = Papa.parse(text, { header: true, skipEmptyLines: true });
    
    if (result.errors.length > 0) {
      return { error: 'Erro ao ler o CSV: ' + result.errors[0].message };
    }

    const rows = result.data as any[];
    let count = 0;

    const stmt = db.prepare(`
      INSERT INTO client_companies (
        id, nome, razao_social, cnpj, code, filial, municipio, uf, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
    `);

    for (const row of rows) {
      const nome = row.nome || row.Nome || row.NOME;
      const cnpj = row.cnpj || row.CNPJ || row.Cnpj;
      const code = row.code || row.codigo || row.Código || row.CODIGO;
      const filial = row.filial || row.Filial || row.FILIAL;

      if (!nome || !cnpj || !code) continue;

      const cleanCnpj = String(cnpj).replace(/\D/g, '');
      
      // Check if exists by CNPJ or Code
      const existing = await db.prepare('SELECT id FROM client_companies WHERE cnpj = ? OR code = ?').get(cleanCnpj, code);
      
      if (!existing) {
         stmt.run(
           uuidv4(),
           nome,
           row.razao_social || row.RazaoSocial || '',
           cleanCnpj,
           code,
           filial || '1',
           row.municipio || row.Municipio || '',
           row.uf || row.UF || ''
         );
         count++;
      }
    }

    revalidatePath('/admin/companies');
    return { success: true, count };
  } catch (error) {
    console.error('Import error:', error);
    return { error: 'Erro ao processar importação' };
  }
}

export async function getCompanies() {
  const session = await getSession();
  if (!session) return [];

  let query = `
    SELECT * 
    FROM client_companies 
    WHERE is_active = 1
  `;
  const params: any[] = [];

  if (session.role === 'client_user') {
    query += ` AND id IN (SELECT company_id FROM user_companies WHERE user_id = ?)`;
    params.push(session.user_id);
  }

  query += ` ORDER BY nome ASC`;

  try {
    const companies = await db.prepare(query).all(...params);
    return companies;
  } catch (error) {
    console.error('Failed to fetch companies:', error);
    return [];
  }
}

export async function getCompanySocios(companyId: string) {
  const session = await getSession();
  if (!session) return [];

  try {
    const socios = await db.prepare(`
      SELECT s.id, s.nome, s.cpf, cs.participacao_percent, cs.is_representative, s.data_nascimento, s.rg, s.cnh, s.cep, s.logradouro, s.numero, s.complemento, s.bairro, s.municipio, s.uf, s.logradouro_tipo
      FROM societario_socios s
      JOIN societario_company_socios cs ON s.id = cs.socio_id
      WHERE cs.company_id = ?
    `).all(companyId);
    return socios;
  } catch (error) {
    console.error('Error fetching company socios:', error);
    return [];
  }
}

export async function getCompanyDetailsFull(companyId: string) {
  const session = await getSession();
  if (!session) return null;

  try {
    const company = await db.prepare(`
      SELECT * FROM client_companies WHERE id = ?
    `).get(companyId);
    return company;
  } catch (error) {
    console.error('Error fetching company details:', error);
    return null;
  }
}

