-- Create ticket categories table
CREATE TABLE IF NOT EXISTS ticket_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default categories
INSERT OR IGNORE INTO ticket_categories (id, name) VALUES 
('cat_software', 'Software'),
('cat_hardware', 'Hardware'),
('cat_network', 'Rede'),
('cat_access', 'Acesso'),
('cat_other', 'Outro');

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id) WHERE read = 0;
