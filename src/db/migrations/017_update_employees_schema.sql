-- Up Migration
ALTER TABLE employees ADD COLUMN dismissal_date TEXT;
ALTER TABLE employees ADD COLUMN transfer_date TEXT;
-- Update existing status to 'Admitido' if it is default 'ACTIVE' or NULL
UPDATE employees SET status = 'Admitido' WHERE status = 'ACTIVE' OR status IS NULL;
