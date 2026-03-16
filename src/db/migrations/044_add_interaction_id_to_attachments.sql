ALTER TABLE ticket_attachments ADD COLUMN interaction_id TEXT;
CREATE INDEX IF NOT EXISTS idx_ticket_attachments_interaction ON ticket_attachments(interaction_id);
