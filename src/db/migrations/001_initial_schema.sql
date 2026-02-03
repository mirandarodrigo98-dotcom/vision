CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    role TEXT NOT NULL CHECK(role IN ('admin', 'client_user')),
    password_hash TEXT,
    password_temporary INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    deleted_at TEXT,
    last_login_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS client_companies (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    razao_social TEXT,
    cnpj TEXT UNIQUE NOT NULL,
    telefone TEXT,
    email_contato TEXT,
    is_active INTEGER DEFAULT 1,
    deleted_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_companies (
    user_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    PRIMARY KEY (user_id, company_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (company_id) REFERENCES client_companies(id)
);

CREATE TABLE IF NOT EXISTS admin_allowed_emails (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS otp_tokens (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    used_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    last_seen_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
);

CREATE TABLE IF NOT EXISTS admission_requests (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    created_by_user_id TEXT NOT NULL,
    employee_full_name TEXT NOT NULL,
    education_level TEXT,
    admission_date TEXT,
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
    submitted_at TEXT,
    emailed_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (company_id) REFERENCES client_companies(id),
    FOREIGN KEY (created_by_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS admission_attachments (
    id TEXT PRIMARY KEY,
    admission_id TEXT NOT NULL,
    original_name TEXT,
    mime_type TEXT,
    size_bytes INTEGER,
    storage_path TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (admission_id) REFERENCES admission_requests(id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    timestamp TEXT DEFAULT (datetime('now')),
    actor_user_id TEXT,
    actor_email TEXT,
    role TEXT,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    ip TEXT,
    user_agent TEXT,
    metadata TEXT, -- JSON
    success INTEGER,
    error_message TEXT
);
