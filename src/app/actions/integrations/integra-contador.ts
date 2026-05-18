'use server';

import https from 'https';
import axios from 'axios';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import db from '@/lib/db';
import { decryptSecret, encryptSecret, isEncryptedSecret } from '@/lib/secret-crypto';

export type IntegraContadorConfig = {
  id: number;
  base_url: string;
  auth_url: string;
  consumer_key: string;
  consumer_secret: string;
  contractor_document: string;
  author_document: string;
  author_type: number;
  cpf_service_path: string;
  cpf_service_system_id: string;
  cpf_service_id: string;
  cpf_service_version: string;
  cpf_service_dados_template: string;
  certificate_base64: string | null;
  certificate_filename: string | null;
  certificate_password: string | null;
  is_active: boolean;
  updated_at: Date;
};

type IntegraContadorTokens = {
  access_token: string;
  jwt_token: string;
  expires_in?: number;
};

type IntegraContadorCpfResult = {
  nome: string;
  fonte: 'integra-contador';
  raw: unknown;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

const integraContadorConfigSchema = z.object({
  base_url: z.string().url('A URL base da API é obrigatória'),
  auth_url: z.string().url('A URL de autenticação é obrigatória'),
  consumer_key: z.string().min(1, 'O Consumer Key é obrigatório'),
  consumer_secret: z.string().min(1, 'O Consumer Secret é obrigatório'),
  contractor_document: z.string().regex(/^\d{14}$/, 'Informe o CNPJ do contratante com 14 dígitos'),
  author_document: z.string().regex(/^\d{11,14}$/, 'Informe o documento do autor com 11 ou 14 dígitos'),
  author_type: z.coerce.number().refine((value) => value === 1 || value === 2, 'Tipo do autor inválido'),
  cpf_service_path: z.string().default('/Consultar'),
  cpf_service_system_id: z.string().default(''),
  cpf_service_id: z.string().default(''),
  cpf_service_version: z.string().default('1.0'),
  cpf_service_dados_template: z.string().default('{"cpf":"{{cpfSemMascara}}"}'),
  certificate_password: z.string().default(''),
  is_active: z.boolean().default(true),
});

async function ensureIntegraContadorTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS integra_contador_config (
      id INTEGER PRIMARY KEY,
      base_url TEXT NOT NULL,
      auth_url TEXT NOT NULL,
      consumer_key TEXT NOT NULL,
      consumer_secret TEXT NOT NULL,
      contractor_document VARCHAR(14) NOT NULL,
      author_document VARCHAR(14) NOT NULL,
      author_type SMALLINT NOT NULL DEFAULT 2,
      cpf_service_path TEXT NOT NULL DEFAULT '/Consultar',
      cpf_service_system_id TEXT NOT NULL,
      cpf_service_id TEXT NOT NULL,
      cpf_service_version TEXT NOT NULL DEFAULT '1.0',
      cpf_service_dados_template TEXT NOT NULL,
      certificate_base64 TEXT,
      certificate_filename TEXT,
      certificate_password TEXT,
      is_active BOOLEAN NOT NULL DEFAULT true,
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
}

type IntegraContadorConfigRow = IntegraContadorConfig;

async function getIntegraContadorConfigRow(): Promise<IntegraContadorConfigRow | null> {
  await ensureIntegraContadorTable();
  const result = await db.query<IntegraContadorConfigRow>('SELECT * FROM integra_contador_config WHERE id = 1');
  return result.rows[0] || null;
}

function safeDecryptSecret(value: string | null | undefined, fallback: string | null = '') {
  try {
    const decrypted = decryptSecret(value);
    return decrypted ?? fallback;
  } catch (error) {
    console.error('Falha ao descriptografar campo do Integra Contador:', error);
    return fallback;
  }
}

function decryptIntegraContadorConfig(row: IntegraContadorConfigRow): IntegraContadorConfig {
  return {
    ...row,
    consumer_key: safeDecryptSecret(row.consumer_key, ''),
    consumer_secret: safeDecryptSecret(row.consumer_secret, ''),
    certificate_base64: safeDecryptSecret(row.certificate_base64, null),
    certificate_password: safeDecryptSecret(row.certificate_password, null),
  };
}

async function migrateIntegraContadorSensitiveFields(row: IntegraContadorConfigRow | null) {
  if (!row) return row;

  const needsMigration =
    !isEncryptedSecret(row.consumer_key) ||
    !isEncryptedSecret(row.consumer_secret) ||
    (!!row.certificate_base64 && !isEncryptedSecret(row.certificate_base64)) ||
    (!!row.certificate_password && !isEncryptedSecret(row.certificate_password));

  if (!needsMigration) {
    return row;
  }

  await db.query(
    `UPDATE integra_contador_config
     SET consumer_key = $1,
         consumer_secret = $2,
         certificate_base64 = $3,
         certificate_password = $4,
         updated_at = NOW()
     WHERE id = $5`,
    [
      encryptSecret(row.consumer_key),
      encryptSecret(row.consumer_secret),
      encryptSecret(row.certificate_base64),
      encryptSecret(row.certificate_password),
      row.id,
    ]
  );

  return await getIntegraContadorConfigRow();
}

export async function getIntegraContadorConfig(): Promise<IntegraContadorConfig | null> {
  try {
    const row = await getIntegraContadorConfigRow();
    const migratedRow = await migrateIntegraContadorSensitiveFields(row);
    return migratedRow ? decryptIntegraContadorConfig(migratedRow) : null;
  } catch (error) {
    console.error('Erro ao carregar configuração do Integra Contador:', error);

    const fallbackRow = await getIntegraContadorConfigRow();
    if (!fallbackRow) {
      return null;
    }

    return {
      ...fallbackRow,
      consumer_key: '',
      consumer_secret: '',
      certificate_base64: null,
      certificate_password: null,
    };
  }
}

export async function saveIntegraContadorConfig(formData: FormData) {
  try {
    await ensureIntegraContadorTable();

    const existing = await getIntegraContadorConfig();
    const certificateFile = formData.get('certificate_file');
    let certificateBase64 = existing?.certificate_base64 || null;
    let certificateFilename = existing?.certificate_filename || null;

    if (certificateFile instanceof File && certificateFile.size > 0) {
      const arrayBuffer = await certificateFile.arrayBuffer();
      certificateBase64 = Buffer.from(arrayBuffer).toString('base64');
      certificateFilename = certificateFile.name;
    }

    const validatedData = integraContadorConfigSchema.parse({
      base_url: String(formData.get('base_url') || '').trim().replace(/\/$/, ''),
      auth_url: String(formData.get('auth_url') || '').trim(),
      consumer_key: String(formData.get('consumer_key') || '').trim(),
      consumer_secret: String(formData.get('consumer_secret') || '').trim(),
      contractor_document: String(formData.get('contractor_document') || '').replace(/\D/g, ''),
      author_document: String(formData.get('author_document') || '').replace(/\D/g, ''),
      author_type: Number(formData.get('author_type') || 2),
      cpf_service_path: String(formData.get('cpf_service_path') || '').trim() || '/Consultar',
      cpf_service_system_id: String(formData.get('cpf_service_system_id') || '').trim(),
      cpf_service_id: String(formData.get('cpf_service_id') || '').trim(),
      cpf_service_version: String(formData.get('cpf_service_version') || '').trim() || '1.0',
      cpf_service_dados_template:
        String(formData.get('cpf_service_dados_template') || '').trim() || '{"cpf":"{{cpfSemMascara}}"}',
      certificate_password: String(formData.get('certificate_password') || '').trim(),
      is_active: String(formData.get('is_active') || '') === 'true',
    });
    const hasCpfServiceSystemId = Boolean(validatedData.cpf_service_system_id.trim());
    const hasCpfServiceId = Boolean(validatedData.cpf_service_id.trim());
    const isCpfServicePartiallyFilled = hasCpfServiceSystemId !== hasCpfServiceId;

    if (isCpfServicePartiallyFilled) {
      return {
        error: 'Preencha juntos o ID do sistema e o ID do servico de CPF, ou deixe ambos em branco para configurar depois.',
      };
    }

    if (certificateFile instanceof File && certificateFile.size > 0 && !validatedData.certificate_password) {
      return { error: 'Informe a senha do certificado para salvar o arquivo enviado.' };
    }

    const values = [
      validatedData.base_url,
      validatedData.auth_url,
      encryptSecret(validatedData.consumer_key),
      encryptSecret(validatedData.consumer_secret),
      validatedData.contractor_document,
      validatedData.author_document,
      validatedData.author_type,
      normalizedPath(validatedData.cpf_service_path),
      validatedData.cpf_service_system_id,
      validatedData.cpf_service_id,
      validatedData.cpf_service_version,
      validatedData.cpf_service_dados_template,
      encryptSecret(certificateBase64),
      certificateFilename,
      encryptSecret(validatedData.certificate_password),
      validatedData.is_active,
    ];

    if (existing) {
      await db.query(
        `UPDATE integra_contador_config
         SET base_url = $1,
             auth_url = $2,
             consumer_key = $3,
             consumer_secret = $4,
             contractor_document = $5,
             author_document = $6,
             author_type = $7,
             cpf_service_path = $8,
             cpf_service_system_id = $9,
             cpf_service_id = $10,
             cpf_service_version = $11,
             cpf_service_dados_template = $12,
             certificate_base64 = $13,
             certificate_filename = $14,
             certificate_password = $15,
             is_active = $16,
             updated_at = NOW()
         WHERE id = 1`,
        values
      );
    } else {
      await db.query(
        `INSERT INTO integra_contador_config (
          id, base_url, auth_url, consumer_key, consumer_secret, contractor_document, author_document, author_type,
          cpf_service_path, cpf_service_system_id, cpf_service_id, cpf_service_version, cpf_service_dados_template,
          certificate_base64, certificate_filename, certificate_password, is_active
        ) VALUES (
          1, $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12,
          $13, $14, $15, $16
        )`,
        values
      );
    }

    revalidatePath('/admin/integrations');
    revalidatePath('/admin/integrations/integra-contador');
    return { success: true };
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0]?.message || 'Dados invalidos para salvar o Integra Contador.' };
    }
    return { error: getErrorMessage(error) || 'Erro ao salvar a configuração do Integra Contador' };
  }
}

function normalizedPath(value: string) {
  if (!value) return '/Consultar';
  return value.startsWith('/') ? value : `/${value}`;
}

function hasCpfServiceConfig(config: IntegraContadorConfig) {
  return Boolean(
    config.cpf_service_system_id?.trim() &&
      config.cpf_service_id?.trim() &&
      config.cpf_service_version?.trim() &&
      config.cpf_service_dados_template?.trim()
  );
}

function buildIntegraContadorHttpsAgent(config: IntegraContadorConfig) {
  return new https.Agent({
    pfx: Buffer.from(config.certificate_base64 || '', 'base64'),
    passphrase: config.certificate_password || undefined,
    rejectUnauthorized: true,
  });
}

async function authenticateIntegraContador(config: IntegraContadorConfig): Promise<IntegraContadorTokens> {
  if (!config.certificate_base64 || !config.certificate_password) {
    throw new Error('O certificado digital do Integra Contador não está configurado.');
  }

  const basicAuth = Buffer.from(`${config.consumer_key}:${config.consumer_secret}`).toString('base64');
  const agent = buildIntegraContadorHttpsAgent(config);

  const response = await axios.post<IntegraContadorTokens>(
    config.auth_url,
    'grant_type=client_credentials',
    {
      httpsAgent: agent,
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Role-Type': 'TERCEIROS',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: 30000,
    }
  );

  if (!response.data?.access_token || !response.data?.jwt_token) {
    throw new Error('A autenticação do Integra Contador não retornou os tokens esperados.');
  }

  return response.data;
}

function buildCpfDados(template: string, cpf: string) {
  const cpfSemMascara = cpf.replace(/\D/g, '');
  return template
    .replace(/\{\{\s*cpf\s*\}\}/g, cpf)
    .replace(/\{\{\s*cpfSemMascara\s*\}\}/g, cpfSemMascara);
}

function tryParseJson(value: unknown): unknown {
  if (typeof value !== 'string') return value;

  const trimmed = value.trim();
  if (!trimmed) return value;
  if (!(trimmed.startsWith('{') || trimmed.startsWith('['))) return value;

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function findFirstStringByKeys(payload: unknown, keys: string[]): string | null {
  const normalizedKeys = new Set(keys.map((key) => key.toLowerCase()));
  const visited = new Set<unknown>();

  function walk(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string') return null;
    if (typeof value !== 'object') return null;
    if (visited.has(value)) return null;
    visited.add(value);

    if (Array.isArray(value)) {
      for (const item of value) {
        const found = walk(item);
        if (found) return found;
      }
      return null;
    }

    for (const [key, item] of Object.entries(value)) {
      if (normalizedKeys.has(key.toLowerCase()) && typeof item === 'string' && item.trim()) {
        return item.trim();
      }
    }

    for (const item of Object.values(value)) {
      const found = walk(item);
      if (found) return found;
    }

    return null;
  }

  return walk(payload);
}

export async function consultCpfViaIntegraContador(cpf: string): Promise<IntegraContadorCpfResult | null> {
  const cleanCpf = cpf.replace(/\D/g, '');
  if (cleanCpf.length !== 11) {
    throw new Error('CPF inválido para consulta no Integra Contador.');
  }

  const config = await getIntegraContadorConfig();
  if (!config || !config.is_active || !hasCpfServiceConfig(config)) {
    return null;
  }

  const tokens = await authenticateIntegraContador(config);
  const body = {
    contratante: {
      numero: config.contractor_document,
      tipo: 2,
    },
    autorPedidoDados: {
      numero: config.author_document,
      tipo: config.author_type,
    },
    contribuinte: {
      numero: cleanCpf,
      tipo: 1,
    },
    pedidoDados: {
      idSistema: config.cpf_service_system_id,
      idServico: config.cpf_service_id,
      versaoSistema: config.cpf_service_version,
      dados: buildCpfDados(config.cpf_service_dados_template, cleanCpf),
    },
  };

  const response = await axios.post(
    `${config.base_url}${normalizedPath(config.cpf_service_path)}`,
    body,
    {
      httpsAgent: buildIntegraContadorHttpsAgent(config),
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json',
        jwt_token: tokens.jwt_token,
      },
      timeout: 30000,
    }
  );

  const parsedDados = tryParseJson(response.data?.dados);
  const parsedBody = tryParseJson(parsedDados);
  const nome =
    findFirstStringByKeys(parsedBody, ['nome', 'nomeContribuinte', 'nomePessoa', 'nomeTitular', 'name']) ||
    findFirstStringByKeys(response.data, ['nome', 'nomeContribuinte', 'nomePessoa', 'nomeTitular', 'name']);

  if (!nome) {
    throw new Error('A resposta do Integra Contador não retornou um nome utilizável para o CPF informado.');
  }

  return {
    nome,
    fonte: 'integra-contador',
    raw: {
      response: response.data,
      parsedDados: parsedBody,
    },
  };
}
