
-- Create eklesia_categories table
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

-- Add unique constraint for code per company
CREATE UNIQUE INDEX IF NOT EXISTS idx_eklesia_categories_code_company ON eklesia_categories(company_id, code);

-- Create eklesia_accounts table
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

-- Add unique constraint for code per company
CREATE UNIQUE INDEX IF NOT EXISTS idx_eklesia_accounts_code_company ON eklesia_accounts(company_id, code);

-- Create eklesia_transactions table
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
