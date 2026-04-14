'use server';

import db from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';
import { validateCPF } from '@/lib/validators';

export interface SocioData {
  id?: string;
  companyId: string;
  nome: string;
  cpf: string;
  participacao?: number;
  isRepresentative?: boolean;
  dataNascimento?: string;
  rg?: string;
  orgaoExpedidor?: string;
  ufOrgaoExpedidor?: string;
  dataExpedicao?: string;
  cep?: string;
  logradouroTipo?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
}

import { getSession } from '@/lib/auth';

export async function getSocios(q: string = '') {
  const session = await getSession();
  if (!session) return [];

  try {
    let query = `
      SELECT 
        ss.id,
        ss.nome,
        ss.cpf,
        cc.razao_social as company_name,
        scs.company_id,
        scs.is_active
      FROM societario_socios ss
      LEFT JOIN societario_company_socios scs ON scs.socio_id = ss.id
      LEFT JOIN client_companies cc ON cc.id = scs.company_id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (session.role === 'client_user') {
      query += ` AND scs.company_id IN (SELECT company_id FROM user_companies WHERE user_id = $1)`;
      params.push(session.user_id);
    } else if (session.role === 'operator') {
      query += ` AND (scs.company_id IS NULL OR scs.company_id NOT IN (SELECT company_id FROM user_restricted_companies WHERE user_id = $1))`;
      params.push(session.user_id);
    }
    
    if (q) {
      query += ` AND (ss.nome ILIKE $${params.length + 1} OR ss.cpf ILIKE $${params.length + 1} OR cc.razao_social ILIKE $${params.length + 1})`;
      const likeQ = `%${q}%`;
      params.push(likeQ, likeQ, likeQ);
    }
    
    query += ` ORDER BY ss.nome ASC`;
    
    const socios = (await db.query(query, [...params])).rows;
    return socios;
  } catch (error) {
    console.error('Error fetching socios:', error);
    return [];
  }
}

export async function getSocio(id: string) {
  const session = await getSession();
  if (!session) return null;

  try {
    const socio = (await db.query(`
      SELECT 
        ss.*,
        scs.company_id,
        scs.participacao_percent,
        scs.is_representative,
        cc.filial
      FROM societario_socios ss
      LEFT JOIN societario_company_socios scs ON scs.socio_id = ss.id
      LEFT JOIN client_companies cc ON cc.id = scs.company_id
      WHERE ss.id = $1
    `, [id])).rows[0] as any;

    if (!socio) return null;

    if (session.role === 'client_user') {
      const hasAccess = (await db.query(`SELECT 1 FROM user_companies WHERE user_id = $1 AND company_id = $2`, [session.user_id, socio.company_id])).rows[0];
      if (!hasAccess) return null;
    } else if (session.role === 'operator') {
      if (socio.company_id) {
        const restricted = (await db.query(`SELECT 1 FROM user_restricted_companies WHERE user_id = $1 AND company_id = $2`, [session.user_id, socio.company_id])).rows[0];
        if (restricted) return null;
      }
    }

    return socio;
  } catch (error) {
    console.error('Error fetching socio:', error);
    return null;
  }
}

export async function saveSocio(data: SocioData) {
  const session = await getSession();
  if (!session) return { success: false, message: 'Não autorizado.' };

  if (session.role === 'client_user') {
    const hasAccess = (await db.query(`SELECT 1 FROM user_companies WHERE user_id = $1 AND company_id = $2`, [session.user_id, data.companyId])).rows[0];
    if (!hasAccess) return { success: false, message: 'Sem permissão para esta empresa.' };
  } else if (session.role === 'operator') {
    const restricted = (await db.query(`SELECT 1 FROM user_restricted_companies WHERE user_id = $1 AND company_id = $2`, [session.user_id, data.companyId])).rows[0];
    if (restricted) return { success: false, message: 'Sem permissão para esta empresa.' };
  }

  try {
    if (!validateCPF(data.cpf)) {
      return { success: false, message: 'CPF inválido.' };
    }

    const participacao = data.participacao || 0;

    let socioId = data.id;

    if (!socioId) {
      // Check if CPF already exists
      const existingSocio = (await db.query(`SELECT id FROM societario_socios WHERE cpf = $1`, [data.cpf])).rows[0] as { id: string } | undefined;
      
      if (existingSocio) {
        socioId = existingSocio.id;
        // Update existing socio
        await db.query(`
          UPDATE societario_socios SET
            nome = $1,
            data_nascimento = $2,
            rg = $3,
            orgao_expedidor = $4,
            uf_orgao_expedidor = $5,
            data_expedicao = $6,
            cep = $7,
            logradouro_tipo = $8,
            logradouro = $9,
            numero = $10,
            complemento = $11,
            bairro = $12,
            municipio = $13,
            uf = $14,
            updated_at = NOW()
          WHERE id = $15
        `, [data.nome, data.dataNascimento || null, data.rg || null, data.orgaoExpedidor || null, data.ufOrgaoExpedidor || null, data.dataExpedicao || null, data.cep || null, data.logradouroTipo || null, data.logradouro || null, data.numero || null, data.complemento || null, data.bairro || null, data.municipio || null, data.uf || null, socioId]);
      } else {
        // Create new socio
        socioId = randomUUID();
        await db.query(`
          INSERT INTO societario_socios (
            id, nome, cpf, data_nascimento, rg, orgao_expedidor, uf_orgao_expedidor, data_expedicao,
            cep, logradouro_tipo, logradouro, numero, complemento, bairro, municipio, uf, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW())
        `, [socioId, data.nome, data.cpf, data.dataNascimento || null, data.rg || null, data.orgaoExpedidor || null, data.ufOrgaoExpedidor || null, data.dataExpedicao || null, data.cep || null, data.logradouroTipo || null, data.logradouro || null, data.numero || null, data.complemento || null, data.bairro || null, data.municipio || null, data.uf || null]);
      }
    } else {
       // Update logic if ID is provided explicitly (edit mode)
       await db.query(`
          UPDATE societario_socios SET
            nome = $1,
            cpf = $2,
            data_nascimento = $3,
            rg = $4,
            orgao_expedidor = $5,
            uf_orgao_expedidor = $6,
            data_expedicao = $7,
            cep = $8,
            logradouro_tipo = $9,
            logradouro = $10,
            numero = $11,
            complemento = $12,
            bairro = $13,
            municipio = $14,
            uf = $15,
            updated_at = NOW()
          WHERE id = $16
        `, [data.nome, data.cpf, data.dataNascimento || null, data.rg || null, data.orgaoExpedidor || null, data.ufOrgaoExpedidor || null, data.dataExpedicao || null, data.cep || null, data.logradouroTipo || null, data.logradouro || null, data.numero || null, data.complemento || null, data.bairro || null, data.municipio || null, data.uf || null, socioId]);
    }

    // Link to company
    // Check if link exists
    const existingLink = (await db.query(`SELECT id FROM societario_company_socios WHERE company_id = $1 AND socio_id = $2`, [data.companyId, socioId])).rows[0];
    
    // Enforce single representative rule: if this one is representative, unset others
    if (data.isRepresentative) {
      await db.query(`UPDATE societario_company_socios SET is_representative = 0, updated_at = NOW() WHERE company_id = $1 AND socio_id != $2`, [data.companyId, socioId]);
    }

    if (!existingLink) {
      const linkId = randomUUID();
      await db.query(`
        INSERT INTO societario_company_socios (id, company_id, socio_id, participacao_percent, is_representative, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      `, [linkId, data.companyId, socioId, participacao, data.isRepresentative ? 1 : 0]);
    } else {
      // Update participation and representative status if link exists
      await db.query(`
        UPDATE societario_company_socios 
        SET participacao_percent = $1, is_representative = $2, updated_at = NOW()
        WHERE id = $3
      `, [participacao, data.isRepresentative ? 1 : 0, existingLink.id]);
    }

    revalidatePath('/admin/socios');
    
    return { success: true, message: 'Sócio salvo com sucesso!' };
  } catch (error) {
    console.error('Error saving socio:', error);
    return { success: false, message: 'Erro ao salvar sócio.' };
  }
}

export async function deleteSocio(id: string) {
  const session = await getSession();
  if (!session) return { success: false, message: 'Não autorizado.' };

  try {
    // Check if socio belongs to any restricted company for this user
    if (session.role === 'operator') {
      const restrictedLinks = (await db.query(`
        SELECT 1 
        FROM societario_company_socios scs
        JOIN user_restricted_companies urc ON urc.company_id = scs.company_id
        WHERE scs.socio_id = $1 AND urc.user_id = $2
      `, [id, session.user_id])).rows[0];
      
      if (restrictedLinks) {
        return { success: false, message: 'Não é possível excluir este sócio pois ele está vinculado a uma empresa restrita.' };
      }
    } else if (session.role === 'client_user') {
       // Client user can only delete if they have access to ALL companies the socio is linked to?
       // Or maybe just check if they have access to at least one?
       // Safe approach: Client users usually manage their own companies. 
       // If a socio is shared with a company they don't access, deleting it would affect the other company.
       // For now, let's just ensure they have access to the companies linked.
       const unauthorizedLinks = (await db.query(`
          SELECT 1
          FROM societario_company_socios scs
          WHERE scs.socio_id = $1 
          AND scs.company_id NOT IN (SELECT company_id FROM user_companies WHERE user_id = $2)
       `, [id, session.user_id])).rows[0];

       if (unauthorizedLinks) {
          return { success: false, message: 'Não é possível excluir este sócio pois ele está vinculado a outras empresas que você não tem acesso.' };
       }
    }

    // Delete links first
    await db.query(`DELETE FROM societario_company_socios WHERE socio_id = $1`, [id]);
    // Delete socio
    await db.query(`DELETE FROM societario_socios WHERE id = $1`, [id]);
    
    revalidatePath('/admin/socios');
    return { success: true, message: 'Sócio excluído com sucesso!' };
  } catch (error) {
    console.error('Error deleting socio:', error);
    return { success: false, message: 'Erro ao excluir sócio.' };
  }
}

export async function desligarSocio(socioId: string, companyId: string) {
  const session = await getSession();
  if (!session) return { success: false, message: 'Não autorizado.' };

  if (session.role === 'client_user') {
    const hasAccess = (await db.query(`SELECT 1 FROM user_companies WHERE user_id = $1 AND company_id = $2`, [session.user_id, companyId])).rows[0];
    if (!hasAccess) return { success: false, message: 'Sem permissão para esta empresa.' };
  } else if (session.role === 'operator') {
    const restricted = (await db.query(`SELECT 1 FROM user_restricted_companies WHERE user_id = $1 AND company_id = $2`, [session.user_id, companyId])).rows[0];
    if (restricted) return { success: false, message: 'Sem permissão para esta empresa.' };
  }

  try {
    await db.query(`
      UPDATE societario_company_socios
      SET is_active = false, updated_at = NOW()
      WHERE socio_id = $1 AND company_id = $2
    `, [socioId, companyId]);
    
    revalidatePath('/admin/socios');
    return { success: true, message: 'Sócio desligado com sucesso!' };
  } catch (error) {
    console.error('Error desligar socio:', error);
    return { success: false, message: 'Erro ao desligar sócio.' };
  }
}
