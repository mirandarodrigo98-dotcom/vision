CREATE TABLE IF NOT EXISTS ir_declarations (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    year TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    type TEXT NOT NULL,
    company_id TEXT REFERENCES client_companies(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'Não Iniciado',
    is_received BOOLEAN DEFAULT FALSE,
    send_messages BOOLEAN DEFAULT FALSE,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ir_interactions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    declaration_id TEXT NOT NULL REFERENCES ir_declarations(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'status_change', 'comment'
    content TEXT,
    old_status TEXT,
    new_status TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
