ALTER TABLE tickets ADD COLUMN company_id TEXT;
-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tickets_company ON tickets(company_id);
