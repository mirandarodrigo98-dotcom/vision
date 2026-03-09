CREATE TABLE IF NOT EXISTS questor_zen_config (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    base_url TEXT NOT NULL DEFAULT 'https://app.questorzen.com.br',
    api_token TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO questor_zen_config (id, base_url) VALUES (1, 'https://app.questorzen.com.br');
