CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  title_json TEXT NOT NULL
    CHECK (json_valid(title_json) AND json_extract(title_json, '$.type') = 'doc'),
  title_text TEXT NOT NULL DEFAULT '',
  content_json TEXT NOT NULL
    CHECK (json_valid(content_json) AND json_extract(content_json, '$.type') = 'doc'),
  content_text TEXT NOT NULL DEFAULT '',
  folder TEXT NOT NULL DEFAULT 'Personal'
    CHECK (folder IN ('Personal', 'Work', 'School')),
  is_pinned INTEGER NOT NULL DEFAULT 0
    CHECK (is_pinned IN (0, 1)),
  archived_at TEXT
    CHECK (
      archived_at IS NULL
      OR (datetime(archived_at) IS NOT NULL AND archived_at LIKE '%Z')
    ),
  created_at TEXT NOT NULL
    DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL
    DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_notes_active_recent
  ON notes (is_pinned DESC, updated_at DESC)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notes_folder
  ON notes (folder, updated_at DESC)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notes_archive
  ON notes (archived_at DESC)
  WHERE archived_at IS NOT NULL;

CREATE TRIGGER IF NOT EXISTS notes_touch_updated_at
AFTER UPDATE OF title_json, title_text, content_json, content_text, folder, is_pinned, archived_at ON notes
FOR EACH ROW
BEGIN
  UPDATE notes
  SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE id = NEW.id;
END;
