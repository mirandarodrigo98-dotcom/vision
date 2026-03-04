
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Starting migration...');

    // 1. Create contact_categories table
    console.log('Creating contact_categories table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS contact_categories (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Insert default categories
    await client.query(`
      INSERT INTO contact_categories (name) 
      VALUES ('Comercial'), ('Financeiro'), ('Suporte'), ('Administrativo')
      ON CONFLICT (name) DO NOTHING;
    `);

    // 2. Create company_phones table
    console.log('Creating company_phones table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS company_phones (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id TEXT NOT NULL,
        name TEXT NOT NULL,
        category_id INTEGER REFERENCES contact_categories(id),
        number TEXT NOT NULL,
        is_whatsapp BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Index on company_id
    await client.query(`CREATE INDEX IF NOT EXISTS idx_company_phones_company_id ON company_phones(company_id);`);

    // 3. Create company_emails table
    console.log('Creating company_emails table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS company_emails (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id TEXT NOT NULL,
        name TEXT NOT NULL,
        category_id INTEGER REFERENCES contact_categories(id),
        email TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Index on company_id
    await client.query(`CREATE INDEX IF NOT EXISTS idx_company_emails_company_id ON company_emails(company_id);`);

    // 4. Add is_representative to societario_company_socios
    console.log('Checking societario_company_socios table...');
    
    // Check if column exists
    const checkCol = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='societario_company_socios' AND column_name='is_representative';
    `);

    if (checkCol.rows.length === 0) {
      console.log('Adding is_representative column to societario_company_socios...');
      await client.query(`
        ALTER TABLE societario_company_socios 
        ADD COLUMN is_representative BOOLEAN DEFAULT FALSE;
      `);
    } else {
      console.log('Column is_representative already exists.');
    }

    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
