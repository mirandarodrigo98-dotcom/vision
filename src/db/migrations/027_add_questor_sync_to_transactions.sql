ALTER TABLE enuves_transactions ADD COLUMN IF NOT EXISTS questor_synced_at TIMESTAMP;
ALTER TABLE enuves_transactions ADD COLUMN IF NOT EXISTS questor_sync_id TEXT;
ALTER TABLE enuves_transactions ADD COLUMN IF NOT EXISTS questor_sync_error TEXT;
