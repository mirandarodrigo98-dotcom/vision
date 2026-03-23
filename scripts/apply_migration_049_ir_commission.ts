import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const dbUrlMatch = envContent.match(/DATABASE_URL="?([^"\n]+)"?/);
const dbUrl = dbUrlMatch ? dbUrlMatch[1].trim() : process.env.DATABASE_URL;

const pool = new Pool({
  connectionString: dbUrl,
});

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Add fields to users table for internal commission
    console.log('Adding commission fields to users table...');
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS ir_commission_active BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS ir_commission_percent DECIMAL(5,2);
    `);

    // 2. Create ir_partners table
    console.log('Creating ir_partners table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS ir_partners (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        commission_percent DECIMAL(5,2) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(20),
        payment_data TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // 3. Add fields to ir_declarations
    console.log('Adding referral and receipt fields to ir_declarations...');
    await client.query(`
      ALTER TABLE ir_declarations 
      ADD COLUMN IF NOT EXISTS indicated_by_user_id VARCHAR(255) REFERENCES users(id),
      ADD COLUMN IF NOT EXISTS indicated_by_partner_id UUID REFERENCES ir_partners(id),
      ADD COLUMN IF NOT EXISTS service_value DECIMAL(10,2),
      ADD COLUMN IF NOT EXISTS receipt_date DATE,
      ADD COLUMN IF NOT EXISTS receipt_method VARCHAR(50),
      ADD COLUMN IF NOT EXISTS receipt_account VARCHAR(100),
      ADD COLUMN IF NOT EXISTS receipt_attachment_url VARCHAR(255);
    `);

    // 4. Update existing statuses to the new naming convention
    console.log('Updating existing statuses in ir_declarations...');
    await client.query(`
      UPDATE ir_declarations SET status = 'Iniciado' WHERE status = 'Em andamento';
      UPDATE ir_declarations SET status = 'Validada' WHERE status = 'Em Validação';
      UPDATE ir_declarations SET status = 'Transmitida' WHERE status = 'Transmitido';
      UPDATE ir_declarations SET status = 'Processada' WHERE status = 'Processado';
    `);

    await client.query('COMMIT');
    console.log('Migration 049 completed successfully!');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', e);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
