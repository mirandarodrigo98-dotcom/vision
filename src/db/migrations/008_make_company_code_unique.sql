DROP INDEX IF EXISTS idx_client_companies_code;
CREATE UNIQUE INDEX idx_client_companies_code ON client_companies(code);
