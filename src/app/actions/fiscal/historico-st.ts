'use server';

import db from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function listarHistoricoSt() {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: 'Usuário não autenticado.' };

    const { rows } = await db.query(`
      SELECT 
        id as consulta_id, 
        empresa_nome as empresa, 
        user_name,
        created_at as data_consulta,
        arquivos_enviados,
        arquivos_validos,
        arquivos_invalidos,
        resultado_json
      FROM fiscal_conferencias_st
      ORDER BY created_at DESC
      LIMIT 100
    `);

    return { success: true, data: rows };
  } catch (error: any) {
    console.error('Erro ao listar histórico de ST:', error);
    return { success: false, error: 'Erro ao buscar histórico.' };
  }
}
