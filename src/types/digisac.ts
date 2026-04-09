import { z } from 'zod';

// --- Schemas ---

export const digisacConfigSchema = z.object({
  base_url: z.string().url('URL inválida').default('https://api.digisac.com.br'),
  api_token: z.string().min(1, 'Token é obrigatório').optional(),
  connection_phone: z.string().optional().describe('Número do telefone da conexão'),
  is_active: z.boolean().default(false),
});

// Baseado na documentação de endpoints comuns da Digisac (ex: /api/v1/messages)
export const digisacMessageSchema = z.object({
  contactId: z.string().optional().describe('ID do contato no Digisac (preferencial)'),
  number: z.string().optional().describe('Número do telefone (se contactId não for fornecido)'),
  serviceId: z.string().optional().describe('ID do serviço/conexão (obrigatório se usar number)'),
  body: z.string().min(1, 'Conteúdo da mensagem é obrigatório'),
  fileUrl: z.string().url().optional().describe('URL do arquivo para envio de mídia'),
  base64File: z.string().optional().describe('Arquivo em formato base64 (data:application/pdf;base64,...)'),
  fileName: z.string().optional().describe('Nome do arquivo original'),
  isWhisper: z.boolean().optional().default(false).describe('Se true, envia como nota interna (whisper)'),
  origin: z.string().optional().describe('Origem da mensagem (ex: bot)'),
  dontOpenTicket: z.boolean().optional().describe('Se true, não abre chamado'),
}).refine(data => data.contactId || (data.number && data.serviceId), {
  message: "É necessário fornecer 'contactId' OU ('number' E 'serviceId')",
  path: ['contactId'], 
});

// --- Types ---

export type DigisacConfig = z.infer<typeof digisacConfigSchema>;
export type DigisacMessage = z.infer<typeof digisacMessageSchema>;

export interface DigisacResponse {
  success: boolean;
  data?: any;
  error?: string;
}
