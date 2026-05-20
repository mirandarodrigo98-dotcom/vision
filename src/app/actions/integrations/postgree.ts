'use server';

import { revalidatePath } from 'next/cache';
import { Client } from 'pg';

import db from '@/lib/db';
import { decryptSecret, encryptSecret, isEncryptedSecret } from '@/lib/secret-crypto';
import { postgreeConfigSchema, type PostgreeConfig } from '@/types/postgree';

type PostgreeConfigRow = Omit<PostgreeConfig, 'password' | 'username'> & {
  username: string;
  password: string;
};

function normalizeSchemaName(value: string) {
  const normalized = (value || '').trim();
  return normalized || 'public';
}

function quoteIdentifier(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

export async function ensurePostgreeConfigTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS postgree_config (
      id INTEGER PRIMARY KEY,
      host TEXT NOT NULL,
      port INTEGER NOT NULL DEFAULT 5432,
      database_name TEXT NOT NULL,
      username TEXT NOT NULL,
      password TEXT NOT NULL,
      schema_name TEXT NOT NULL DEFAULT 'public',
      ssl_enabled BOOLEAN NOT NULL DEFAULT false,
      is_active BOOLEAN NOT NULL DEFAULT true,
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
}

async function getPostgreeConfigRow(): Promise<PostgreeConfigRow | null> {
  await ensurePostgreeConfigTable();
  const result = await db.query<PostgreeConfigRow>('SELECT * FROM postgree_config WHERE id = 1');
  return result.rows[0] || null;
}

function decryptPostgreeConfig(row: PostgreeConfigRow): PostgreeConfig {
  return {
    ...row,
    username: decryptSecret(row.username) || '',
    password: decryptSecret(row.password) || '',
    schema_name: normalizeSchemaName(row.schema_name),
    ssl_enabled: Boolean(row.ssl_enabled),
    is_active: Boolean(row.is_active),
  };
}

async function migratePostgreeSensitiveFields(row: PostgreeConfigRow | null) {
  if (!row) return row;

  const needsMigration =
    !isEncryptedSecret(row.username) ||
    !isEncryptedSecret(row.password);

  if (!needsMigration) {
    return row;
  }

  await db.query(
    `UPDATE postgree_config
     SET username = $1,
         password = $2,
         updated_at = NOW()
     WHERE id = $3`,
    [encryptSecret(row.username), encryptSecret(row.password), row.id],
  );

  return getPostgreeConfigRow();
}

export async function getPostgreeConfig(): Promise<PostgreeConfig | null> {
  const row = await getPostgreeConfigRow();
  const migratedRow = await migratePostgreeSensitiveFields(row);
  return migratedRow ? decryptPostgreeConfig(migratedRow) : null;
}

function buildConnectionOptions(config: PostgreeConfig) {
  return {
    host: config.host,
    port: config.port,
    database: config.database_name,
    user: config.username,
    password: config.password,
    ssl: config.ssl_enabled ? { rejectUnauthorized: false } : undefined,
  };
}

export async function savePostgreeConfig(formData: FormData) {
  try {
    await ensurePostgreeConfigTable();

    const validatedData = postgreeConfigSchema.parse({
      host: String(formData.get('host') || '').trim(),
      port: Number(formData.get('port') || 5432),
      database_name: String(formData.get('database_name') || '').trim(),
      username: String(formData.get('username') || '').trim(),
      password: String(formData.get('password') || '').trim(),
      schema_name: normalizeSchemaName(String(formData.get('schema_name') || 'public')),
      ssl_enabled: String(formData.get('ssl_enabled') || '') === 'true',
      is_active: String(formData.get('is_active') || '') === 'true',
    });

    const existing = await getPostgreeConfig();
    const values = [
      validatedData.host,
      validatedData.port,
      validatedData.database_name,
      encryptSecret(validatedData.username),
      encryptSecret(validatedData.password),
      validatedData.schema_name,
      validatedData.ssl_enabled,
      validatedData.is_active,
    ];

    if (existing) {
      await db.query(
        `UPDATE postgree_config
         SET host = $1,
             port = $2,
             database_name = $3,
             username = $4,
             password = $5,
             schema_name = $6,
             ssl_enabled = $7,
             is_active = $8,
             updated_at = NOW()
         WHERE id = 1`,
        values,
      );
    } else {
      await db.query(
        `INSERT INTO postgree_config (
          id, host, port, database_name, username, password, schema_name, ssl_enabled, is_active
        ) VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8)`,
        values,
      );
    }

    revalidatePath('/admin/integrations/postgree');
    return { success: true };
  } catch (error) {
    console.error('Erro ao salvar configuração do Postgree:', error);
    return {
      error: error instanceof Error ? error.message : 'Erro ao salvar a configuração do Postgree.',
    };
  }
}

export async function testPostgreeConnection() {
  let client: Client | null = null;

  try {
    const config = await getPostgreeConfig();
    if (!config || !config.is_active) {
      return { success: false, error: 'Configure e ative a integração Postgree antes de testar.' };
    }

    client = new Client(buildConnectionOptions(config));
    await client.connect();

    if (config.schema_name) {
      await client.query(`SET search_path TO ${quoteIdentifier(config.schema_name)}`);
    }

    const result = await client.query(
      `SELECT current_database() AS database_name, current_user AS username, current_schema() AS schema_name`,
    );

    return {
      success: true,
      data: result.rows[0],
    };
  } catch (error) {
    console.error('Erro ao testar conexão Postgree:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao testar a conexão Postgree.',
    };
  } finally {
    if (client) {
      await client.end().catch(() => undefined);
    }
  }
}
