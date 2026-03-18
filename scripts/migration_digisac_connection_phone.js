require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
const ssl = connectionString && (connectionString.includes('neon.tech') || connectionString.includes('sslmode=require')) 
  ? { rejectUnauthorized: false } 
  : undefined;

const pool = new Pool({
  connectionString,
  ssl,
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Iniciando migração Digisac Connection Phone...');

    // Adicionar coluna connection_phone se não existir
    await client.query(`
      ALTER TABLE digisac_config 
      ADD COLUMN IF NOT EXISTS connection_phone TEXT;
    `);
    
    console.log('Coluna connection_phone adicionada com sucesso!');
  } catch (err) {
    console.error('Erro na migração:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
