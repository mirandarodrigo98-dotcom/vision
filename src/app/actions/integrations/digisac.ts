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
    type: (message.fileUrl || message.base64File) ? 'file' : 'chat', 
  };
  
  if (message.body !== null && message.body !== undefined && message.body !== '') {
    payload.text = message.body;
  } else if (payload.type === 'chat') {
    // Para tipo chat o texto é obrigatório, se não tem manda um espaço ou cancela.
    // Mas para evitar erro 500 de validação, não podemos mandar type chat sem text válido.
    payload.text = ' '; 
  }

  // Debug direto no console para verificação na Vercel
  console.log(' Preparing Digisac Payload:', { 
    bodyLength: message.body?.length, 
    hasFile: !!message.fileUrl || !!message.base64File,
    number: message.number,
    serviceId: message.serviceId
  });

  let finalServiceId = message.serviceId;
  
  if (!message.contactId) {
    if (!message.serviceId) {
        await logSystemError('Digisac API - Erro de Validação', { error: 'serviceId (connection_phone) é obrigatório', payload });
        return { success: false, error: 'Erro de configuração: connection_phone não definido.' };
    }
    
    // Tentar resolver serviceId se não for um UUID (assumindo que seja um número de telefone)
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (!UUID_REGEX.test(finalServiceId)) {
         try {
             console.log(`Tentando resolver Service ID para o telefone: ${finalServiceId}`);
             console.log(`Tentando resolver Service ID para o telefone: ${finalServiceId}`);
             await logSystemError('Digisac API - Resolução de Service ID', { message: `Iniciando busca de ID para o telefone: ${finalServiceId}`, url: `${config.base_url}/api/v1/services` });

             const controller = new AbortController();
             const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout para busca de serviços
             
             const servicesResponse = await fetch(`${config.base_url}/api/v1/services`, {
                 headers: {
                     'Authorization': `Bearer ${config.api_token}`,
                     'Content-Type': 'application/json',
                 },
                 signal: controller.signal
             });
             
             clearTimeout(timeoutId);
             
             if (servicesResponse.ok) {
                 const servicesData = await servicesResponse.json();
                 // A API pode retornar diretamente o array, um objeto com a propriedade data ou response.data
                 const services = Array.isArray(servicesData) ? servicesData : (servicesData?.data || servicesData?.response?.data || []);

                 if (Array.isArray(services) && services.length > 0) {
                     const phoneToMatch = finalServiceId.replace(/\D/g, '');
                     const matchedService = services.find((s: any) => {
                         const myNumber = String(s.data?.status?.myNumber || '');
                         const myId = String(s.data?.myId || '');
                         return myNumber.includes(phoneToMatch) || myId.startsWith(phoneToMatch);
                     });
                     
                     if (matchedService) {
                         console.log(`Service ID resolvido: ${matchedService.id} (Salvo no banco para futuro)`);
                         await logSystemError('Digisac API - Service ID Resolvido', { original: finalServiceId, resolved: matchedService.id });
                         finalServiceId = matchedService.id;
                         
                         // Atualizar o banco para evitar buscas futuras
                         await saveDigisacConfig({
                             ...config,
                             connection_phone: matchedService.id
                         });
                     } else {
                         console.warn(`Nenhum serviço encontrado para o telefone ${phoneToMatch}.`);
                         await logSystemError('Digisac API - Service ID Não Encontrado', { 
                            phoneBuscado: phoneToMatch, 
                            servicosDisponiveis: services.map((s: any) => ({ 
                                id: s.id, 
                                name: s.name, 
                                number: s.data?.status?.myNumber 
                            })) 
                         });
                         return { success: false, error: `Não foi possível encontrar um canal Digisac conectado com o número ${finalServiceId}. Verifique a conexão no painel do Digisac.` };
                     }
                 } else {
                    await logSystemError('Digisac API - Resposta de Serviços Inválida', { response: services });
                    return { success: false, error: 'A API do Digisac retornou uma lista de serviços inválida.' };
                 }
             } else {
                 const errorText = await servicesResponse.text();
                 await logSystemError('Digisac API - Falha ao Buscar Serviços', { status: servicesResponse.status, error: errorText });
                 return { success: false, error: `Falha ao validar conexão com Digisac (Status ${servicesResponse.status}).` };
             }
         } catch (e: any) {
               console.error('Erro ao resolver service ID:', e);
               await logSystemError('Digisac API - Erro na Resolução de ID', e);
               return { success: false, error: `Erro ao tentar resolver o ID do serviço Digisac: ${e.message}` };
           }
       }
  }

  // Garantir que number é string e remover não-números
  let cleanNumber = String(message.number || '').replace(/\D/g, '');
  
  // Adicionar DDI do Brasil (55) se o número tiver 10 ou 11 dígitos
  if (cleanNumber.length === 10 || cleanNumber.length === 11) {
      cleanNumber = `55${cleanNumber}`;
  }

  if (message.contactId) {
    payload.contactId = message.contactId;
    if (finalServiceId) payload.serviceId = finalServiceId;
  } else {
    payload.number = cleanNumber;
    payload.serviceId = finalServiceId;
  }

  if (message.base64File) {
    const base64Data = message.base64File.includes('base64,') 
        ? message.base64File.split('base64,')[1] 
        : message.base64File;

    const nameToUse = message.fileName || "boleto.pdf";
    const extension = nameToUse.split('.').pop() || "pdf";
    let mime = "application/pdf";
    if (extension === "png") mime = "image/png";
    else if (extension === "jpg" || extension === "jpeg") mime = "image/jpeg";

    // A documentação oculta do Digisac exige que o arquivo seja passado como um objeto embutido 
    // direto no payload da mensagem, ao invés de usar a rota /api/v1/files para base64.
    payload.file = {
        base64: base64Data,
        mimetype: mime,
        name: nameToUse
    };
    payload.type = 'file'; // O Digisac converte internamente para 'document'
  } else if (message.fileUrl) {
    payload.file = message.fileUrl;
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

    console.log('Sending to Digisac payload:', JSON.stringify(payload).substring(0, 500));
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
