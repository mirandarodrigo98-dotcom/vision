CREATE TABLE IF NOT EXISTS user_restricted_companies (
    user_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    PRIMARY KEY (user_id, company_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES client_companies(id) ON DELETE CASCADE
);