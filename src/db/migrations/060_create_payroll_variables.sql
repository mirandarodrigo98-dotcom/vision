CREATE TABLE IF NOT EXISTS payroll_variables (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT REFERENCES client_companies(id),
  created_by_user_id TEXT REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  month_reference VARCHAR(7),
  status VARCHAR(20) DEFAULT 'draft',
  zen_protocol VARCHAR(100),
  events_data JSONB
);
