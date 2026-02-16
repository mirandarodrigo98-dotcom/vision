-- Users
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
    created_at TIMESTAMP DEFAULT (NOW() - INTERVAL '3 hours'),
    updated_at TIMESTAMP DEFAULT (NOW() - INTERVAL '3 hours')
);

-- Client Companies
CREATE TABLE IF NOT EXISTS client_companies (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    razao_social TEXT,
    cnpj TEXT UNIQUE NOT NULL,
    telefone TEXT,
    email_contato TEXT,
    code TEXT UNIQUE,
    filial TEXT,
    municipio TEXT,
    uf TEXT,
    data_abertura TEXT,
    capital_social_centavos INTEGER,
    address_type TEXT,
    address_street TEXT,
    address_number TEXT,
    address_complement TEXT,
    address_zip_code TEXT,
    is_active INTEGER DEFAULT 1,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT (NOW() - INTERVAL '3 hours'),
    updated_at TIMESTAMP DEFAULT (NOW() - INTERVAL '3 hours')
);

-- User Companies (Many-to-Many)
CREATE TABLE IF NOT EXISTS user_companies (
    user_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    PRIMARY KEY (user_id, company_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (company_id) REFERENCES client_companies(id)
);

-- Employees
CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    code TEXT,
    name TEXT NOT NULL,
    admission_date DATE,
    birth_date DATE,
    gender TEXT,
    pis TEXT,
    cpf TEXT,
    esocial_registration TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT (NOW() - INTERVAL '3 hours'),
    updated_at TIMESTAMP DEFAULT (NOW() - INTERVAL '3 hours'),
    FOREIGN KEY (company_id) REFERENCES client_companies(id)
);

-- Admin Allowed Emails
CREATE TABLE IF NOT EXISTS admin_allowed_emails (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT (NOW() - INTERVAL '3 hours')
);

-- OTP Tokens
CREATE TABLE IF NOT EXISTS otp_tokens (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT (NOW() - INTERVAL '3 hours')
);

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT (NOW() - INTERVAL '3 hours'),
    last_seen_at TIMESTAMP DEFAULT (NOW() - INTERVAL '3 hours'),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Settings
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
);

-- Role Permissions
CREATE TABLE IF NOT EXISTS role_permissions (
    role TEXT NOT NULL,
    permission TEXT NOT NULL,
    PRIMARY KEY (role, permission)
);

-- Admission Requests
CREATE TABLE IF NOT EXISTS admission_requests (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    created_by_user_id TEXT NOT NULL,
    employee_full_name TEXT NOT NULL,
    education_level TEXT,
    admission_date DATE,
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
    general_observations TEXT,
    status TEXT NOT NULL DEFAULT 'DRAFT', -- DRAFT, SUBMITTED, EMAILED, ERROR
    protocol_number TEXT UNIQUE,
    cpf TEXT,
    birth_date DATE,
    mother_name TEXT,
    email TEXT,
    phone TEXT,
    marital_status TEXT,
    gender TEXT,
    race_color TEXT,
    zip_code TEXT,
    address_street TEXT,
    address_number TEXT,
    address_complement TEXT,
    address_neighborhood TEXT,
    address_city TEXT,
    address_state TEXT,
    cbo TEXT,
    contract_type TEXT,
    submitted_at TIMESTAMP,
    emailed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT (NOW() - INTERVAL '3 hours'),
    updated_at TIMESTAMP DEFAULT (NOW() - INTERVAL '3 hours'),
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
    created_at TIMESTAMP DEFAULT (NOW() - INTERVAL '3 hours'),
    FOREIGN KEY (admission_id) REFERENCES admission_requests(id)
);

-- Transfer Requests
CREATE TABLE IF NOT EXISTS transfer_requests (
    id TEXT PRIMARY KEY,
    source_company_id TEXT NOT NULL,
    target_company_id TEXT NOT NULL,
    target_company_name TEXT,
    employee_name TEXT NOT NULL,
    transfer_date DATE,
    observations TEXT,
    status TEXT NOT NULL DEFAULT 'SUBMITTED',
    protocol_number TEXT UNIQUE,
    created_by_user_id TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT (NOW() - INTERVAL '3 hours'),
    updated_at TIMESTAMP DEFAULT (NOW() - INTERVAL '3 hours'),
    FOREIGN KEY (source_company_id) REFERENCES client_companies(id),
    FOREIGN KEY (created_by_user_id) REFERENCES users(id)
);

-- Vacations
CREATE TABLE IF NOT EXISTS vacations (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    employee_id TEXT NOT NULL,
    start_date DATE NOT NULL,
    days_quantity INTEGER NOT NULL,
    allowance_days INTEGER,
    return_date DATE,
    observations TEXT,
    status TEXT NOT NULL DEFAULT 'SUBMITTED',
    protocol_number TEXT UNIQUE,
    created_by_user_id TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT (NOW() - INTERVAL '3 hours'),
    updated_at TIMESTAMP DEFAULT (NOW() - INTERVAL '3 hours'),
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
    dismissal_date DATE NOT NULL,
    observations TEXT,
    status TEXT NOT NULL DEFAULT 'SUBMITTED',
    protocol_number TEXT UNIQUE,
    created_by_user_id TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT (NOW() - INTERVAL '3 hours'),
    updated_at TIMESTAMP DEFAULT (NOW() - INTERVAL '3 hours'),
    FOREIGN KEY (company_id) REFERENCES client_companies(id),
    FOREIGN KEY (employee_id) REFERENCES employees(id),
    FOREIGN KEY (created_by_user_id) REFERENCES users(id)
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT (NOW() - INTERVAL '3 hours'),
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
