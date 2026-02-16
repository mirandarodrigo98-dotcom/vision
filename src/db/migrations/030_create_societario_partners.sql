CREATE TABLE IF NOT EXISTS societario_socios (
  id TEXT PRIMARY KEY,
  cpf TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  data_nascimento TEXT,
  rg TEXT,
  cnh TEXT,
  cep TEXT,
  logradouro_tipo TEXT,
  logradouro TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  municipio TEXT,
  uf TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS societario_socio_history (
  id TEXT PRIMARY KEY,
  socio_id TEXT NOT NULL,
  cpf TEXT,
  nome TEXT,
  data_nascimento TEXT,
  rg TEXT,
  cnh TEXT,
  cep TEXT,
  logradouro_tipo TEXT,
  logradouro TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  municipio TEXT,
  uf TEXT,
  snapshot_at TEXT DEFAULT (datetime('now')),
  source TEXT,
  FOREIGN KEY (socio_id) REFERENCES societario_socios(id)
);

CREATE TABLE IF NOT EXISTS societario_company_socios (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  socio_id TEXT NOT NULL,
  participacao_percent REAL NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (company_id) REFERENCES client_companies(id),
  FOREIGN KEY (socio_id) REFERENCES societario_socios(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_societario_company_socios_unique
ON societario_company_socios (company_id, socio_id);

CREATE TABLE IF NOT EXISTS societario_company_history (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  code TEXT,
  nome TEXT,
  razao_social TEXT,
  cnpj TEXT,
  telefone TEXT,
  email_contato TEXT,
  address_type TEXT,
  address_street TEXT,
  address_number TEXT,
  address_complement TEXT,
  address_zip_code TEXT,
  address_neighborhood TEXT,
  municipio TEXT,
  uf TEXT,
  data_abertura TEXT,
  status TEXT,
  capital_social_centavos INTEGER,
  snapshot_at TEXT DEFAULT (datetime('now')),
  source TEXT,
  FOREIGN KEY (company_id) REFERENCES client_companies(id)
);
