import path from 'path';
import fs from 'fs';

const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1];
      let value = match[2];
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      process.env[key] = value.replace(/\r/g, '');
    }
  });
}

import { Pool } from 'pg';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query(`CREATE TABLE IF NOT EXISTS omie_recebimentos (
  id SERIAL PRIMARY KEY,
  codigo_lancamento BIGINT NOT NULL,
  codigo_baixa BIGINT NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  data TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`).then(() => {
  console.log('Table created');
  pool.end();
}).catch(console.error);