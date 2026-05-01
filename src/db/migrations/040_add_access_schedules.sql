CREATE TABLE IF NOT EXISTS access_schedules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    notification_minutes INTEGER DEFAULT 5,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS access_schedule_items (
    id TEXT PRIMARY KEY,
    schedule_id TEXT NOT NULL,
    day_of_week INTEGER NOT NULL, -- 0=Sunday, 1=Monday, ..., 6=Saturday
    start_time TEXT NOT NULL, -- HH:MM
    end_time TEXT NOT NULL, -- HH:MM
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (schedule_id) REFERENCES access_schedules(id) ON DELETE CASCADE
);

-- Check if column exists before adding (SQLite doesn't support IF NOT EXISTS for columns directly in standard syntax, but we can try-catch or just run it and ignore error if it fails in script)
-- For this file, I will just put the ALTER TABLE. If it fails, the script will handle or I'll fix.
ALTER TABLE users ADD COLUMN access_schedule_id TEXT REFERENCES access_schedules(id);
