CREATE TABLE IF NOT EXISTS questor_config (
    id INTEGER PRIMARY KEY CHECK (id = 1), -- Singleton
    environment VARCHAR(20) NOT NULL DEFAULT 'homologation', -- 'homologation' or 'production'
    is_active BOOLEAN DEFAULT FALSE,
    erp_cnpj VARCHAR(18), -- CNPJ of the Vision System Owner (Developer/ERP)
    default_accountant_cnpj VARCHAR(18), -- Default CNPJ of the Accounting Office
    access_token TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS questor_company_auth (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    request_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, active, error
    last_sync_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES client_companies(id) ON DELETE CASCADE
);
