import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
const envConfig = fs.readFileSync(envPath, 'utf8');
envConfig.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) process.env[match[1]] = match[2].replace(/"/g, '').trim();
});

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function createCacheTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS omie_dashboard_cache (
        id SERIAL PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Tabela omie_dashboard_cache criada com sucesso.');
  } catch (error) {
    console.error('Erro ao criar tabela de cache:', error);
  } finally {
    pool.end();
  }
}

createCacheTable();