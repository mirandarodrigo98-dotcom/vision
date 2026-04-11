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
pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'ir_declarations'").then(res => {
  console.log(res.rows);
  pool.end();
});
