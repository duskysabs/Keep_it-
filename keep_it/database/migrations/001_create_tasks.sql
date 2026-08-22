PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL
    CHECK (length(trim(title)) BETWEEN 1 AND 300),
  due_date TEXT
    CHECK (
      due_date IS NULL
      OR (
        length(due_date) = 10
        AND date(due_date) IS NOT NULL
        AND due_date = date(due_date)
      )
    ),
  completed_at TEXT
    CHECK (
      completed_at IS NULL
      OR (datetime(completed_at) IS NOT NULL AND completed_at LIKE '%Z')
    ),
  created_at TEXT NOT NULL
    DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL
    DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_tasks_active_due
  ON tasks (due_date, title COLLATE NOCASE)
  WHERE completed_at IS NULL AND due_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_completed
  ON tasks (completed_at DESC)
  WHERE completed_at IS NOT NULL;

CREATE TRIGGER IF NOT EXISTS tasks_touch_updated_at
AFTER UPDATE OF title, due_date, completed_at ON tasks
FOR EACH ROW
BEGIN
  UPDATE tasks
  SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE id = NEW.id;
END;
