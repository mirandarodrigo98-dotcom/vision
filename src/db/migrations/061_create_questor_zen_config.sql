CREATE TABLE IF NOT EXISTS questor_zen_config (
    id INTEGER PRIMARY KEY CHECK (id = 1), -- Singleton
    client_domain TEXT NOT NULL,
    access_token TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
