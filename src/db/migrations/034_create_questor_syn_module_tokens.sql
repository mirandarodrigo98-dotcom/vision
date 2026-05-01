CREATE TABLE questor_syn_module_tokens (
    id TEXT PRIMARY KEY,
    module_key TEXT NOT NULL UNIQUE,
    module_name TEXT NOT NULL,
    token TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
