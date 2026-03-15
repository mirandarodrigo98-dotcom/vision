-- Add is_active column to eklesia_categories
ALTER TABLE eklesia_categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Add is_active column to eklesia_accounts
ALTER TABLE eklesia_accounts ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
