'use server';

import axios from 'axios';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import db from '@/lib/db';
import { decryptSecret, encryptSecret, isEncryptedSecret } from '@/lib/secret-crypto';

export type ConsultaCpfConfig = {
  id: number;
  base_url: string;
  auth_url: string;
  consumer_key: string;
  consumer_secret: string;
  is_active: boolean;
  updated_at: Date;
};

type ConsultaCpfConfigRow = ConsultaCpfConfig;

type ConsultaCpfTokenResponse = {
  access_token: string;
  token_type?: string;
  expires_in?: number;
};

type ConsultaCpfResult = {
  nome: string;
  fonte: 'consulta-cpf-serpro';
  raw: unknown;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

const DEFAULT_CONSULTA_CPF_BASE_URL = 'https://gateway.apiserpro.serpro.gov.br/consulta-cpf-df/v2';

const consultaCpfConfigSchema = z.object({
  base_url: z.string().url('A URL base da API Consulta CPF é obrigatória'),
  auth_url: z.string().url('A URL de autenticação é obrigatória'),
  consumer_key: z.string().min(1, 'O Consumer Key é obrigatório'),
  consumer_secret: z.string().min(1, 'O Consumer Secret é obrigatório'),
  is_active: z.boolean().default(true),
});

async function ensureConsultaCpfTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS consulta_cpf_config (
      id INTEGER PRIMARY KEY,
      base_url TEXT NOT NULL,
      auth_url TEXT NOT NULL,
      consumer_key TEXT NOT NULL,
      consumer_secret TEXT NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT true,
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
}

async function getConsultaCpfConfigRow(): Promise<ConsultaCpfConfigRow | null> {
  await ensureConsultaCpfTable();
  const result = await db.query<ConsultaCpfConfigRow>('SELECT * FROM consulta_cpf_config WHERE id = 1');
  return result.rows[0] || null;
}

function normalizeConsultaCpfBaseUrl(value: string) {
  const trimmed = value.trim().replace(/\/+$/, '');
  if (!trimmed) {
    return DEFAULT_CONSULTA_CPF_BASE_URL;
  }

  return trimmed;
}

function appendCandidate(candidates: string[], value: string) {
  const normalized = normalizedPath(value);
  if (normalized && !candidates.includes(normalized)) {
    candidates.push(normalized);
  }
}

function buildConsultaCpfBaseUrlCandidates(baseUrl: string) {
  const normalizedBaseUrl = normalizeConsultaCpfBaseUrl(baseUrl);
  const candidates: string[] = [];

  appendCandidate(candidates, normalizedBaseUrl);
  appendCandidate(candidates, DEFAULT_CONSULTA_CPF_BASE_URL);
  appendCandidate(candidates, 'https://gateway.apiserpro.serpro.gov.br/consulta-cpf/v2');
  appendCandidate(candidates, 'https://gateway.apiserpro.serpro.gov.br/consulta-cpf-df/v1');
  appendCandidate(candidates, 'https://gateway.apiserpro.serpro.gov.br/consulta-cpf/v1');
  appendCandidate(candidates, 'https://gateway.apiserpro.serpro.gov.br/consulta-cpf-df-trial/api/v2');
  appendCandidate(candidates, 'https://gateway.apiserpro.serpro.gov.br/consulta-cpf-df-trial/v2');
  appendCandidate(candidates, 'https://gateway.apiserpro.serpro.gov.br/consulta-cpf-df-trial/api/v1');
  appendCandidate(candidates, 'https://gateway.apiserpro.serpro.gov.br/consulta-cpf-df-trial/v1');

  if (/\/consulta-cpf-df\/v2$/i.test(normalizedBaseUrl)) {
    appendCandidate(candidates, normalizedBaseUrl.replace(/\/consulta-cpf-df\/v2$/i, '/consulta-cpf/v2'));
    appendCandidate(candidates, normalizedBaseUrl.replace(/\/consulta-cpf-df\/v2$/i, '/consulta-cpf-df/v1'));
    appendCandidate(candidates, normalizedBaseUrl.replace(/\/consulta-cpf-df\/v2$/i, '/consulta-cpf/v1'));
    appendCandidate(candidates, normalizedBaseUrl.replace(/\/consulta-cpf-df\/v2$/i, '/consulta-cpf-df-trial/api/v2'));
    appendCandidate(candidates, normalizedBaseUrl.replace(/\/consulta-cpf-df\/v2$/i, '/consulta-cpf-df-trial/v2'));
    appendCandidate(candidates, normalizedBaseUrl.replace(/\/consulta-cpf-df\/v2$/i, '/consulta-cpf-df-trial/api/v1'));
    appendCandidate(candidates, normalizedBaseUrl.replace(/\/consulta-cpf-df\/v2$/i, '/consulta-cpf-df-trial/v1'));
  }

  if (/\/consulta-cpf\/v2$/i.test(normalizedBaseUrl)) {
    appendCandidate(candidates, normalizedBaseUrl.replace(/\/consulta-cpf\/v2$/i, '/consulta-cpf-df/v2'));
    appendCandidate(candidates, normalizedBaseUrl.replace(/\/consulta-cpf\/v2$/i, '/consulta-cpf-df/v1'));
    appendCandidate(candidates, normalizedBaseUrl.replace(/\/consulta-cpf\/v2$/i, '/consulta-cpf/v1'));
    appendCandidate(candidates, normalizedBaseUrl.replace(/\/consulta-cpf\/v2$/i, '/consulta-cpf-df-trial/api/v2'));
    appendCandidate(candidates, normalizedBaseUrl.replace(/\/consulta-cpf\/v2$/i, '/consulta-cpf-df-trial/v2'));
    appendCandidate(candidates, normalizedBaseUrl.replace(/\/consulta-cpf\/v2$/i, '/consulta-cpf-df-trial/api/v1'));
    appendCandidate(candidates, normalizedBaseUrl.replace(/\/consulta-cpf\/v2$/i, '/consulta-cpf-df-trial/v1'));
  }

  if (/\/consulta-cpf\/v1$/i.test(normalizedBaseUrl)) {
    appendCandidate(candidates, normalizedBaseUrl.replace(/\/consulta-cpf\/v1$/i, '/consulta-cpf-df/v2'));
    appendCandidate(candidates, normalizedBaseUrl.replace(/\/consulta-cpf\/v1$/i, '/consulta-cpf/v2'));
    appendCandidate(candidates, normalizedBaseUrl.replace(/\/consulta-cpf\/v1$/i, '/consulta-cpf-df/v1'));
    appendCandidate(candidates, normalizedBaseUrl.replace(/\/consulta-cpf\/v1$/i, '/consulta-cpf-df-trial/api/v2'));
    appendCandidate(candidates, normalizedBaseUrl.replace(/\/consulta-cpf\/v1$/i, '/consulta-cpf-df-trial/v2'));
    appendCandidate(candidates, normalizedBaseUrl.replace(/\/consulta-cpf\/v1$/i, '/consulta-cpf-df-trial/api/v1'));
    appendCandidate(candidates, normalizedBaseUrl.replace(/\/consulta-cpf\/v1$/i, '/consulta-cpf-df-trial/v1'));
  }

  if (/\/consulta-cpf-df\/v1$/i.test(normalizedBaseUrl)) {
    appendCandidate(candidates, normalizedBaseUrl.replace(/\/consulta-cpf-df\/v1$/i, '/consulta-cpf-df/v2'));
    appendCandidate(candidates, normalizedBaseUrl.replace(/\/consulta-cpf-df\/v1$/i, '/consulta-cpf/v2'));
    appendCandidate(candidates, normalizedBaseUrl.replace(/\/consulta-cpf-df\/v1$/i, '/consulta-cpf/v1'));
    appendCandidate(candidates, normalizedBaseUrl.replace(/\/consulta-cpf-df\/v1$/i, '/consulta-cpf-df-trial/api/v2'));
    appendCandidate(candidates, normalizedBaseUrl.replace(/\/consulta-cpf-df\/v1$/i, '/consulta-cpf-df-trial/v2'));
    appendCandidate(candidates, normalizedBaseUrl.replace(/\/consulta-cpf-df\/v1$/i, '/consulta-cpf-df-trial/api/v1'));
    appendCandidate(candidates, normalizedBaseUrl.replace(/\/consulta-cpf-df\/v1$/i, '/consulta-cpf-df-trial/v1'));
  }

  if (/\/consulta-cpf-df-trial\/api\/v2$/i.test(normalizedBaseUrl)) {
    appendCandidate(candidates, normalizedBaseUrl.replace(/\/consulta-cpf-df-trial\/api\/v2$/i, '/consulta-cpf-df/v2'));
    appendCandidate(candidates, normalizedBaseUrl.replace(/\/consulta-cpf-df-trial\/api\/v2$/i, '/consulta-cpf/v2'));
    appendCandidate(candidates, normalizedBaseUrl.replace(/\/consulta-cpf-df-trial\/api\/v2$/i, '/consulta-cpf-df/v1'));
    appendCandidate(candidates, normalizedBaseUrl.replace(/\/consulta-cpf-df-trial\/api\/v2$/i, '/consulta-cpf/v1'));
    appendCandidate(candidates, normalizedBaseUrl.replace(/\/consulta-cpf-df-trial\/api\/v2$/i, '/consulta-cpf-df-trial/v2'));
    appendCandidate(candidates, normalizedBaseUrl.replace(/\/consulta-cpf-df-trial\/api\/v2$/i, '/consulta-cpf-df-trial/api/v1'));
    appendCandidate(candidates, normalizedBaseUrl.replace(/\/consulta-cpf-df-trial\/api\/v2$/i, '/consulta-cpf-df-trial/v1'));
  }

  if (/\/consulta-cpf-df-trial\/v2$/i.test(normalizedBaseUrl)) {
    appendCandidate(candidates, normalizedBaseUrl.replace(/\/consulta-cpf-df-trial\/v2$/i, '/consulta-cpf-df/v2'));
    appendCandidate(candidates, normalizedBaseUrl.replace(/\/consulta-cpf-df-trial\/v2$/i, '/consulta-cpf/v2'));
    appendCandidate(candidates, normalizedBaseUrl.replace(/\/consulta-cpf-df-trial\/v2$/i, '/consulta-cpf-df/v1'));
    appendCandidate(candidates, normalizedBaseUrl.replace(/\/consulta-cpf-df-trial\/v2$/i, '/consulta-cpf/v1'));
    appendCandidate(candidates, normalizedBaseUrl.replace(/\/consulta-cpf-df-trial\/v2$/i, '/consulta-cpf-df-trial/api/v2'));
    appendCandidate(candidates, normalizedBaseUrl.replace(/\/consulta-cpf-df-trial\/v2$/i, '/consulta-cpf-df-trial/api/v1'));
    appendCandidate(candidates, normalizedBaseUrl.replace(/\/consulta-cpf-df-trial\/v2$/i, '/consulta-cpf-df-trial/v1'));
  }

  if (/\/consulta-cpf-df-trial\/api\/v1$/i.test(normalizedBaseUrl)) {
    appendCandidate(candidates, normalizedBaseUrl.replace(/\/consulta-cpf-df-trial\/api\/v1$/i, '/consulta-cpf-df/v2'));
    appendCandidate(candidates, normalizedBaseUrl.replace(/\/consulta-cpf-df-trial\/api\/v1$/i, '/consulta-cpf/v2'));
    appendCandidate(candidates, normalizedBaseUrl.replace(/\/consulta-cpf-df-trial\/api\/v1$/i, '/consulta-cpf/v1'));
    appendCandidate(candidates, normalizedBaseUrl.replace(/\/consulta-cpf-df-trial\/api\/v1$/i, '/consulta-cpf-df/v1'));
    appendCandidate(candidates, normalizedBaseUrl.replace(/\/consulta-cpf-df-trial\/api\/v1$/i, '/consulta-cpf-df-trial/api/v2'));
    appendCandidate(candidates, normalizedBaseUrl.replace(/\/consulta-cpf-df-trial\/api\/v1$/i, '/consulta-cpf-df-trial/v2'));
    appendCandidate(candidates, normalizedBaseUrl.replace(/\/consulta-cpf-df-trial\/api\/v1$/i, '/consulta-cpf-df-trial/v1'));
  }

  if (/\/consulta-cpf-df-trial\/v1$/i.test(normalizedBaseUrl)) {
    appendCandidate(candidates, normalizedBaseUrl.replace(/\/consulta-cpf-df-trial\/v1$/i, '/consulta-cpf-df/v2'));
    appendCandidate(candidates, normalizedBaseUrl.replace(/\/consulta-cpf-df-trial\/v1$/i, '/consulta-cpf/v2'));
    appendCandidate(candidates, normalizedBaseUrl.replace(/\/consulta-cpf-df-trial\/v1$/i, '/consulta-cpf/v1'));
    appendCandidate(candidates, normalizedBaseUrl.replace(/\/consulta-cpf-df-trial\/v1$/i, '/consulta-cpf-df/v1'));
    appendCandidate(candidates, normalizedBaseUrl.replace(/\/consulta-cpf-df-trial\/v1$/i, '/consulta-cpf-df-trial/api/v2'));
    appendCandidate(candidates, normalizedBaseUrl.replace(/\/consulta-cpf-df-trial\/v1$/i, '/consulta-cpf-df-trial/v2'));
    appendCandidate(candidates, normalizedBaseUrl.replace(/\/consulta-cpf-df-trial\/v1$/i, '/consulta-cpf-df-trial/api/v1'));
  }

  return candidates;
}

function decryptConsultaCpfConfig(row: ConsultaCpfConfigRow): ConsultaCpfConfig {
  return {
    ...row,
    consumer_key: decryptSecret(row.consumer_key) || '',
    consumer_secret: decryptSecret(row.consumer_secret) || '',
  };
}

async function migrateConsultaCpfSensitiveFields(row: ConsultaCpfConfigRow | null) {
  if (!row) return row;

  const needsMigration =
    !isEncryptedSecret(row.consumer_key) ||
    !isEncryptedSecret(row.consumer_secret);

  if (!needsMigration) {
    return row;
  }

  await db.query(
    `UPDATE consulta_cpf_config
     SET consumer_key = $1,
         consumer_secret = $2,
         updated_at = NOW()
     WHERE id = $3`,
    [
      encryptSecret(row.consumer_key),
      encryptSecret(row.consumer_secret),
      row.id,
    ]
  );

  return await getConsultaCpfConfigRow();
}

async function migrateConsultaCpfEndpoints(row: ConsultaCpfConfigRow | null) {
  if (!row) return row;

  const normalizedBaseUrl = normalizeConsultaCpfBaseUrl(row.base_url);
  const normalizedAuthUrl = normalizedPath(row.auth_url);

  if (normalizedBaseUrl === row.base_url && normalizedAuthUrl === row.auth_url) {
    return row;
  }

  await db.query(
    `UPDATE consulta_cpf_config
     SET base_url = $1,
         auth_url = $2,
         updated_at = NOW()
     WHERE id = $3`,
    [normalizedBaseUrl, normalizedAuthUrl, row.id]
  );

  return await getConsultaCpfConfigRow();
}

export async function getConsultaCpfConfig(): Promise<ConsultaCpfConfig | null> {
  const row = await getConsultaCpfConfigRow();
  const migratedRow = await migrateConsultaCpfSensitiveFields(row);
  const normalizedRow = await migrateConsultaCpfEndpoints(migratedRow);
  return normalizedRow ? decryptConsultaCpfConfig(normalizedRow) : null;
}

export async function saveConsultaCpfConfig(formData: FormData) {
  try {
    await ensureConsultaCpfTable();

    const existing = await getConsultaCpfConfig();
    const validatedData = consultaCpfConfigSchema.parse({
      base_url: normalizeConsultaCpfBaseUrl(String(formData.get('base_url') || '')),
      auth_url: normalizedPath(String(formData.get('auth_url') || '').trim()),
      consumer_key: String(formData.get('consumer_key') || '').trim(),
      consumer_secret: String(formData.get('consumer_secret') || '').trim(),
      is_active: String(formData.get('is_active') || '') === 'true',
    });

    const values = [
      validatedData.base_url,
      validatedData.auth_url,
      encryptSecret(validatedData.consumer_key),
      encryptSecret(validatedData.consumer_secret),
      validatedData.is_active,
    ];

    if (existing) {
      await db.query(
        `UPDATE consulta_cpf_config
         SET base_url = $1,
             auth_url = $2,
             consumer_key = $3,
             consumer_secret = $4,
             is_active = $5,
             updated_at = NOW()
         WHERE id = 1`,
        values
      );
    } else {
      await db.query(
        `INSERT INTO consulta_cpf_config (
          id, base_url, auth_url, consumer_key, consumer_secret, is_active
        ) VALUES (
          1, $1, $2, $3, $4, $5
        )`,
        values
      );
    }

    revalidatePath('/admin/integrations');
    revalidatePath('/admin/integrations/consulta-cpf');
    return { success: true };
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0]?.message || 'Dados inválidos para salvar a integração Consulta CPF.' };
    }
    return { error: getErrorMessage(error) || 'Erro ao salvar a configuração da Consulta CPF' };
  }
}

function normalizedPath(value: string) {
  return value.replace(/\/+$/, '');
}

function formatConsultaCpfError(error: unknown) {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const apiMessage =
      typeof error.response?.data?.message === 'string'
        ? error.response.data.message.trim()
        : typeof error.response?.data?.mensagem === 'string'
          ? error.response.data.mensagem.trim()
          : '';

    if (status === 401) {
      return 'Falha na autenticacao da Consulta CPF do Serpro. Verifique Consumer Key, Consumer Secret e se o contrato esta ativo.';
    }

    if (status === 403) {
      return 'A Consulta CPF do Serpro recusou a requisicao por caminho invalido.';
    }

    if (status === 404) {
      return 'O CPF informado nao foi localizado na base oficial da Consulta CPF do Serpro.';
    }

    if (status === 406) {
      return 'A Consulta CPF do Serpro recusou o cabecalho Accept enviado pela aplicacao.';
    }

    if (status === 422 || status === 451) {
      return 'A Consulta CPF do Serpro bloqueou o retorno por restricao LGPD para menor de idade.';
    }

    return `Falha ao consultar a Consulta CPF do Serpro${status ? ` (${status})` : ''}${apiMessage ? `: ${apiMessage}` : '.'}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Falha desconhecida ao consultar a Consulta CPF do Serpro.';
}

async function authenticateConsultaCpf(config: ConsultaCpfConfig) {
  const basicAuth = Buffer.from(`${config.consumer_key}:${config.consumer_secret}`).toString('base64');

  const response = await axios.post<ConsultaCpfTokenResponse>(
    config.auth_url,
    'grant_type=client_credentials',
    {
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: 30000,
    }
  );

  if (!response.data?.access_token) {
    throw new Error('A autenticação da Consulta CPF não retornou access_token.');
  }

  return response.data.access_token;
}

export async function consultCpfViaSerproConsultaCpf(cpf: string): Promise<ConsultaCpfResult | null> {
  const cleanCpf = cpf.replace(/\D/g, '');
  if (cleanCpf.length !== 11) {
    throw new Error('CPF inválido para consulta externa.');
  }

  const config = await getConsultaCpfConfig();
  if (!config || !config.is_active) {
    return null;
  }

  const accessToken = await authenticateConsultaCpf(config);
  const baseUrlCandidates = buildConsultaCpfBaseUrlCandidates(config.base_url);
  let response;
  let lastError: unknown = null;

  for (const candidateBaseUrl of baseUrlCandidates) {
    try {
      response = await axios.get(
        `${candidateBaseUrl}/cpf/${cleanCpf}`,
        {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          timeout: 30000,
        }
      );

      if (candidateBaseUrl !== normalizedPath(config.base_url)) {
        await db.query(
          `UPDATE consulta_cpf_config
           SET base_url = $1,
               updated_at = NOW()
           WHERE id = 1`,
          [candidateBaseUrl]
        );
      }

      break;
    } catch (error) {
      lastError = error;

      if (!axios.isAxiosError(error)) {
        break;
      }

      const status = error.response?.status;
      if (status !== 403 && status !== 404) {
        break;
      }
    }
  }

  if (!response) {
    throw new Error(formatConsultaCpfError(lastError));
  }

  const nome = typeof response.data?.nome === 'string' ? response.data.nome.trim() : '';
  if (!nome) {
    throw new Error('A API Consulta CPF não retornou um nome utilizável para o CPF informado.');
  }

  return {
    nome,
    fonte: 'consulta-cpf-serpro',
    raw: response.data,
  };
}
