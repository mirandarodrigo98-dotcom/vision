-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    role TEXT NOT NULL CHECK(role IN ('admin', 'client_user', 'operator')),
    password_hash TEXT,
    password_temporary INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    deleted_at TIMESTAMP,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Client Companies table
CREATE TABLE IF NOT EXISTS client_companies (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    razao_social TEXT,
    cnpj TEXT UNIQUE NOT NULL,
    code TEXT,
    filial TEXT,
    municipio TEXT,
    uf TEXT,
    data_abertura TEXT,
    telefone TEXT,
    email_contato TEXT,
    is_active INTEGER DEFAULT 1,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_client_companies_code ON client_companies(code);

-- User Companies (Many-to-Many)
CREATE TABLE IF NOT EXISTS user_companies (
    user_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    PRIMARY KEY (user_id, company_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (company_id) REFERENCES client_companies(id)
);

-- Admin Allowed Emails
CREATE TABLE IF NOT EXISTS admin_allowed_emails (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- OTP Tokens
CREATE TABLE IF NOT EXISTS otp_tokens (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Settings
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
);

-- Admission Requests
CREATE TABLE IF NOT EXISTS admission_requests (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    created_by_user_id TEXT NOT NULL,
    employee_full_name TEXT NOT NULL,
    education_level TEXT,
    admission_date TIMESTAMP,
    job_role TEXT,
    salary_cents INTEGER,
    work_schedule TEXT,
    has_vt INTEGER,
    vt_tarifa_cents INTEGER,
    vt_linha TEXT,
    vt_qtd_por_dia INTEGER,
    has_adv INTEGER,
    adv_day INTEGER,
    adv_periodicity TEXT,
    trial1_days INTEGER,
    trial2_days INTEGER,
    status TEXT NOT NULL DEFAULT 'DRAFT', -- DRAFT, SUBMITTED, EMAILED, ERROR
    protocol_number TEXT UNIQUE,
    submitted_at TIMESTAMP,
    emailed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES client_companies(id),
    FOREIGN KEY (created_by_user_id) REFERENCES users(id)
);

-- Admission Attachments
CREATE TABLE IF NOT EXISTS admission_attachments (
    id TEXT PRIMARY KEY,
    admission_id TEXT NOT NULL,
    original_name TEXT,
    mime_type TEXT,
    size_bytes INTEGER,
    storage_path TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admission_id) REFERENCES admission_requests(id)
);

-- Employees
CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    code TEXT,
    name TEXT NOT NULL,
    admission_date TIMESTAMP,
    birth_date TIMESTAMP,
    gender TEXT,
    pis TEXT,
    cpf TEXT UNIQUE,
    esocial_registration TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES client_companies(id)
);

-- Vacations
CREATE TABLE IF NOT EXISTS vacations (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    employee_id TEXT NOT NULL,
    start_date TIMESTAMP NOT NULL,
    days_quantity INTEGER NOT NULL,
    allowance_days INTEGER DEFAULT 0,
    return_date TIMESTAMP NOT NULL,
    observations TEXT,
    status TEXT NOT NULL DEFAULT 'SUBMITTED', -- SUBMITTED, COMPLETED, CANCELLED
    protocol_number TEXT UNIQUE,
    created_by_user_id TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES client_companies(id),
    FOREIGN KEY (employee_id) REFERENCES employees(id),
    FOREIGN KEY (created_by_user_id) REFERENCES users(id)
);

-- Dismissals
CREATE TABLE IF NOT EXISTS dismissals (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    employee_id TEXT NOT NULL,
    notice_type TEXT NOT NULL,
    dismissal_cause TEXT NOT NULL,
    dismissal_date TIMESTAMP NOT NULL,
    observations TEXT,
    status TEXT NOT NULL DEFAULT 'SUBMITTED',
    protocol_number TEXT UNIQUE,
    created_by_user_id TEXT NOT NULL,
    created_by_email TEXT, -- Added to track who created even if user is deleted
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES client_companies(id),
    FOREIGN KEY (employee_id) REFERENCES employees(id),
    FOREIGN KEY (created_by_user_id) REFERENCES users(id)
);

-- Transfer Requests
CREATE TABLE IF NOT EXISTS transfer_requests (
    id TEXT PRIMARY KEY,
    source_company_id TEXT NOT NULL,
    target_company_id TEXT, -- Made nullable if needed, but logic says it should be there. Keeping consistent with migration.
    target_company_name TEXT NOT NULL,
    employee_name TEXT NOT NULL,
    transfer_date TIMESTAMP NOT NULL,
    observations TEXT,
    status TEXT NOT NULL DEFAULT 'SUBMITTED', -- SUBMITTED, COMPLETED, CANCELLED
    protocol_number TEXT UNIQUE,
    created_by_user_id TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (source_company_id) REFERENCES client_companies(id),
    FOREIGN KEY (created_by_user_id) REFERENCES users(id)
);

-- Role Permissions
CREATE TABLE IF NOT EXISTS role_permissions (
    role TEXT NOT NULL,
    permission TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (role, permission)
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actor_user_id TEXT,
    actor_email TEXT,
    role TEXT,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    ip TEXT,
    user_agent TEXT,
    metadata JSONB,
    success INTEGER,
    error_message TEXT
);

-- Migrations table (for tracking)
CREATE TABLE IF NOT EXISTS migrations (
    id SERIAL PRIMARY KEY,
    filename TEXT NOT NULL UNIQUE,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Initial Permissions Seed
INSERT INTO role_permissions (role, permission) VALUES 
('operator', 'admissions.view'),
('operator', 'admissions.create'),
('operator', 'admissions.edit'),
('operator', 'transfers.view'),
('operator', 'transfers.create'),
('operator', 'transfers.approve'),
('operator', 'employees.view'),
('operator', 'vacations.view'),
('operator', 'vacations.create'),
('operator', 'vacations.cancel'),
('operator', 'vacations.approve'),
('client', 'vacations.view'),
('client', 'vacations.create'),
('client', 'admissions.view'),
('client', 'admissions.create'),
('client', 'transfers.view'),
('client', 'transfers.create')
ON CONFLICT DO NOTHING;
