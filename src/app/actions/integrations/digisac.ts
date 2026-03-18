'use server';

import db from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { DigisacConfig, DigisacMessage, DigisacResponse } from '@/types/digisac';

// --- Actions: Config ---

export async function getDigisacConfig() {
  const config = await db.prepare('SELECT * FROM digisac_config WHERE id = 1').get() as any;
  if (config) {
      config.is_active = Boolean(config.is_active);
  }
  return config as DigisacConfig | undefined;
}

export async function saveDigisacConfig(data: DigisacConfig) {
  // Remover barra final da URL se existir
  const baseUrl = data.base_url.replace(/\/$/, '');
  const isActive = data.is_active ? 1 : 0;

  const existing = await getDigisacConfig();

  if (existing) {
    await db.prepare(
      `UPDATE digisac_config 
       SET base_url = ?, api_token = ?, connection_phone = ?, is_active = ?, updated_at = datetime('now')
       WHERE id = 1`
    ).run(baseUrl, data.api_token || null, data.connection_phone || null, isActive);
  } else {
    await db.prepare(
      `INSERT INTO digisac_config (id, base_url, api_token, connection_phone, is_active) 
       VALUES (1, ?, ?, ?, ?)`
    ).run(baseUrl, data.api_token || null, data.connection_phone || null, isActive);
  }
  revalidatePath('/admin/integrations/digisac');
  return { success: true };
}

// --- Actions: API Methods ---

export async function sendDigisacMessage(message: DigisacMessage): Promise<DigisacResponse> {
  const config = await getDigisacConfig();
  if (!config || !config.is_active || !config.api_token) {
    return { success: false, error: 'Integração Digisac inativa ou configuração incompleta' };
  }

  // Endpoint padrão para envio de mensagens
  const endpoint = `${config.base_url}/api/v1/messages`; 
  
  // Montar payload
  const payload: any = {
    text: message.body,
    type: message.fileUrl ? 'image' : 'chat', // Básico, pode precisar de ajuste para arquivos
  };

  if (message.contactId) {
    payload.contactId = message.contactId;
  } else {
    payload.number = message.number;
    payload.serviceId = message.serviceId;
    // Formatar número se necessário (apenas números)
    if (payload.number) {
        payload.number = payload.number.replace(/\D/g, '');
    }
  }

  if (message.fileUrl) {
    payload.url = message.fileUrl;
    payload.caption = message.body; // Se tiver arquivo, o texto vira legenda
    // Se for arquivo genérico, type pode ser 'document' ou 'file'
    // Aqui assumindo imagem ou deixando a API inferir se não mandar type explícito
  }

  if (message.isWhisper) {
      payload.isWhisper = true; // Nota interna
  }

  if (message.origin) {
      payload.origin = message.origin;
  }

  if (message.dontOpenTicket) {
      payload.dontOpenTicket = true;
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.api_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Digisac API Error:', response.status, errorText);
      return { success: false, error: `Erro na API Digisac (${response.status}): ${errorText}` };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error: any) {
    console.error('Erro ao enviar mensagem Digisac:', error);
    return { success: false, error: `Erro de conexão: ${error.message}` };
  }
}
