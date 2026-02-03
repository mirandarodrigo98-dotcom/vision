CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    code TEXT,
    name TEXT NOT NULL,
    admission_date TEXT,
    birth_date TEXT,
    gender TEXT,
    pis TEXT,
    cpf TEXT UNIQUE,
    esocial_registration TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (company_id) REFERENCES client_companies(id)
);
