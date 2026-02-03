CREATE TABLE IF NOT EXISTS transfer_requests (
    id TEXT PRIMARY KEY,
    source_company_id TEXT NOT NULL,
    target_company_name TEXT NOT NULL,
    employee_name TEXT NOT NULL,
    transfer_date TEXT NOT NULL,
    observations TEXT,
    status TEXT NOT NULL DEFAULT 'SUBMITTED', -- SUBMITTED, CANCELLED
    protocol_number TEXT UNIQUE,
    created_by_user_id TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (source_company_id) REFERENCES client_companies(id),
    FOREIGN KEY (created_by_user_id) REFERENCES users(id)
);
