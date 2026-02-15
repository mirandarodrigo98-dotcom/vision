-- Societário module: profiles and audit logs
CREATE TABLE IF NOT EXISTS societario_profiles (
    company_id TEXT PRIMARY KEY,
    data_constituicao TEXT,
    responsavel_legal TEXT,
    capital_social_centavos INTEGER,
    email_institucional TEXT,
    endereco TEXT,
    telefone TEXT,
    status TEXT DEFAULT 'EM_REGISTRO' CHECK(status IN ('EM_REGISTRO','ATIVA','INATIVA')),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (company_id) REFERENCES client_companies(id)
);

CREATE TABLE IF NOT EXISTS societario_logs (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    tipo_evento TEXT NOT NULL,
    campo_alterado TEXT,
    valor_anterior TEXT,
    valor_novo TEXT,
    motivo TEXT,
    actor_user_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (company_id) REFERENCES client_companies(id),
    FOREIGN KEY (actor_user_id) REFERENCES users(id)
);
