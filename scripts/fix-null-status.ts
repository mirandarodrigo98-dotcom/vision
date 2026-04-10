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

async function fixNullStatus() {
    const { default: db } = await import('../src/lib/db');
    try {
        console.log("Fixing old interactions with null new_status...");
        const result = await db.prepare(`
            UPDATE ir_interactions 
            SET new_status = 'Transmitida' 
            WHERE type = 'status_change' 
            AND new_status IS NULL 
            AND content LIKE '%Transmitida%'
        `).run();
        console.log(`Updated ${result.changes} rows with 'Transmitida'.`);

        // Let's also check for 'Processada' or others just in case
        const processadaResult = await db.prepare(`
            UPDATE ir_interactions 
            SET new_status = 'Processada' 
            WHERE type = 'status_change' 
            AND new_status IS NULL 
            AND content LIKE '%Processada%'
        `).run();
        console.log(`Updated ${processadaResult.changes} rows with 'Processada'.`);

    } catch (e) {
        console.error("Error fixing DB:", e);
    }
}

fixNullStatus().then(() => process.exit(0));