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
        const cached = (await pool.query('SELECT data, updated_at, NOW() as db_now FROM omie_dashboard_cache WHERE id = 1')).rows[0];
        console.log('data type:', typeof cached?.data);
        console.log('updated_at:', cached?.updated_at);
        console.log('updated_at type:', typeof cached?.updated_at);
        console.log('db_now:', cached?.db_now);
        console.log('JS now:', new Date());
        
        if (cached) {
            const now = new Date();
            const lastUpdate = new Date(cached.updated_at);
            const today6AM = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 6, 0, 0);
            console.log('today6AM:', today6AM);
            console.log('now >= today6AM:', now >= today6AM);
            console.log('lastUpdate < today6AM:', lastUpdate < today6AM);
        }
    } catch (e) {
        console.error('Failed to check cache', e);
    } finally {
        await pool.end();
    }
}
main();