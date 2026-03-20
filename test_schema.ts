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

// Just trigger auto-migrate directly
const { ensureMigrations } = require('./src/lib/auto-migrate.ts');

async function main() {
  try {
    await ensureMigrations();
    console.log('Done running migrations manually');
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

main();