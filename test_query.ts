import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf-8');
  envConfig.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let val = match[2].trim();
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  });
}

const originalConnectionString = process.env.DATABASE_URL || '';
const hasSslMode = originalConnectionString.includes('sslmode=require');
const isNeon = originalConnectionString.includes('neon.tech');

let connectionString = originalConnectionString;
if (hasSslMode) {
  connectionString = connectionString.replace('?sslmode=require', '').replace('&sslmode=require', '');
}

const pool = new Pool({
  connectionString: connectionString,
  ssl: (isNeon || hasSslMode || process.env.NODE_ENV === 'production') 
    ? { rejectUnauthorized: false } 
    : undefined,
});

async function main() {
  try {
    let query = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN questor_synced_at IS NOT NULL THEN 1 ELSE 0 END) as synced,
        SUM(CASE WHEN questor_synced_at IS NULL THEN 1 ELSE 0 END) as pending,
        MIN(date) as min_date,
        MAX(date) as max_date
      FROM eklesia_transactions t
      WHERE t.company_id = $1
    `;
    const params: any[] = ['test-company-id'];
    const res = await pool.query(query, params);
    console.log(res.rows);
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
    process.exit(0);
  }
}
main();
