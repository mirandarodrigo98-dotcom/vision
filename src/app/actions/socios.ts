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
      query += ` AND scs.company_id IN (SELECT company_id FROM user_companies WHERE user_id = ?)`;
      params.push(session.user_id);
    } else if (session.role === 'operator') {
      query += ` AND (scs.company_id IS NULL OR scs.company_id NOT IN (SELECT company_id FROM user_restricted_companies WHERE user_id = ?))`;
      params.push(session.user_id);
    }
    
    if (q) {
      query += ` AND (ss.nome ILIKE ? OR ss.cpf ILIKE ? OR cc.razao_social ILIKE ?)`;
      const likeQ = `%${q}%`;
      params.push(likeQ, likeQ, likeQ);
    }
    
    query += ` ORDER BY ss.nome ASC`;
    
    const socios = await db.prepare(query).all(...params);
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
    const socio = await db.prepare(`
      SELECT 
        ss.*,
        scs.company_id,
        scs.participacao_percent,
        scs.is_representative,
        cc.filial
      FROM societario_socios ss
      LEFT JOIN societario_company_socios scs ON scs.socio_id = ss.id
      LEFT JOIN client_companies cc ON cc.id = scs.company_id
      WHERE ss.id = ?
    `).get(id) as any;

    if (!socio) return null;

    if (session.role === 'client_user') {
      const hasAccess = await db.prepare('SELECT 1 FROM user_companies WHERE user_id = ? AND company_id = ?').get(session.user_id, socio.company_id);
      if (!hasAccess) return null;
    } else if (session.role === 'operator') {
      if (socio.company_id) {
        const restricted = await db.prepare('SELECT 1 FROM user_restricted_companies WHERE user_id = ? AND company_id = ?').get(session.user_id, socio.company_id);
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
    const hasAccess = await db.prepare('SELECT 1 FROM user_companies WHERE user_id = ? AND company_id = ?').get(session.user_id, data.companyId);
    if (!hasAccess) return { success: false, message: 'Sem permissão para esta empresa.' };
  } else if (session.role === 'operator') {
    const restricted = await db.prepare('SELECT 1 FROM user_restricted_companies WHERE user_id = ? AND company_id = ?').get(session.user_id, data.companyId);
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
      const existingSocio = await db.prepare('SELECT id FROM societario_socios WHERE cpf = ?').get(data.cpf) as { id: string } | undefined;
      
      if (existingSocio) {
        socioId = existingSocio.id;
        // Update existing socio
        await db.prepare(`
          UPDATE societario_socios SET
            nome = ?,
            data_nascimento = ?,
            rg = ?,
            orgao_expedidor = ?,
            uf_orgao_expedidor = ?,
            data_expedicao = ?,
            cep = ?,
            logradouro_tipo = ?,
            logradouro = ?,
            numero = ?,
            complemento = ?,
            bairro = ?,
            municipio = ?,
            uf = ?,
            updated_at = NOW()
          WHERE id = ?
        `).run(
          data.nome,
          data.dataNascimento || null,
          data.rg || null,
          data.orgaoExpedidor || null,
          data.ufOrgaoExpedidor || null,
          data.dataExpedicao || null,
          data.cep || null,
          data.logradouroTipo || null,
          data.logradouro || null,
          data.numero || null,
          data.complemento || null,
          data.bairro || null,
          data.municipio || null,
          data.uf || null,
          socioId
        );
      } else {
        // Create new socio
        socioId = randomUUID();
        await db.prepare(`
          INSERT INTO societario_socios (
            id, nome, cpf, data_nascimento, rg, orgao_expedidor, uf_orgao_expedidor, data_expedicao,
            cep, logradouro_tipo, logradouro, numero, complemento, bairro, municipio, uf, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `).run(
          socioId,
          data.nome,
          data.cpf,
          data.dataNascimento || null,
          data.rg || null,
          data.orgaoExpedidor || null,
          data.ufOrgaoExpedidor || null,
          data.dataExpedicao || null,
          data.cep || null,
          data.logradouroTipo || null,
          data.logradouro || null,
          data.numero || null,
          data.complemento || null,
          data.bairro || null,
          data.municipio || null,
          data.uf || null
        );
      }
    } else {
       // Update logic if ID is provided explicitly (edit mode)
       await db.prepare(`
          UPDATE societario_socios SET
            nome = ?,
            cpf = ?,
            data_nascimento = ?,
            rg = ?,
            orgao_expedidor = ?,
            uf_orgao_expedidor = ?,
            data_expedicao = ?,
            cep = ?,
            logradouro_tipo = ?,
            logradouro = ?,
            numero = ?,
            complemento = ?,
            bairro = ?,
            municipio = ?,
            uf = ?,
            updated_at = NOW()
          WHERE id = ?
        `).run(
          data.nome,
          data.cpf,
          data.dataNascimento || null,
          data.rg || null,
          data.orgaoExpedidor || null,
          data.ufOrgaoExpedidor || null,
          data.dataExpedicao || null,
          data.cep || null,
          data.logradouroTipo || null,
          data.logradouro || null,
          data.numero || null,
          data.complemento || null,
          data.bairro || null,
          data.municipio || null,
          data.uf || null,
          socioId
        );
    }

    // Link to company
    // Check if link exists
    const existingLink = await db.prepare('SELECT id FROM societario_company_socios WHERE company_id = ? AND socio_id = ?').get(data.companyId, socioId);
    
    // Enforce single representative rule: if this one is representative, unset others
    if (data.isRepresentative) {
      await db.prepare('UPDATE societario_company_socios SET is_representative = 0, updated_at = NOW() WHERE company_id = ? AND socio_id != ?').run(data.companyId, socioId);
    }

    if (!existingLink) {
      const linkId = randomUUID();
      await db.prepare(`
        INSERT INTO societario_company_socios (id, company_id, socio_id, participacao_percent, is_representative, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, NOW(), NOW())
      `).run(linkId, data.companyId, socioId, participacao, data.isRepresentative ? 1 : 0);
    } else {
      // Update participation and representative status if link exists
      await db.prepare(`
        UPDATE societario_company_socios 
        SET participacao_percent = ?, is_representative = ?, updated_at = NOW()
        WHERE id = ?
      `).run(participacao, data.isRepresentative ? 1 : 0, existingLink.id);
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
      const restrictedLinks = await db.prepare(`
        SELECT 1 
        FROM societario_company_socios scs
        JOIN user_restricted_companies urc ON urc.company_id = scs.company_id
        WHERE scs.socio_id = ? AND urc.user_id = ?
      `).get(id, session.user_id);
      
      if (restrictedLinks) {
        return { success: false, message: 'Não é possível excluir este sócio pois ele está vinculado a uma empresa restrita.' };
      }
    } else if (session.role === 'client_user') {
       // Client user can only delete if they have access to ALL companies the socio is linked to?
       // Or maybe just check if they have access to at least one?
       // Safe approach: Client users usually manage their own companies. 
       // If a socio is shared with a company they don't access, deleting it would affect the other company.
       // For now, let's just ensure they have access to the companies linked.
       const unauthorizedLinks = await db.prepare(`
          SELECT 1
          FROM societario_company_socios scs
          WHERE scs.socio_id = ? 
          AND scs.company_id NOT IN (SELECT company_id FROM user_companies WHERE user_id = ?)
       `).get(id, session.user_id);

       if (unauthorizedLinks) {
          return { success: false, message: 'Não é possível excluir este sócio pois ele está vinculado a outras empresas que você não tem acesso.' };
       }
    }

    // Delete links first
    await db.prepare('DELETE FROM societario_company_socios WHERE socio_id = ?').run(id);
    // Delete socio
    await db.prepare('DELETE FROM societario_socios WHERE id = ?').run(id);
    
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
    const hasAccess = await db.prepare('SELECT 1 FROM user_companies WHERE user_id = ? AND company_id = ?').get(session.user_id, companyId);
    if (!hasAccess) return { success: false, message: 'Sem permissão para esta empresa.' };
  } else if (session.role === 'operator') {
    const restricted = await db.prepare('SELECT 1 FROM user_restricted_companies WHERE user_id = ? AND company_id = ?').get(session.user_id, companyId);
    if (restricted) return { success: false, message: 'Sem permissão para esta empresa.' };
  }

  try {
    await db.prepare(`
      UPDATE societario_company_socios
      SET is_active = false, updated_at = NOW()
      WHERE socio_id = ? AND company_id = ?
    `).run(socioId, companyId);
    
    revalidatePath('/admin/socios');
    return { success: true, message: 'Sócio desligado com sucesso!' };
  } catch (error) {
    console.error('Error desligar socio:', error);
    return { success: false, message: 'Erro ao desligar sócio.' };
  }
}
