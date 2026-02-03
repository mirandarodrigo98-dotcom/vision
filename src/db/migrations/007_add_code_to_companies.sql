ALTER TABLE client_companies ADD COLUMN code TEXT;
CREATE INDEX idx_client_companies_code ON client_companies(code);
