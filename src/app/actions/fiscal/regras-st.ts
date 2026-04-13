'use server';

import db from '@/lib/db';
import { getUserPermissions } from '../permissions';
import { parse } from 'csv-parse/sync';

export interface RegraFiscalST {
  id?: number;
  uf: string;
  item: number | null;
  nome_item: string | null;
  subitem: string | null;
  cest: string | null;
  ncm_sh: string | null;
  descricao: string | null;
  mva_original: number | null;
  mva_ajustada_int12: number | null;
  mva_ajustada_int4: number | null;
  fundamento_normativo: string | null;
  ambito_aplicacao?: string | null;
  notas?: string | null;
}

export async function listarRegrasST(uf?: string, search?: string) {
  try {
    let query = 'SELECT * FROM fiscal_regras_st WHERE 1=1';
    const params: any[] = [];
    
    if (uf) {
      params.push(uf);
      query += ` AND uf = $${params.length}`;
    }
    
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (ncm_sh ILIKE $${params.length} OR cest ILIKE $${params.length} OR nome_item ILIKE $${params.length})`;
    }
    
    query += ' ORDER BY uf, ncm_sh ASC';
    
    const { rows } = await db.query(query, params);
    return { success: true, data: rows };
  } catch (error: any) {
    console.error('Erro ao listar regras ST:', error);
    return { success: false, error: 'Erro ao buscar regras fiscais.' };
  }
}

export async function salvarRegraST(data: RegraFiscalST) {
  try {
    const permissions = await getUserPermissions();
    if (!permissions.includes('fiscal.view')) {
      return { success: false, error: 'Acesso negado.' };
    }

    if (data.id) {
      await db.query(`
        UPDATE fiscal_regras_st 
        SET uf = $1, item = $2, nome_item = $3, subitem = $4, cest = $5, ncm_sh = $6, 
            descricao = $7, mva_original = $8, mva_ajustada_int12 = $9, mva_ajustada_int4 = $10, 
            fundamento_normativo = $11, ambito_aplicacao = $12, notas = $13, updated_at = NOW()
        WHERE id = $14
      `, [
        data.uf, data.item, data.nome_item, data.subitem, data.cest, data.ncm_sh,
        data.descricao, data.mva_original, data.mva_ajustada_int12, data.mva_ajustada_int4,
        data.fundamento_normativo, data.ambito_aplicacao, data.notas, data.id
      ]);
      return { success: true, message: 'Regra atualizada com sucesso.' };
    } else {
      await db.query(`
        INSERT INTO fiscal_regras_st 
        (uf, item, nome_item, subitem, cest, ncm_sh, descricao, mva_original, mva_ajustada_int12, mva_ajustada_int4, fundamento_normativo, ambito_aplicacao, notas)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `, [
        data.uf, data.item, data.nome_item, data.subitem, data.cest, data.ncm_sh,
        data.descricao, data.mva_original, data.mva_ajustada_int12, data.mva_ajustada_int4,
        data.fundamento_normativo, data.ambito_aplicacao, data.notas
      ]);
      return { success: true, message: 'Regra criada com sucesso.' };
    }
  } catch (error: any) {
    console.error('Erro ao salvar regra ST:', error);
    return { success: false, error: 'Erro ao salvar regra fiscal.' };
  }
}

export async function excluirRegraST(id: number) {
  try {
    await db.query('DELETE FROM fiscal_regras_st WHERE id = $1', [id]);
    return { success: true, message: 'Regra excluída com sucesso.' };
  } catch (error: any) {
    return { success: false, error: 'Erro ao excluir regra fiscal.' };
  }
}

export async function importarRegrasSTCsv(fileContent: string) {
  try {
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      delimiter: ';',
      trim: true
    });

    let count = 0;
    
    // Inicia transação
    await db.query('BEGIN');
    
    for (const row of records) {
      // Mapeamento simples. CSV deve ter headers que batem com esses:
      // UF;ITEM;NOME ITEM;SUBITEM;CEST;NCM/SH;DESCRIÇÃO;MVA ORIGINAL;MVA AJUSTADA INT12;MVA AJUSTADA INT4;FUNDAMENTO NORMATIVO
      const uf = row['UF']?.substring(0, 2);
      if (!uf) continue; // UF é obrigatório
      
      const item = row['ITEM'] ? parseInt(row['ITEM']) : null;
      const nome_item = row['NOME ITEM'] || null;
      const subitem = row['SUBITEM'] || null;
      const cest = row['CEST'] || null;
      const ncm_sh = row['NCM/SH'] || null;
      const descricao = row['DESCRIÇÃO'] || null;
      
      const parseNumber = (val: string) => {
        if (!val) return null;
        const num = parseFloat(val.replace(',', '.'));
        return isNaN(num) ? null : num;
      };
      
      const mva_original = parseNumber(row['MVA ORIGINAL']);
      const mva_ajustada_int12 = parseNumber(row['MVA AJUSTADA INT12']);
      const mva_ajustada_int4 = parseNumber(row['MVA AJUSTADA INT4']);
      const fundamento_normativo = row['FUNDAMENTO NORMATIVO'] || null;

      await db.query(`
        INSERT INTO fiscal_regras_st 
        (uf, item, nome_item, subitem, cest, ncm_sh, descricao, mva_original, mva_ajustada_int12, mva_ajustada_int4, fundamento_normativo)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [uf, item, nome_item, subitem, cest, ncm_sh, descricao, mva_original, mva_ajustada_int12, mva_ajustada_int4, fundamento_normativo]);
      
      count++;
    }
    
    await db.query('COMMIT');
    return { success: true, message: `${count} regras importadas com sucesso.` };
  } catch (error: any) {
    await db.query('ROLLBACK');
    console.error('Erro na importação CSV:', error);
    return { success: false, error: 'Falha ao processar CSV. Verifique se o formato (separador ;) e as colunas estão corretos.' };
  }
}
