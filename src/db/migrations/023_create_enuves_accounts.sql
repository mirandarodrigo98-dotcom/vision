
-- Create enuves_accounts table
CREATE TABLE IF NOT EXISTS enuves_accounts (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    code TEXT NOT NULL,
    description TEXT NOT NULL,
    integration_code VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES client_companies(id) ON DELETE CASCADE
);

-- Add unique constraint for code per company
CREATE UNIQUE INDEX IF NOT EXISTS idx_enuves_accounts_code_company ON enuves_accounts(company_id, code);
