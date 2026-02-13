
-- Create enuves_categories table
CREATE TABLE IF NOT EXISTS enuves_categories (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    code VARCHAR(6) NOT NULL,
    description VARCHAR(50) NOT NULL,
    nature VARCHAR(20) NOT NULL CHECK (nature IN ('Saída', 'Entrada', 'Transferência')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES client_companies(id) ON DELETE CASCADE
);

-- Add unique constraint for code per company
CREATE UNIQUE INDEX IF NOT EXISTS idx_enuves_categories_code_company ON enuves_categories(company_id, code);
