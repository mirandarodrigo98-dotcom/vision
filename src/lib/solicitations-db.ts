import db from '@/lib/db';

export async function ensureSolicitationsTables() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS solicitation_types (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      department_id TEXT NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS solicitations (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL REFERENCES client_companies(id) ON DELETE CASCADE,
      request_type_id TEXT NOT NULL REFERENCES solicitation_types(id) ON DELETE RESTRICT,
      department_id TEXT NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
      subject TEXT NOT NULL,
      details TEXT NOT NULL,
      attachment_key TEXT,
      status TEXT NOT NULL DEFAULT 'SUBMITTED',
      protocol_number TEXT NOT NULL UNIQUE,
      created_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      completed_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      completed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`ALTER TABLE solicitation_types ADD COLUMN IF NOT EXISTS description TEXT`);
  await db.query(`ALTER TABLE solicitation_types ADD COLUMN IF NOT EXISTS department_id TEXT REFERENCES departments(id) ON DELETE RESTRICT`);
  await db.query(`ALTER TABLE solicitation_types ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE`);
  await db.query(`ALTER TABLE solicitations ADD COLUMN IF NOT EXISTS attachment_key TEXT`);
  await db.query(`ALTER TABLE solicitations ADD COLUMN IF NOT EXISTS completed_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL`);
  await db.query(`ALTER TABLE solicitations ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP`);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_solicitation_types_department_id
    ON solicitation_types(department_id)
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_solicitations_company_id
    ON solicitations(company_id)
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_solicitations_request_type_id
    ON solicitations(request_type_id)
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_solicitations_department_id
    ON solicitations(department_id)
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_solicitations_status
    ON solicitations(status)
  `);
}
