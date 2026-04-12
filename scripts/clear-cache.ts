import * as fs from 'fs';
import * as path from 'path';
import { Pool } from 'pg';

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
        await pool.query('DELETE FROM omie_dashboard_cache WHERE id = 1');
        console.log('Cache cleared successfully.');
    } catch (e) {
        console.error('Failed to clear cache', e);
    } finally {
        await pool.end();
    }
}
main();