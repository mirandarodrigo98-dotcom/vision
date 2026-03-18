'use server';

import db from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { DigisacConfig, DigisacMessage, DigisacResponse } from '@/types/digisac';
import fs from 'fs';
import path from 'path';

async function logSystemError(context: string, details: any) {
  try {
    let detailStr = details;
    if (details instanceof Error) {
      detailStr = `${details.message}\n${details.stack}`;
    } else if (typeof details === 'object') {
      try {
        detailStr = JSON.stringify(details, null, 2);
      } catch (e) {
        detailStr = String(details);
      }
    }
    
    // Tentar criar a tabela se não existir (apenas por garantia)
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS system_errors (
        id SERIAL PRIMARY KEY,
        context VARCHAR(255),
        details TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `).run();

    // Inserir o erro
    await db.prepare(`
      INSERT INTO system_errors (context, details) VALUES (?, ?)
    `).run(context, detailStr);

    // Também tentar gravar em arquivo como fallback local
    const logPath = path.join(process.cwd(), 'system_errors.log');
    const timestamp = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const logMessage = `\n[${timestamp}] [${context}] ===========================\n${detailStr}\n========================================================\n`;
    fs.appendFileSync(logPath, logMessage);
  } catch (e) {
    console.error('Falha ao salvar log no banco ou arquivo', e);
  }
}

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
    text: message.body || '', // Garantir que não seja undefined
    type: message.fileUrl ? 'image' : 'chat', 
  };

  // Debug direto no console para verificação na Vercel
  console.log(' Preparing Digisac Payload:', { 
    bodyLength: message.body?.length, 
    hasFile: !!message.fileUrl,
    number: message.number,
    serviceId: message.serviceId
  });

  if (message.contactId) {
    payload.contactId = message.contactId;
  } else {
    if (!message.serviceId) {
        await logSystemError('Digisac API - Erro de Validação', { error: 'serviceId (connection_phone) é obrigatório', payload });
        return { success: false, error: 'Erro de configuração: connection_phone não definido.' };
    }
    
    // Garantir que number é string e remover não-números
    let cleanNumber = String(message.number || '').replace(/\D/g, '');
    
    // Adicionar DDI do Brasil (55) se o número tiver 10 ou 11 dígitos
    if (cleanNumber.length === 10 || cleanNumber.length === 11) {
        cleanNumber = `55${cleanNumber}`;
    }

    payload.number = cleanNumber;
    payload.serviceId = message.serviceId;
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

  // LOG DE DEBUG ANTES DO ENVIO
  await logSystemError('Digisac API - Tentativa de Envio (DEBUG)', { endpoint, payload });

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 120s timeout

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.api_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Digisac API Error:', response.status, errorText);
      await logSystemError('Digisac API - Status Not OK', { status: response.status, responseText: errorText, payloadSent: payload });
      // Se a resposta for HTML (ex: erro 524 do Cloudflare), retornar mensagem genérica
      if (errorText.toLowerCase().includes('<html') || response.status === 524) {
          return { success: false, error: `A API do Digisac não respondeu a tempo (Timeout ${response.status}). Tente novamente mais tarde.` };
      }
      return { success: false, error: `Erro na API Digisac (${response.status}): ${errorText.slice(0, 100)}` };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error: any) {
    console.error('Erro ao enviar mensagem Digisac:', error);
    if (error.name === 'AbortError') {
      await logSystemError('Digisac API - Timeout (AbortError)', { endpoint, payload });
      return { success: false, error: 'A requisição ao Digisac expirou após 120 segundos. O servidor deles pode estar lento.' };
    }
    await logSystemError('Digisac API - Fetch Exception', error);
    return { success: false, error: `Erro de conexão: ${error.message}` };
  }
}
