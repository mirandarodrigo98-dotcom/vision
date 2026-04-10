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

async function revertStatus() {
    const { default: db } = await import('../src/lib/db');
    try {
        const declaration = await db.prepare(`SELECT * FROM ir_declarations WHERE name ILIKE '%VITOR DE CARVALHO SALES%'`).get();
        if (!declaration) {
            console.log("Contribuinte não encontrada");
            return;
        }
        console.log("Found declaration:", declaration);
        
        // Let's get the interactions to see what to delete
        const interactions = await db.prepare(`SELECT * FROM ir_interactions WHERE declaration_id = $1 ORDER BY created_at DESC LIMIT 10`).all(declaration.id);
        console.log("Interactions:", interactions);
        
        // Delete the specific status change records
        await db.prepare(`DELETE FROM ir_interactions WHERE declaration_id = $1 AND content LIKE '%Retificadora%'`).run(declaration.id);
        await db.prepare(`DELETE FROM ir_interactions WHERE declaration_id = $1 AND content LIKE '%Transmitida%'`).run(declaration.id);
        
        // Revert status to 'Validada' (usually the step before Transmitida)
        await db.prepare(`UPDATE ir_declarations SET status = 'Validada' WHERE id = $1`).run(declaration.id);
        console.log("Reverted successfully to Validada.");
    } catch (e) {
        console.error("Error:", e);
    }
}
revertStatus().then(() => process.exit(0));