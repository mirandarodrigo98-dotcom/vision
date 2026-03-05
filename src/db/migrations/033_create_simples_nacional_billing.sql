
-- Tabela para armazenar o faturamento do Simples Nacional por empresa e competência
CREATE TABLE IF NOT EXISTS simples_nacional_billing (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES client_companies(id) ON DELETE CASCADE,
    competence TEXT NOT NULL, -- Formato YYYY-MM
    rpa_competence DECIMAL(15, 2), -- RPA Competência
    rpa_cash DECIMAL(15, 2), -- RPA Caixa
    rpa_accumulated DECIMAL(15, 2), -- RPA Acumulado
    rbt12 DECIMAL(15, 2), -- RBT12
    rba DECIMAL(15, 2), -- RBA
    rbaa DECIMAL(15, 2), -- RBAA
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, competence)
);

CREATE INDEX IF NOT EXISTS idx_simples_nacional_billing_company_competence ON simples_nacional_billing(company_id, competence);
