PRAGMA foreign_keys=OFF;

CREATE TABLE users_new (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    role TEXT NOT NULL CHECK(role IN ('admin', 'operator', 'client_user')),
    password_hash TEXT,
    password_temporary INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    deleted_at TEXT,
    last_login_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

INSERT INTO users_new SELECT * FROM users;

DROP TABLE users;

ALTER TABLE users_new RENAME TO users;

PRAGMA foreign_keys=ON;
