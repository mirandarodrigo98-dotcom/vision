-- Add is_active column to societario_company_socios
ALTER TABLE societario_company_socios ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
