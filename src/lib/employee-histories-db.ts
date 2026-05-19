import db from '@/lib/db';

export async function ensureEmployeeHistoriesTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS employee_histories (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL REFERENCES client_companies(id) ON DELETE CASCADE,
      employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      request_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'SUBMITTED',
      protocol_number TEXT NOT NULL UNIQUE,
      effective_date DATE,
      current_data TEXT,
      requested_change TEXT,
      details TEXT,
      attachment_key TEXT,
      created_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}
