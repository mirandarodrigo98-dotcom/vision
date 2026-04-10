import fs from 'fs';
import path from 'path';

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

async function run() {
  const db = (await import('../src/lib/db')).default;
  const c = await db.prepare("SELECT * FROM system_errors ORDER BY id DESC LIMIT 50").all() as any;
  for (const log of c) {
    if (log.context.includes("DEBUG")) {
      console.log(JSON.stringify(log, null, 2));
    }
  }
  process.exit(0);
}
run();
