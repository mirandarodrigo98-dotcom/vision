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

export async function getSocios(q: string = '') {
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
    `;
    
    const params: any[] = [];
    
    if (q) {
      query += ` WHERE (ss.nome ILIKE $1 OR ss.cpf ILIKE $2 OR cc.razao_social ILIKE $3)`;
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
  try {
    const socio = await db.prepare(`
      SELECT 
        ss.*,
        scs.company_id,
        scs.participacao_percent,
        cc.filial
      FROM societario_socios ss
      LEFT JOIN societario_company_socios scs ON scs.socio_id = ss.id
      LEFT JOIN client_companies cc ON cc.id = scs.company_id
      WHERE ss.id = ?
    `).get(id);
    return socio;
  } catch (error) {
    console.error('Error fetching socio:', error);
    return null;
  }
}

export async function saveSocio(data: SocioData) {
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
    
    if (!existingLink) {
      const linkId = randomUUID();
      await db.prepare(`
        INSERT INTO societario_company_socios (id, company_id, socio_id, participacao_percent, created_at, updated_at)
        VALUES (?, ?, ?, ?, NOW(), NOW())
      `).run(linkId, data.companyId, socioId, participacao);
    } else {
      // Update participation if link exists
      await db.prepare(`
        UPDATE societario_company_socios 
        SET participacao_percent = ?, updated_at = NOW()
        WHERE id = ?
      `).run(participacao, existingLink.id);
    }

    revalidatePath('/admin/socios');
    
    return { success: true, message: 'Sócio salvo com sucesso!' };
  } catch (error) {
    console.error('Error saving socio:', error);
    return { success: false, message: 'Erro ao salvar sócio.' };
  }
}

export async function deleteSocio(id: string) {
  try {
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
