-- Create ticket attachments table
CREATE TABLE IF NOT EXISTS ticket_attachments (
    id TEXT PRIMARY KEY,
    ticket_id TEXT NOT NULL,
    file_key TEXT NOT NULL,
    original_name TEXT NOT NULL,
    content_type TEXT,
    size INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ticket_attachments_ticket_id ON ticket_attachments(ticket_id);
