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
            const existing = (await db.query(`SELECT id, nome FROM client_companies WHERE cnpj = $1`, [companyData.cnpj])).rows[0] as any;
            if (existing) {
                existingId = existing.id;
                existingNome = existing.nome;
            }
        }
        
        // Se não achou por CNPJ, tenta por Código (mas cuidado, código pode duplicar em sistemas diferentes)
        // O ideal é confiar no CNPJ. Se não tiver CNPJ, aí sim Código.
        if (!existingId && companyData.code) {
             const existing = (await db.query(`SELECT id, nome FROM client_companies WHERE code = $1`, [companyData.code])).rows[0] as any;
             if (existing) {
                 existingId = existing.id;
                 existingNome = existing.nome;
             }
        }

        if (existingId) {
            // Check operator access
            if (session.role === 'operator') {
                const restricted = (await db.query(`SELECT 1 FROM user_restricted_companies WHERE user_id = $1 AND company_id = $2`, [session.user_id, existingId])).rows[0];
                if (restricted) return { error: 'Sem permissão para esta empresa.' };
            }

            // ATUALIZAÇÃO (UPDATE)
            await db.query(`
                UPDATE client_companies SET
                    code = $1, nome = $2, razao_social = $3, filial = $4, telefone = $5, email_contato = $6,
                    address_street = $7, address_number = $8, address_complement = $9, address_neighborhood = $10, address_zip_code = $11,
                    municipio = $12, uf = $13, data_abertura = $14, capital_social_centavos = $15, address_type = $16,
                    is_active = $17, updated_at = NOW()
                WHERE id = $18
            `, [companyData.code, companyData.nome, companyData.razao_social, companyData.filial, companyData.telefone, companyData.email_contato, companyData.address_street, companyData.address_number, companyData.address_complement, companyData.address_neighborhood, companyData.address_zip_code, companyData.municipio, companyData.uf, companyData.data_abertura, companyData.capital_social_centavos, companyData.address_type, companyData.is_active, existingId]);

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
        
        await db.query(`
            INSERT INTO client_companies (
                id, code, nome, razao_social, cnpj, 
                filial, telefone, email_contato, 
                address_street, address_number, address_complement, address_neighborhood, address_zip_code, 
                municipio, uf, data_abertura, capital_social_centavos, address_type,
                is_active, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW(), NOW())
        `, [id, companyData.code, companyData.nome, companyData.razao_social, companyData.cnpj, companyData.filial, companyData.telefone, companyData.email_contato, companyData.address_street, companyData.address_number, companyData.address_complement, companyData.address_neighborhood, companyData.address_zip_code, companyData.municipio, companyData.uf, companyData.data_abertura, companyData.capital_social_centavos, companyData.address_type, companyData.is_active]);

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
  const company = (await db.query(`SELECT id, code, nome, razao_social, cnpj, telefone, email_contato, address_type, address_street, address_number, address_complement, address_zip_code, address_neighborhood, municipio, uf, data_abertura, is_active, capital_social_centavos
       FROM client_companies WHERE id = $1`, [companyId])).rows[0] as any;
  if (!company) return;
  await db.query(`INSERT INTO societario_company_history (
        id, company_id, code, nome, razao_social, cnpj, telefone, email_contato, address_type, address_street, address_number, address_complement, address_zip_code, address_neighborhood, municipio, uf, data_abertura, status, capital_social_centavos, snapshot_at, source
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW(), $20)`, [uuidv4(), company.id, company.code || null, company.nome || null, company.razao_social || null, company.cnpj || null, company.telefone || null, company.email_contato || null, company.address_type || null, company.address_street || null, company.address_number || null, company.address_complement || null, company.address_zip_code || null, company.address_neighborhood || null, company.municipio || null, company.uf || null, company.data_abertura || null, company.is_active ? 'ATIVA' : 'INATIVA', company.capital_social_centavos ?? null, source]);
}

async function upsertCompanySocios(companyId: string, sociosInput: any[], actorUserId?: string) {
  if (!sociosInput || sociosInput.length === 0) return;
  const sum = sociosInput.reduce((acc, s) => acc + (s.participacao_percent || 0), 0);
  const rounded = Math.round(sum * 100) / 100;
  if (rounded !== 100) {
    throw new Error('O total das participações dos sócios deve ser exatamente 100%.');
  }
  for (const s of sociosInput) {
    const cpfDigits = String(s.cpf || '').replace(/\D/g, '');
    const socioIdExisting = (await db.query(`SELECT id FROM societario_socios WHERE cpf = $1`, [cpfDigits])).rows[0] as { id: string } | undefined;
    const socioId = socioIdExisting?.id || uuidv4();
    
    await db.query(`
      INSERT INTO societario_socios (id, cpf, nome, data_nascimento, rg, cnh, cep, logradouro_tipo, logradouro, numero, complemento, bairro, municipio, uf, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
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
        updated_at = NOW()
    `, [
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
    ]);

    await db.query(`
      INSERT INTO societario_company_socios (id, company_id, socio_id, participacao_percent, is_representative, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      ON CONFLICT(company_id, socio_id) DO UPDATE SET
        participacao_percent = excluded.participacao_percent,
        is_representative = excluded.is_representative,
        updated_at = NOW()
    `, [randomUUID(), companyId, socioId, s.participacao_percent || 0, s.is_representative ? 1 : 0]);

    await db.query(`
      INSERT INTO societario_socios_history (id, socio_id, cpf, nome, data_nascimento, rg, cnh, cep, logradouro_tipo, logradouro, numero, complemento, bairro, municipio, uf, source, snapshot_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW())
    `, [
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
    ]);
  }
}

export async function createCompany(data: FormData) {
  const session = await getSession();
  if (!session || (session.role !== 'admin' && session.role !== 'operator')) {
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
  const data_nascimento = data.get('data_nascimento') as string;
  const address_type = data.get('address_type') as string;
  const address_street = data.get('address_street') as string;
  const address_number = data.get('address_number') as string;
  const address_complement = data.get('address_complement') as string;
  const address_neighborhood = data.get('address_neighborhood') as string;
  const address_zip_code = data.get('address_zip_code') as string;
  const capitalStr = (data.get('capital_social_centavos') as string) || '';
  const capital_social_centavos = capitalStr ? Number(capitalStr) : null;

  const isCpf = cnpj.replace(/\D/g, '').length === 11;

  if (!cnpj || !code || !filial) {
    return { error: 'CNPJ/CPF, Código e Filial são obrigatórios.' };
  }

  if (!isCpf && !nome) {
    return { error: 'Nome Fantasia é obrigatório para empresas.' };
  }

  if (!razao_social) {
    return { error: 'Razão Social é obrigatória.' };
  }

  try {
    const id = uuidv4();
    await db.query(`
      INSERT INTO client_companies (
        id, nome, razao_social, cnpj, telefone, email_contato, code, filial, municipio, uf, data_abertura, data_nascimento, capital_social_centavos,
        address_type, address_street, address_number, address_complement, address_neighborhood, address_zip_code, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, 1, NOW(), NOW())
    `, [id, nome || razao_social, razao_social || null, cnpj, telefone || null, email_contato || null, code, filial, municipio || null, uf || null, data_abertura || null, data_nascimento || null, capital_social_centavos, address_type || null, address_street || null, address_number || null, address_complement || null, address_neighborhood || null, address_zip_code || null]);

    // Socios
    const socios = extractSociosFromForm(data);
    await upsertCompanySocios(id, socios);

    // Initial snapshot
    await insertCompanyHistorySnapshot(id, 'initial_creation');

    await logAudit({
      actor_user_id: session.user_id,
      role: session.role,
      action: 'CREATE_CLIENT',
      entity_type: 'client_companies',
      entity_id: id,
      metadata: { nome, cnpj },
      success: true
    });
    revalidatePath('/admin/companies');
    return { success: true, companyId: id };
  } catch (error: any) {
    console.error('Failed to create company:', error);
    await logAudit({
      actor_user_id: session.user_id,
      role: session.role,
      action: 'CREATE_CLIENT',
      entity_type: 'client_companies',
      entity_id: 'new',
      metadata: { nome, cnpj, error: String(error) },
      success: false
    });
    
    if (error.code === '23505') {
      return { error: 'Já existe uma empresa cadastrada com esta mesma combinação de Código, Filial e CNPJ.' };
    }
    
    return { error: 'Erro ao criar empresa: ' + (error.message || 'Desconhecido') };
  }
}

export async function updateCompany(companyId: string, data: FormData) {
  const session = await getSession();
  if (!session || (session.role !== 'admin' && session.role !== 'operator')) {
    return { error: 'Não autorizado' };
  }

  if (session.role === 'operator') {
    const restricted = (await db.query(`SELECT 1 FROM user_restricted_companies WHERE user_id = $1 AND company_id = $2`, [session.user_id, companyId])).rows[0];
    if (restricted) return { error: 'Sem permissão para esta empresa.' };
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
  const data_nascimento = data.get('data_nascimento') as string;
  const address_type = data.get('address_type') as string;
  const address_street = data.get('address_street') as string;
  const address_number = data.get('address_number') as string;
  const address_complement = data.get('address_complement') as string;
  const address_neighborhood = data.get('address_neighborhood') as string;
  const address_zip_code = data.get('address_zip_code') as string;
  const capitalStr = (data.get('capital_social_centavos') as string) || '';
  const capital_social_centavos = capitalStr ? Number(capitalStr) : null;

  const isCpf = cnpj.replace(/\D/g, '').length === 11;

  if (!cnpj || !code || !filial) {
    return { error: 'CNPJ/CPF, Código e Filial são obrigatórios.' };
  }

  if (!isCpf && !nome) {
    return { error: 'Nome Fantasia é obrigatório para empresas.' };
  }

  if (!razao_social) {
    return { error: 'Razão Social é obrigatória.' };
  }

  try {
    await db.query(`
      UPDATE client_companies SET
        nome = $1, razao_social = $2, cnpj = $3, telefone = $4, email_contato = $5, code = $6, filial = $7, municipio = $8, uf = $9, data_abertura = $10, data_nascimento = $11, capital_social_centavos = $12,
        address_type = $13, address_street = $14, address_number = $15, address_complement = $16, address_neighborhood = $17, address_zip_code = $18, updated_at = NOW()
      WHERE id = $19
    `, [nome || razao_social, razao_social || null, cnpj, telefone || null, email_contato || null, code, filial, municipio || null, uf || null, data_abertura || null, data_nascimento || null, capital_social_centavos, address_type || null, address_street || null, address_number || null, address_complement || null, address_neighborhood || null, address_zip_code || null, companyId]);

    // Socios
    const socios = extractSociosFromForm(data);
    await upsertCompanySocios(companyId, socios);

    // Snapshot after update
    await insertCompanyHistorySnapshot(companyId, 'update_form');

    await logAudit({
      actor_user_id: session.user_id,
      role: session.role,
      action: 'UPDATE_CLIENT',
      entity_type: 'client_companies',
      entity_id: companyId,
      metadata: { nome, cnpj },
      success: true
    });
    revalidatePath('/admin/companies');
    revalidatePath(`/admin/companies/${companyId}`);
    return { success: true };
  } catch (error: any) {
    console.error('Failed to update company:', error);
    await logAudit({
      actor_user_id: session.user_id,
      role: session.role,
      action: 'UPDATE_CLIENT',
      entity_type: 'client_companies',
      entity_id: companyId,
      metadata: { error: String(error) },
      success: false
    });
    
    if (error.code === '23505') {
      return { error: 'Já existe uma empresa cadastrada com esta mesma combinação de Código, Filial e CNPJ.' };
    }
    
    return { error: 'Erro ao atualizar empresa: ' + (error.message || 'Desconhecido') };
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
      await db.query(`UPDATE client_companies SET is_active = 1, deleted_at = NULL, updated_at = NOW() WHERE id = $1`, [companyId]);
    } else {
      await db.query(`UPDATE client_companies SET is_active = 0, updated_at = NOW() WHERE id = $1`, [companyId]);
    }
    
    await logAudit({
      actor_user_id: session.user_id,
      role: session.role,
      action: 'TOGGLE_CLIENT_STATUS',
      entity_type: 'client_companies',
      entity_id: companyId,
      metadata: { is_active: status },
      success: true
    });
    revalidatePath('/admin/companies');
    return { success: true };
  } catch (error) {
    console.error('Failed to toggle company status:', error);
    return { error: 'Erro ao atualizar status da empresa' };
  }
}

export async function checkCompanyMovements(companyId: string): Promise<boolean> {
  const employee = (await db.query(`SELECT 1 FROM employees WHERE company_id = $1`, [companyId])).rows[0];
  if (employee) return true;

  const admission = (await db.query(`SELECT 1 FROM admission_requests WHERE company_id = $1`, [companyId])).rows[0];
  if (admission) return true;

  const transfer = (await db.query(`SELECT 1 FROM transfer_requests WHERE source_company_id = $1 OR target_company_id = $2`, [companyId, companyId])).rows[0];
  if (transfer) return true;

  const user = (await db.query(`SELECT 1 FROM user_companies WHERE company_id = $1`, [companyId])).rows[0];
  if (user) return true;

  // Check societario processes
  const process = (await db.query(`SELECT 1 FROM societario_processes WHERE company_id = $1`, [companyId])).rows[0];
  if (process) return true;

  return false;
}

async function cleanupCompanyDependencies(companyId: string) {
  // Delete history
  await db.query(`DELETE FROM societario_company_history WHERE company_id = $1`, [companyId]);
  
  // Delete partners links
  await db.query(`DELETE FROM societario_company_socios WHERE company_id = $1`, [companyId]);

  // Delete profiles
  await db.query(`DELETE FROM societario_profiles WHERE company_id = $1`, [companyId]);

  // Delete logs
  await db.query(`DELETE FROM societario_logs WHERE company_id = $1`, [companyId]);

  // Delete billing info
  await db.query(`DELETE FROM simples_nacional_billing WHERE company_id = $1`, [companyId]);
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

    await db.query(`DELETE FROM client_companies WHERE id = $1`, [companyId]);
    
    await logAudit({
      actor_user_id: session.user_id,
      role: session.role,
      action: 'DELETE_CLIENT',
      entity_type: 'client_companies',
      entity_id: companyId,
      metadata: {},
      success: true
    });
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
    

    for (const id of companyIds) {
      const hasMovements = await checkCompanyMovements(id);
      if (!hasMovements) {
        // Cleanup dependencies before deleting
        await cleanupCompanyDependencies(id);
        
        await db.query(`DELETE FROM client_companies WHERE id = $1`, [id]);
        deletedCount++;
        await logAudit({
          actor_user_id: session.user_id,
          role: session.role,
          action: 'DELETE_CLIENT',
          entity_type: 'client_companies',
          entity_id: id,
          metadata: { batch: true },
          success: true
        });
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
    query += ` AND id IN (SELECT company_id FROM user_companies WHERE user_id = $1)`;
    params.push(session.user_id);
  } else if (session.role === 'operator') {
    query += ` AND id NOT IN (SELECT company_id FROM user_restricted_companies WHERE user_id = $1)`;
    params.push(session.user_id);
  }

  query += ` ORDER BY nome ASC`;

  const companies = (await db.query(query, [...params])).rows;
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

    

    for (const row of rows) {
      const nome = row.nome || row.Nome || row.NOME;
      const cnpj = row.cnpj || row.CNPJ || row.Cnpj;
      const code = row.code || row.codigo || row.Código || row.CODIGO;
      const filial = row.filial || row.Filial || row.FILIAL;

      if (!nome || !cnpj || !code) continue;

      const cleanCnpj = String(cnpj).replace(/\D/g, '');
      
      // Check if exists by CNPJ or Code
      const existing = (await db.query(`SELECT id FROM client_companies WHERE cnpj = $1 OR code = $2`, [cleanCnpj, code])).rows[0];
      
      if (!existing) {
         await db.query(`
           INSERT INTO client_companies (id, nome, razao_social, cnpj, code, filial, municipio, uf, is_active, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1, NOW(), NOW())
         `, [
           uuidv4(),
           nome,
           row.razao_social || row.RazaoSocial || '',
           cleanCnpj,
           code,
           filial || '1',
           row.municipio || row.Municipio || '',
           row.uf || row.UF || ''
         ]);
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

export async function getCompanies(filters?: { razao_social?: string, cnpj?: string, nome?: string, code?: string, status?: string }) {
  const session = await getSession();
  if (!session) return [];

  let query = `
    SELECT * 
    FROM client_companies 
    WHERE 1=1
  `;
  const params: any[] = [];

  if (filters?.status === 'active') {
    query += ` AND is_active = 1`;
  } else if (filters?.status === 'inactive') {
    query += ` AND is_active = 0`;
  }

  if (filters?.razao_social) {
    query += ` AND razao_social ILIKE '%' || $${params.length + 1} || '%'`;
    params.push(filters.razao_social);
  }
  if (filters?.cnpj) {
    query += ` AND cnpj ILIKE '%' || $${params.length + 1} || '%'`;
    params.push(filters.cnpj);
  }
  if (filters?.nome) {
    query += ` AND nome ILIKE '%' || $${params.length + 1} || '%'`;
    params.push(filters.nome);
  }
  if (filters?.code) {
    query += ` AND code ILIKE '%' || $${params.length + 1} || '%'`;
    params.push(filters.code);
  }

  if (session.role === 'client_user') {
    query += ` AND id IN (SELECT company_id FROM user_companies WHERE user_id = $1)`;
    params.push(session.user_id);
  } else if (session.role === 'operator') {
    query += ` AND id NOT IN (SELECT company_id FROM user_restricted_companies WHERE user_id = $1)`;
    params.push(session.user_id);
  }

  query += ` ORDER BY nome ASC`;

  try {
    const companies = (await db.query(query, [...params])).rows;
    return companies;
  } catch (error) {
    console.error('Failed to fetch companies:', error);
    return [];
  }
}

export async function getCompanySocios(companyId: string) {
  const session = await getSession();
  if (!session) return [];

  if (session.role === 'client_user') {
    const hasAccess = (await db.query(`SELECT 1 FROM user_companies WHERE user_id = $1 AND company_id = $2`, [session.user_id, companyId])).rows[0];
    if (!hasAccess) return [];
  } else if (session.role === 'operator') {
    const restricted = (await db.query(`SELECT 1 FROM user_restricted_companies WHERE user_id = $1 AND company_id = $2`, [session.user_id, companyId])).rows[0];
    if (restricted) return [];
  }

  try {
    const socios = (await db.query(`
      SELECT s.id, s.nome, s.cpf, cs.participacao_percent, cs.is_representative, s.data_nascimento, s.rg, s.cnh, s.cep, s.logradouro, s.numero, s.complemento, s.bairro, s.municipio, s.uf, s.logradouro_tipo
      FROM societario_socios s
      JOIN societario_company_socios cs ON s.id = cs.socio_id
      WHERE cs.company_id = $1
    `, [companyId])).rows;
    return socios;
  } catch (error) {
    console.error('Error fetching company socios:', error);
    return [];
  }
}

export async function getCompanyDetailsFull(companyId: string) {
  const session = await getSession();
  if (!session) return null;

  if (session.role === 'client_user') {
    const hasAccess = (await db.query(`SELECT 1 FROM user_companies WHERE user_id = $1 AND company_id = $2`, [session.user_id, companyId])).rows[0];
    if (!hasAccess) return null;
  } else if (session.role === 'operator') {
    const restricted = (await db.query(`SELECT 1 FROM user_restricted_companies WHERE user_id = $1 AND company_id = $2`, [session.user_id, companyId])).rows[0];
    if (restricted) return null;
  }

  try {
    const company = (await db.query(`
      SELECT * FROM client_companies WHERE id = $1
    `, [companyId])).rows[0];
    return company;
  } catch (error) {
    console.error('Error fetching company details:', error);
    return null;
  }
}

