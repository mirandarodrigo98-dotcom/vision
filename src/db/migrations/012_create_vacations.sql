CREATE TABLE IF NOT EXISTS vacations (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    employee_id TEXT NOT NULL,
    start_date TEXT NOT NULL,
    days_quantity INTEGER NOT NULL,
    allowance_days INTEGER DEFAULT 0,
    return_date TEXT NOT NULL,
    observations TEXT,
    status TEXT NOT NULL DEFAULT 'SUBMITTED', -- SUBMITTED, COMPLETED, CANCELLED
    protocol_number TEXT UNIQUE,
    created_by_user_id TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (company_id) REFERENCES client_companies(id),
    FOREIGN KEY (employee_id) REFERENCES employees(id),
    FOREIGN KEY (created_by_user_id) REFERENCES users(id)
);

-- Permissões iniciais para Férias
INSERT OR IGNORE INTO role_permissions (role, permission) VALUES 
('operator', 'vacations.view'),
('operator', 'vacations.create'),
('operator', 'vacations.cancel'),
('operator', 'vacations.approve'),
('client', 'vacations.view'),
('client', 'vacations.create');
