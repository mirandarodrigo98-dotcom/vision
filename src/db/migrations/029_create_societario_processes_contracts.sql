-- Societário: processos e contratos
CREATE TABLE IF NOT EXISTS societario_contracts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (created_by_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS societario_processes (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('CONSTITUICAO','ALTERACAO','BAIXA')),
  status TEXT NOT NULL DEFAULT 'NAO_INICIADO' CHECK(status IN ('NAO_INICIADO','EM_ANDAMENTO','CONCLUIDO')),
  company_id TEXT, -- nullable for pre-CNPJ constituição
  razao_social TEXT,
  nome_fantasia TEXT,
  capital_social_centavos INTEGER,
  socio_administrador TEXT,
  objeto_social TEXT,
  telefone TEXT,
  email TEXT,
  observacao TEXT,
  natureza_juridica TEXT,
  porte TEXT,
  tributacao TEXT,
  inscricao_imobiliaria TEXT,
  compl_cep TEXT,
  compl_logradouro_tipo TEXT,
  compl_logradouro TEXT,
  compl_numero TEXT,
  compl_complemento TEXT,
  compl_bairro TEXT,
  compl_municipio TEXT,
  compl_uf TEXT,
  created_by_user_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (company_id) REFERENCES client_companies(id),
  FOREIGN KEY (created_by_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS societario_process_cnaes (
  id TEXT PRIMARY KEY,
  process_id TEXT NOT NULL,
  cnae_code TEXT NOT NULL,
  cnae_desc TEXT,
  FOREIGN KEY (process_id) REFERENCES societario_processes(id)
);

CREATE TABLE IF NOT EXISTS societario_process_socios (
  id TEXT PRIMARY KEY,
  process_id TEXT NOT NULL,
  nome TEXT,
  cpf TEXT,
  rg TEXT,
  cnh TEXT,
  participacao_percent REAL,
  cep TEXT,
  logradouro_tipo TEXT,
  logradouro TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  municipio TEXT,
  uf TEXT,
  FOREIGN KEY (process_id) REFERENCES societario_processes(id)
);
