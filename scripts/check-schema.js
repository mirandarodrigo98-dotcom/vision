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
        const { rows } = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'client_companies'");
        console.log('Columns in client_companies:', rows.map(r => r.column_name).join(', '));
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
main();