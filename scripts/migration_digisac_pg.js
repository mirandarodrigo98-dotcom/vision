
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Iniciando migração Digisac...');

    // Criar tabela digisac_config
    await client.query(`
      CREATE TABLE IF NOT EXISTS digisac_config (
        id INTEGER PRIMARY KEY DEFAULT 1,
        base_url TEXT NOT NULL DEFAULT 'https://api.digisac.com.br',
        api_token TEXT,
        is_active INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Tabela digisac_config verificada/criada.');

    // Inserir configuração inicial se não existir
    await client.query(`
      INSERT INTO digisac_config (id, base_url, api_token, is_active)
      VALUES (1, 'https://api.digisac.com.br', '', 0)
      ON CONFLICT (id) DO NOTHING;
    `);
    console.log('Configuração inicial inserida (se necessário).');

    console.log('Migração concluída com sucesso!');
  } catch (err) {
    console.error('Erro na migração:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
