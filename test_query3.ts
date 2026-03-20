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

const db = require('./src/lib/db').default;

async function main() {
  try {
    const res = await db.prepare("SELECT 1 FROM user_restricted_companies LIMIT 1").get();
    console.log("user_restricted_companies exists:", res);
  } catch (e) {
    console.error("Error:", e);
  } finally {
    process.exit(0);
  }
}
main();
