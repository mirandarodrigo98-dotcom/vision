const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('neon.tech') 
    ? { rejectUnauthorized: false } 
    : undefined,
});

async function run() {
  try {
    console.log('Running migration...');

    await pool.query("ALTER TABLE employees ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE'");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS societario_contracts (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        created_by_user_id TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (created_by_user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS societario_processes (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK(type IN ('CONSTITUICAO','ALTERACAO','BAIXA')),
        status TEXT NOT NULL DEFAULT 'NAO_INICIADO' CHECK(status IN ('NAO_INICIADO','EM_ANDAMENTO','CONCLUIDO')),
        company_id TEXT,
        razao_social TEXT,
        nome_fantasia TEXT,
        capital_social_centavos INTEGER,
        socio_administrador TEXT,
        objeto_social TEXT,
        telefone TEXT,
        email TEXT,
        observacao TEXT,
        natureza_juridica TEXT,
        porte TEXT,
        tributacao TEXT,
        inscricao_imobiliaria TEXT,
        compl_cep TEXT,
        compl_logradouro_tipo TEXT,
        compl_logradouro TEXT,
        compl_numero TEXT,
        compl_complemento TEXT,
        compl_bairro TEXT,
        compl_municipio TEXT,
        compl_uf TEXT,
        created_by_user_id TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (company_id) REFERENCES client_companies(id),
        FOREIGN KEY (created_by_user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS societario_process_cnaes (
        id TEXT PRIMARY KEY,
        process_id TEXT NOT NULL,
        cnae_code TEXT NOT NULL,
        cnae_desc TEXT,
        FOREIGN KEY (process_id) REFERENCES societario_processes(id)
      );

      CREATE TABLE IF NOT EXISTS societario_process_socios (
        id TEXT PRIMARY KEY,
        process_id TEXT NOT NULL,
        nome TEXT,
        cpf TEXT,
        rg TEXT,
        cnh TEXT,
        participacao_percent REAL,
        cep TEXT,
        logradouro_tipo TEXT,
        logradouro TEXT,
        numero TEXT,
        complemento TEXT,
        bairro TEXT,
        municipio TEXT,
        uf TEXT,
        FOREIGN KEY (process_id) REFERENCES societario_processes(id)
      );
    `);

    console.log('Migration successful');
  } catch (err) {
    console.error('Migration failed', err);
  } finally {
    await pool.end();
  }
}

run();
