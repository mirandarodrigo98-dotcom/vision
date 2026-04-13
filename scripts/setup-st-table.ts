import { Pool } from 'pg';
import * as path from 'path';
import * as fs from 'fs';

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
            CREATE TABLE IF NOT EXISTS fiscal_regras_st (
                id SERIAL PRIMARY KEY,
                uf VARCHAR(2) NOT NULL,
                item INTEGER,
                nome_item VARCHAR(100),
                subitem VARCHAR(10),
                cest VARCHAR(9),
                ncm_sh VARCHAR(10),
                descricao VARCHAR(150),
                mva_original NUMERIC(10, 2),
                mva_ajustada_int12 NUMERIC(10, 2),
                mva_ajustada_int4 NUMERIC(10, 2),
                fundamento_normativo TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Tabela fiscal_regras_st criada/verificada com sucesso.');
    } catch (e) {
        console.error('Erro ao criar tabela:', e);
    } finally {
        await pool.end();
    }
}
main();
