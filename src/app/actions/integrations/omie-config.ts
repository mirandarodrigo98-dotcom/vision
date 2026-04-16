'use server';

import db from '@/lib/db';
import { revalidatePath } from 'next/cache';

export interface OmieConfig {
  app_key: string;
  app_secret: string;
  is_active: boolean;
}

export async function getOmieConfig(companyId: number = 1) {
  try {
    // Ensure table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS omie_config (
        id SERIAL PRIMARY KEY,
        app_key VARCHAR(255),
        app_secret VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `, []);

    const config = (await db.query('SELECT * FROM omie_config WHERE id = $1', [companyId])).rows[0] as any;
    if (config) {
      config.is_active = Boolean(config.is_active);
    }
    return config as OmieConfig | undefined;
  } catch (error) {
    console.error('Erro ao buscar configuração do Omie:', error);
    return undefined;
  }
}

export async function saveOmieConfig(data: OmieConfig, companyId: number = 1) {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS omie_config (
        id SERIAL PRIMARY KEY,
        app_key VARCHAR(255),
        app_secret VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `, []);

    const isActive = data.is_active ? 1 : 0;
    const existing = (await db.query('SELECT * FROM omie_config WHERE id = $1', [companyId])).rows[0];

    if (existing) {
      await db.query(`UPDATE omie_config 
         SET app_key = $1, app_secret = $2, is_active = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`, [data.app_key || null, data.app_secret || null, isActive, companyId]);
    } else {
      await db.query(`INSERT INTO omie_config (id, app_key, app_secret, is_active) 
         VALUES ($4, $1, $2, $3)`, [data.app_key || null, data.app_secret || null, isActive, companyId]);
    }
    revalidatePath('/admin/integrations/omie');
    return { success: true };
  } catch (error: any) {
    console.error('Erro ao salvar configuração do Omie:', error);
    return { error: 'Erro ao salvar configurações do Omie.' };
  }
}
