CREATE TABLE IF NOT EXISTS dismissals (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    employee_id TEXT NOT NULL,
    notice_type TEXT NOT NULL,
    dismissal_cause TEXT NOT NULL,
    dismissal_date TEXT NOT NULL,
    observations TEXT,
    status TEXT NOT NULL DEFAULT 'SUBMITTED',
    protocol_number TEXT UNIQUE,
    created_by_user_id TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (company_id) REFERENCES client_companies(id),
    FOREIGN KEY (employee_id) REFERENCES employees(id),
    FOREIGN KEY (created_by_user_id) REFERENCES users(id)
);
