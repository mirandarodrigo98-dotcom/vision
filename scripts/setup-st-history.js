const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

const envPath = path.resolve(process.cwd(), '.env');
const envConfig = fs.readFileSync(envPath, 'utf8');
envConfig.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
      const val = match[2].replace(/"/g, '').trim();
      process.env[match[1]] = val;
  }
});

async function main() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS fiscal_conferencias_st (
                id SERIAL PRIMARY KEY,
                empresa_id INTEGER,
                empresa_nome VARCHAR(255),
                user_id INTEGER,
                user_name VARCHAR(100),
                arquivos_enviados INTEGER DEFAULT 0,
                arquivos_validos INTEGER DEFAULT 0,
                arquivos_invalidos INTEGER DEFAULT 0,
                resultado_json JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Tabela fiscal_conferencias_st criada/verificada com sucesso.');
    } catch (e) {
        console.error('Erro ao criar tabela:', e);
    } finally {
        await pool.end();
    }
}
main();