ALTER TABLE employees ADD COLUMN is_active INTEGER DEFAULT 1;
UPDATE employees SET is_active = 1;
