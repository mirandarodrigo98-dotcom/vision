import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente do .env.local ANTES de tudo
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config(); // Fallback para .env
}

async function run() {
  // Import dinâmico para garantir que variáveis de ambiente estejam carregadas
  const { default: db } = await import('../src/lib/db');

  const sqlPath = path.join(process.cwd(), 'src', 'db', 'migrations', '041_create_tickets_module.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');

  console.log('Applying migration 041_create_tickets_module.sql...');

  try {
    // Split statements by semicolon
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);

    for (const statement of statements) {
      if (statement.trim()) {
        await db.prepare(statement).run();
      }
    }

    console.log('Migration applied successfully.');
  } catch (error) {
    console.error('Error applying migration:', error);
    process.exit(1);
  }
}

run();
