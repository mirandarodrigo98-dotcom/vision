CREATE TABLE IF NOT EXISTS role_permissions (
    role TEXT NOT NULL, -- 'operator', 'client'
    permission TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (role, permission)
);

-- Seed initial permissions (optional, logic will handle defaults usually)
-- Inserting default permissions for operator
INSERT OR IGNORE INTO role_permissions (role, permission) VALUES 
('operator', 'admissions.view'),
('operator', 'admissions.create'),
('operator', 'admissions.edit'),
('operator', 'transfers.view'),
('operator', 'transfers.create'),
('operator', 'transfers.approve'),
('operator', 'employees.view');

-- Inserting default permissions for client
INSERT OR IGNORE INTO role_permissions (role, permission) VALUES 
('client', 'admissions.view'),
('client', 'admissions.create'),
('client', 'transfers.view'),
('client', 'transfers.create');
