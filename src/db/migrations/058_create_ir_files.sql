CREATE TABLE IF NOT EXISTS ir_files (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    declaration_id TEXT NOT NULL REFERENCES ir_declarations(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_key TEXT NOT NULL,
    file_url TEXT NOT NULL,
    uploaded_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
