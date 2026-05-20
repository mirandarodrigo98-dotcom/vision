import { z } from 'zod';

export const postgreeConfigSchema = z.object({
  host: z.string().min(1, 'O host ou IP do servidor é obrigatório'),
  port: z.coerce.number().int().min(1).max(65535),
  database_name: z.string().min(1, 'O nome do banco é obrigatório'),
  username: z.string().min(1, 'O usuário é obrigatório'),
  password: z.string().min(1, 'A senha é obrigatória'),
  schema_name: z.string().default('public'),
  ssl_enabled: z.boolean().default(false),
  is_active: z.boolean().default(true),
});

export type PostgreeConfig = {
  id: number;
  host: string;
  port: number;
  database_name: string;
  username: string;
  password: string;
  schema_name: string;
  ssl_enabled: boolean;
  is_active: boolean;
  updated_at: Date;
};
