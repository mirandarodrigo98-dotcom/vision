CREATE TABLE IF NOT EXISTS transport_vouchers (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES client_companies(id) ON DELETE CASCADE,
    reference_month INTEGER NOT NULL,
    reference_year INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT', -- DRAFT, PENDING, COMPLETED, CANCELLED
    notes TEXT,
    created_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transport_voucher_employees (
    id TEXT PRIMARY KEY,
    transport_voucher_id TEXT NOT NULL REFERENCES transport_vouchers(id) ON DELETE CASCADE,
    employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 0,
    value NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    line TEXT,
    observation TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);