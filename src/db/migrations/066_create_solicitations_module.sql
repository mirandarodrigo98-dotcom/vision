CREATE TABLE IF NOT EXISTS solicitation_types (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    department_id TEXT NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS solicitations (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES client_companies(id) ON DELETE CASCADE,
    request_type_id TEXT NOT NULL REFERENCES solicitation_types(id) ON DELETE RESTRICT,
    department_id TEXT NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    subject TEXT NOT NULL,
    details TEXT NOT NULL,
    attachment_key TEXT,
    status TEXT NOT NULL DEFAULT 'SUBMITTED',
    protocol_number TEXT NOT NULL UNIQUE,
    created_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    completed_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_solicitation_types_department_id
    ON solicitation_types(department_id);

CREATE INDEX IF NOT EXISTS idx_solicitations_company_id
    ON solicitations(company_id);

CREATE INDEX IF NOT EXISTS idx_solicitations_request_type_id
    ON solicitations(request_type_id);

CREATE INDEX IF NOT EXISTS idx_solicitations_department_id
    ON solicitations(department_id);

CREATE INDEX IF NOT EXISTS idx_solicitations_status
    ON solicitations(status);
