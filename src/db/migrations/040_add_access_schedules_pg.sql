CREATE TABLE IF NOT EXISTS access_schedules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    notification_minutes INTEGER DEFAULT 5,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS access_schedule_items (
    id TEXT PRIMARY KEY,
    schedule_id TEXT NOT NULL,
    day_of_week INTEGER NOT NULL, -- 0=Sunday, 1=Monday, ..., 6=Saturday
    start_time TEXT NOT NULL, -- HH:MM
    end_time TEXT NOT NULL, -- HH:MM
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (schedule_id) REFERENCES access_schedules(id) ON DELETE CASCADE
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS access_schedule_id TEXT REFERENCES access_schedules(id);
