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

async function migrate() {
    const { default: db } = await import('../src/lib/db');
    const sql = `
CREATE TABLE IF NOT EXISTS ir_files (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    declaration_id TEXT NOT NULL REFERENCES ir_declarations(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_key TEXT NOT NULL,
    file_url TEXT NOT NULL,
    uploaded_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;
    await db.prepare(sql).run();
    console.log("Migration done");
}
migrate().then(() => process.exit(0)).catch(console.error);
