CREATE TABLE IF NOT EXISTS enuves_transactions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  category_id TEXT NOT NULL,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  value DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES enuves_categories(id) ON DELETE CASCADE
);
