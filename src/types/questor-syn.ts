import { z } from 'zod';

// --- Schemas ---

export const questorSynConfigSchema = z.object({
  base_url: z.string().url('URL inválida'),
  api_token: z.string().optional(),
});

export const questorSynRoutineSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Nome é obrigatório'),
  action_name: z.string().min(1, 'Nome interno da rotina (_AActionName) é obrigatório'),
  type: z.enum(['PROCESS', 'QUERY', 'REPORT', 'IMPORT', 'EXPORT']),
  description: z.string().optional(),
  parameters_schema: z.string().optional(), // JSON string
  layout_content: z.string().optional(), // NLI file content (Base64 or text)
  system_code: z.string().optional(), // Internal system identifier (e.g. TRANSACTION_SYNC)
  is_active: z.boolean().default(true),
});

export const questorSynModuleTokenSchema = z.object({
  id: z.string().optional(),
  module_key: z.string().min(1, 'Chave do módulo é obrigatória'),
  module_name: z.string().min(1, 'Nome do módulo é obrigatório'),
  token: z.string().min(1, 'Token é obrigatório'),
});

// --- Types ---

export type QuestorSynConfig = z.infer<typeof questorSynConfigSchema>;
export type QuestorSynRoutine = z.infer<typeof questorSynRoutineSchema>;
export type QuestorSynModuleToken = z.infer<typeof questorSynModuleTokenSchema>;
