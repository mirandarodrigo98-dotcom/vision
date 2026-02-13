
-- Add account_id to enuves_transactions
ALTER TABLE enuves_transactions ADD COLUMN IF NOT EXISTS account_id TEXT REFERENCES enuves_accounts(id) ON DELETE SET NULL;
