CREATE TABLE IF NOT EXISTS questor_syn_config (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    base_url TEXT NOT NULL DEFAULT 'http://localhost:8080',
    api_token TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS questor_syn_routines (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    action_name TEXT NOT NULL, -- _AActionName or NLI Name
    type TEXT NOT NULL CHECK (type IN ('PROCESS', 'QUERY', 'REPORT', 'IMPORT', 'EXPORT')),
    description TEXT,
    parameters_schema TEXT, -- JSON string for required parameters description
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default config
INSERT OR IGNORE INTO questor_syn_config (id, base_url) VALUES (1, 'http://localhost:8080');
