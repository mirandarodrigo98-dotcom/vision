import fs from 'fs';
import path from 'path';

const envPathLocal = path.resolve(process.cwd(), '.env.local');
const envPath = path.resolve(process.cwd(), '.env');

[envPath, envPathLocal].forEach(p => {
  if (fs.existsSync(p)) {
    const envConfig = fs.readFileSync(p, 'utf8');
    envConfig.split('\n').forEach(line => {
      line = line.trim();
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        process.env[match[1]] = match[2].replace(/^"|"$/g, '').trim();
      }
    });
  }
});

async function run() {
  const { ensureMigrations } = await import('./src/lib/auto-migrate');
  await ensureMigrations();
  process.exit(0);
}

run();