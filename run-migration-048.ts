import fs from 'fs';
import path from 'path';

const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envPath = path.resolve(process.cwd(), '.env');

function loadEnv(file: string) {
  if (fs.existsSync(file)) {
    const envConfig = fs.readFileSync(file, 'utf8');
    envConfig.split('\n').forEach(line => {
      line = line.trim();
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        process.env[match[1]] = match[2].replace(/^"|"$/g, '').trim();
      }
    });
  }
}

loadEnv(envPath);
loadEnv(envLocalPath);

import { Pool } from 'pg';

async function run() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("No DATABASE_URL found");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  const sql = `
    CREATE TABLE IF NOT EXISTS ir_declarations (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      name VARCHAR(255) NOT NULL,
      year VARCHAR(4) NOT NULL,
      phone VARCHAR(20),
      email VARCHAR(255),
      type VARCHAR(20) NOT NULL CHECK (type IN ('Sócio', 'Particular')),
      company_id TEXT REFERENCES client_companies(id) ON DELETE SET NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'Não Iniciado',
      is_received BOOLEAN DEFAULT FALSE,
      created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ir_interactions (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      declaration_id TEXT NOT NULL REFERENCES ir_declarations(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(20) NOT NULL CHECK (type IN ('comment', 'status_change')),
      content TEXT,
      old_status VARCHAR(50),
      new_status VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  try {
    console.log("Applying migration 048 (Imposto de Renda)...");
    await pool.query(sql);
    console.log("Migration 048 applied successfully.");
  } catch (error) {
    console.error("Error applying migration 048:", error);
  } finally {
    await pool.end();
  }
}

run();
