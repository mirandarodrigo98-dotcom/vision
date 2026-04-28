CREATE TABLE IF NOT EXISTS leaves (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    employee_id TEXT NOT NULL,
    leave_type TEXT NOT NULL, -- sickness, maternity, accident, other
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    observations TEXT,
    status TEXT NOT NULL DEFAULT 'SUBMITTED', -- SUBMITTED, RECTIFIED, COMPLETED, CANCELLED
    protocol_number TEXT UNIQUE,
    created_by_user_id TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES client_companies(id),
    FOREIGN KEY (employee_id) REFERENCES employees(id),
    FOREIGN KEY (created_by_user_id) REFERENCES users(id)
);

-- Permissões iniciais para Afastamentos
INSERT OR IGNORE INTO role_permissions (role, permission) VALUES 
('operator', 'leaves.view'),
('operator', 'leaves.create'),
('operator', 'leaves.cancel'),
('operator', 'leaves.approve'),
('client_user', 'leaves.view'),
('client_user', 'leaves.create'),
('client_user', 'leaves.cancel');
