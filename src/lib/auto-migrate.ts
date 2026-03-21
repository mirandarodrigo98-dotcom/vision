import db from './db';

const MIGRATION_025 = `
CREATE TABLE IF NOT EXISTS eklesia_categories (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    code VARCHAR(6) NOT NULL,
    description VARCHAR(50) NOT NULL,
    nature VARCHAR(20) NOT NULL CHECK (nature IN ('Saída', 'Entrada', 'Transferência')),
    integration_code VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES client_companies(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_eklesia_categories_code_company ON eklesia_categories(company_id, code);

CREATE TABLE IF NOT EXISTS eklesia_accounts (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    code TEXT NOT NULL,
    description TEXT NOT NULL,
    integration_code VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES client_companies(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_eklesia_accounts_code_company ON eklesia_accounts(company_id, code);

CREATE TABLE IF NOT EXISTS eklesia_transactions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT NOT NULL,
    category_id TEXT NOT NULL,
    account_id TEXT REFERENCES eklesia_accounts(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    description TEXT NOT NULL,
    original_description TEXT,
    value DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES eklesia_categories(id) ON DELETE CASCADE
);
`;

export async function ensureMigrations() {
  console.log('Starting auto-migration check...');

  try {
    // Migration 025: Create Eklesia tables
    try {
      console.log('Applying migration 025 (Create Eklesia tables)...');
      // Split by semicolon because db.prepare might only run one statement at a time depending on adapter implementation
      // But better-sqlite3/pg might handle multiple. Let's try splitting to be safe.
      const statements = MIGRATION_025.split(';').map(s => s.trim()).filter(s => s.length > 0);
      for (const stmt of statements) {
          await db.prepare(stmt).run();
      }
      console.log('Migration 025 applied.');
    } catch (e: any) {
      console.log('Migration 025 might have already run or failed:', e.message);
    }

    // Migration 026: Increase description size
    try {
      console.log('Applying migration 026 (description TEXT)...');
      // Postgres: ALTER TABLE ... ALTER COLUMN ... TYPE ...
      await db.prepare('ALTER TABLE eklesia_categories ALTER COLUMN description TYPE TEXT').run();
      console.log('Migration 026 applied.');
    } catch (e: any) {
      // Ignore if error is specific to "already TEXT" (Postgres usually doesn't complain if same type, but let's be safe)
      console.log('Migration 026 result:', e.message);
    }

    // Migration 027: Add is_active
    try {
      console.log('Applying migration 027 (is_active)...');
      await db.prepare('ALTER TABLE eklesia_categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE').run();
      console.log('Migration 027 (categories) applied.');
    } catch (e: any) {
      console.log('Migration 027 (categories) result:', e.message);
    }

    try {
        await db.prepare('ALTER TABLE eklesia_accounts ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE').run();
        console.log('Migration 027 (accounts) applied.');
    } catch (e: any) {
        console.log('Migration 027 (accounts) result:', e.message);
    }

    // Migration 028: Add questor sync columns to eklesia_transactions
    try {
      console.log('Applying migration 028 (questor sync columns)...');
      await db.prepare('ALTER TABLE eklesia_transactions ADD COLUMN IF NOT EXISTS questor_synced_at TIMESTAMP').run();
      await db.prepare('ALTER TABLE eklesia_transactions ADD COLUMN IF NOT EXISTS questor_sync_id TEXT').run();
      await db.prepare('ALTER TABLE eklesia_transactions ADD COLUMN IF NOT EXISTS questor_sync_error TEXT').run();
      console.log('Migration 028 applied.');
    } catch (e: any) {
      console.log('Migration 028 result:', e.message);
    }

    // Migration 029: Add recebimento and aliquota_efetiva to simples_nacional_billing
    try {
      console.log('Applying migration 029 (simples_nacional_billing columns)...');
      await db.prepare('ALTER TABLE simples_nacional_billing ADD COLUMN IF NOT EXISTS recebimento DECIMAL(15,2) DEFAULT 0').run();
      await db.prepare('ALTER TABLE simples_nacional_billing ADD COLUMN IF NOT EXISTS aliquota_efetiva DECIMAL(10,4) DEFAULT 0').run();
      console.log('Migration 029 applied.');
    } catch (e: any) {
      console.log('Migration 029 result:', e.message);
    }

    console.log('Auto-migration check completed.');
  } catch (error) {
    console.error('Auto-migration failed:', error);
  }
}
