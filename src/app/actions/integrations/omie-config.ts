'use server';

import db from '@/lib/db';
import { revalidatePath } from 'next/cache';

export interface OmieConfig {
  app_key: string;
  app_secret: string;
  is_active: boolean;
}

export async function getOmieConfig() {
  try {
    // Ensure table exists
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS omie_config (
        id SERIAL PRIMARY KEY,
        app_key VARCHAR(255),
        app_secret VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `).run();

    const config = await db.prepare('SELECT * FROM omie_config WHERE id = 1').get() as any;
    if (config) {
      config.is_active = Boolean(config.is_active);
    }
    return config as OmieConfig | undefined;
  } catch (error) {
    console.error('Erro ao buscar configuração do Omie:', error);
    return undefined;
  }
}

export async function saveOmieConfig(data: OmieConfig) {
  try {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS omie_config (
        id SERIAL PRIMARY KEY,
        app_key VARCHAR(255),
        app_secret VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `).run();

    const isActive = data.is_active ? 1 : 0;
    const existing = await db.prepare('SELECT * FROM omie_config WHERE id = 1').get();

    if (existing) {
      await db.prepare(
        `UPDATE omie_config 
         SET app_key = ?, app_secret = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = 1`
      ).run(data.app_key || null, data.app_secret || null, isActive);
    } else {
      await db.prepare(
        `INSERT INTO omie_config (id, app_key, app_secret, is_active) 
         VALUES (1, ?, ?, ?)`
      ).run(data.app_key || null, data.app_secret || null, isActive);
    }
    revalidatePath('/admin/integrations/omie');
    return { success: true };
  } catch (error: any) {
    console.error('Erro ao salvar configuração do Omie:', error);
    return { error: 'Erro ao salvar configurações do Omie.' };
  }
}
