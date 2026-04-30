'use server';

import db from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

export type QuestorZenConfig = {
  id: number;
  client_domain: string;
  access_token: string;
  updated_at: Date;
};

const questorZenConfigSchema = z.object({
  client_domain: z.string().url('O domínio do cliente deve ser uma URL válida').min(1, 'O domínio do cliente é obrigatório'),
  access_token: z.string().min(1, 'O token de acesso é obrigatório'),
});

export async function getQuestorZenConfig(): Promise<QuestorZenConfig | null> {
  const result = await db.query('SELECT * FROM questor_zen_config WHERE id = 1');
  return result.rows[0] || null;
}

export async function saveQuestorZenConfig(data: z.infer<typeof questorZenConfigSchema>) {
  try {
    const validatedData = questorZenConfigSchema.parse(data);

    // Format URL to ensure it doesn't end with a slash for easier usage later
    let domain = validatedData.client_domain.trim();
    if (domain.endsWith('/')) {
      domain = domain.slice(0, -1);
    }

    const existing = await getQuestorZenConfig();
    
    if (existing) {
      await db.query(
        `UPDATE questor_zen_config SET client_domain = $1, access_token = $2, updated_at = NOW() WHERE id = 1`, 
        [domain, validatedData.access_token.trim()]
      );
    } else {
      await db.query(
        `INSERT INTO questor_zen_config (id, client_domain, access_token) VALUES (1, $1, $2)`, 
        [domain, validatedData.access_token.trim()]
      );
    }
    
    revalidatePath('/admin/integrations/questor');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Erro ao salvar configuração do Questor Zen' };
  }
}
