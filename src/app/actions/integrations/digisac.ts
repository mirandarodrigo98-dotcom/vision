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
    await db.query(`
      CREATE TABLE IF NOT EXISTS system_errors (
        id SERIAL PRIMARY KEY,
        context VARCHAR(255),
        details TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `, []);

    // Inserir o erro
    await db.query(`
      INSERT INTO system_errors (context, details) VALUES ($1, $2)
    `, [context, detailStr]);

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
  const config = (await db.query('SELECT * FROM digisac_config WHERE id = 1', [])).rows[0] as any;
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
    await db.query(`UPDATE digisac_config 
       SET base_url = $1, api_token = $2, connection_phone = $3, is_active = $4, updated_at = NOW()
       WHERE id = 1`, [baseUrl, data.api_token || null, data.connection_phone || null, isActive]);
  } else {
    await db.query(`INSERT INTO digisac_config (id, base_url, api_token, connection_phone, is_active) 
       VALUES (1, $1, $2, $3, $4)`, [baseUrl, data.api_token || null, data.connection_phone || null, isActive]);
  }
  revalidatePath('/admin/integrations/digisac');
  return { success: true };
}

// --- Actions: API Methods ---

export async function uploadFileDigisac(base64Data: string, name: string, mimetype: string, extension: string): Promise<{ success: boolean; id?: string; error?: string }> {
  const config = await getDigisacConfig();
  if (!config || !config.is_active || !config.api_token) {
    return { success: false, error: 'Integração Digisac inativa ou configuração incompleta' };
  }

  const endpoint = `${config.base_url}/api/v1/files`;
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.api_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        base64: base64Data,
        mimetype,
        name,
        extension
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      await logSystemError('Digisac API Upload - Status Not OK', { status: response.status, responseText: errorText });
      return { success: false, error: `Falha no upload do arquivo (${response.status}): ${errorText.slice(0, 100)}` };
    }

    const data = await response.json();
    return { success: true, id: data.id };
  } catch (error: any) {
    await logSystemError('Digisac API Upload - Fetch Exception', error);
    return { success: false, error: `Erro de conexão no upload: ${error.message}` };
  }
}

export async function sendDigisacMessage(message: DigisacMessage): Promise<DigisacResponse> {
  const config = await getDigisacConfig();
  if (!config || !config.is_active || !config.api_token || !config.connection_phone) {
    return { success: false, error: 'Integração Digisac inativa ou configuração incompleta' };
  }

  const endpoint = `${config.base_url}/api/v1/messages`;
  
  // Tentar resolver serviceId se não for um UUID
  let finalServiceId = message.serviceId || config.connection_phone;
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  if (!UUID_REGEX.test(finalServiceId)) {
      try {
          const resolveRes = await fetch(`${config.base_url}/api/v1/services`, {
              headers: { 'Authorization': `Bearer ${config.api_token}` }
          });
          if (resolveRes.ok) {
              const data = await resolveRes.json();
              const service = data.data?.find((s: any) => s.number === finalServiceId || s.name === finalServiceId);
              if (service) {
                  finalServiceId = service.id;
              }
          }
      } catch (e: any) {
          console.error('Erro ao resolver service ID:', e);
      }
  }

  // Garantir que number é string e remover não-números
  let cleanNumber = String(message.number || '').replace(/\D/g, '');
  
  // Adicionar DDI do Brasil (55) se o número tiver 10 ou 11 dígitos
  if (cleanNumber.length === 10 || cleanNumber.length === 11) {
      cleanNumber = `55${cleanNumber}`;
  }

  const payload: any = {
      type: message.body ? 'chat' : 'file',
  };

  if (message.contactId) {
    payload.contactId = message.contactId;
    if (finalServiceId) payload.serviceId = finalServiceId;
  } else {
    payload.number = cleanNumber;
    payload.serviceId = finalServiceId;
  }

  if (message.contactName) {
      payload.contactName = message.contactName;
  }

  if (message.base64File) {
    let base64Data = message.base64File;
    if (message.base64File.includes('base64,')) {
      base64Data = message.base64File.split('base64,')[1];
    }
    
    // Limpar o base64 de qualquer quebra de linha ou espaço em branco que possa corromper o arquivo
    base64Data = base64Data.replace(/[\r\n\s]+/g, '');

    const nameToUse = message.fileName || "documento.pdf";
    const extension = nameToUse.split('.').pop()?.toLowerCase() || "pdf";
    let mime = "application/pdf";
    if (extension === "png") mime = "image/png";
    else if (extension === "jpg" || extension === "jpeg") mime = "image/jpeg";

    // Fazer upload do arquivo primeiro para evitar erro de limite de payload 500 no Digisac
    const uploadRes = await uploadFileDigisac(base64Data, nameToUse, mime, extension);
    if (!uploadRes.success || !uploadRes.id) {
        return { success: false, error: uploadRes.error || 'Falha ao processar arquivo para envio' };
    }

    payload.fileId = uploadRes.id;
    payload.type = 'file'; 
    
    // Se o tipo é 'file', precisamos ter certeza que o campo 'text' existe como null se não houver texto
    if (payload.text === ' ' || payload.text === undefined) {
      payload.text = null;
    }
  } else if (message.fileUrl) {
    payload.file = message.fileUrl;
  }

  if (message.body !== null && message.body !== undefined && message.body !== '') {
    payload.text = message.body;
  } else if (payload.type === 'chat') {
    payload.text = ' '; 
  }

  // Para arquivo e com texto
  if (payload.type === 'file' && payload.text && payload.text !== ' ' && payload.text !== null) {
      payload.text = String(payload.text);
  }

  if (message.isWhisper) {
    payload.isWhisper = true;
  }

  if ((message as any).origin) {
      payload.origin = (message as any).origin;
  }

  if ((message as any).dontOpenTicket) {
      payload.dontOpenTicket = true;
  }

  try {
    let response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.api_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    // Fallback inteligente para o 9º dígito em números brasileiros (Erro 500 Validation Error)
    if (!response.ok && response.status === 500 && payload.number && payload.number.startsWith('55')) {
        const num = payload.number;
        let tryAlternative = false;
        
        if (num.length === 13 && num[4] === '9') {
            // Tem o 9º dígito, vamos tentar sem ele
            payload.number = num.substring(0, 4) + num.substring(5);
            tryAlternative = true;
        } else if (num.length === 12) {
            // Não tem o 9º dígito, vamos tentar com ele
            payload.number = num.substring(0, 4) + '9' + num.substring(4);
            tryAlternative = true;
        }

        if (tryAlternative) {
            console.log(`Tentando fallback de numero: de ${num} para ${payload.number}`);
            response = await fetch(endpoint, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${config.api_token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(payload)
            });
        }
    }

    if (!response.ok) {
      const errorText = await response.text();
      await logSystemError('Digisac API - Status Not OK', { status: response.status, responseText: errorText, payload });
      return { success: false, error: `Erro na API Digisac (${response.status}): ${errorText.slice(0, 100)}` };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error: any) {
    await logSystemError('Digisac API - Fetch Exception', error);
    return { success: false, error: `Erro de conexão com Digisac: ${error.message}` };
  }
}
