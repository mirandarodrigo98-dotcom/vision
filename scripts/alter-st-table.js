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
            ALTER TABLE fiscal_regras_st 
            ADD COLUMN IF NOT EXISTS ambito_aplicacao TEXT,
            ADD COLUMN IF NOT EXISTS notas TEXT;
        `);
        console.log('Tabela fiscal_regras_st alterada com sucesso.');
    } catch (e) {
        console.error('Erro ao alterar tabela:', e);
    } finally {
        await pool.end();
    }
}
main();
