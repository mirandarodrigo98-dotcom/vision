-- Increase description column size to support long category names
ALTER TABLE eklesia_categories ALTER COLUMN description TYPE TEXT;
