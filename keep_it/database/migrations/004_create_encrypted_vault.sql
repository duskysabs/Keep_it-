CREATE TABLE IF NOT EXISTS vault_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  kdf_salt BLOB NOT NULL CHECK (length(kdf_salt) = 16),
  kdf_n INTEGER NOT NULL CHECK (kdf_n >= 16384),
  kdf_r INTEGER NOT NULL CHECK (kdf_r >= 8),
  kdf_p INTEGER NOT NULL CHECK (kdf_p >= 1),
  wrapped_key_ciphertext BLOB NOT NULL CHECK (length(wrapped_key_ciphertext) = 32),
  wrapped_key_iv BLOB NOT NULL CHECK (length(wrapped_key_iv) = 12),
  wrapped_key_tag BLOB NOT NULL CHECK (length(wrapped_key_tag) = 16),
  auto_lock_minutes INTEGER NOT NULL DEFAULT 5
    CHECK (auto_lock_minutes IN (0, 1, 5, 15, 30, 60)),
  clear_clipboard_seconds INTEGER NOT NULL DEFAULT 30
    CHECK (clear_clipboard_seconds IN (0, 15, 30, 60)),
  backup_created_at TEXT
    CHECK (backup_created_at IS NULL OR (datetime(backup_created_at) IS NOT NULL AND backup_created_at LIKE '%Z')),
  password_changed_at TEXT NOT NULL
    DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  created_at TEXT NOT NULL
    DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL
    DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS vault_credentials (
  id TEXT PRIMARY KEY,
  encrypted_payload BLOB NOT NULL CHECK (length(encrypted_payload) > 0),
  encryption_iv BLOB NOT NULL CHECK (length(encryption_iv) = 12),
  authentication_tag BLOB NOT NULL CHECK (length(authentication_tag) = 16),
  created_at TEXT NOT NULL
    DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL
    DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_vault_credentials_recent
  ON vault_credentials (updated_at DESC);

CREATE TRIGGER IF NOT EXISTS vault_config_touch_updated_at
AFTER UPDATE OF kdf_salt, kdf_n, kdf_r, kdf_p, wrapped_key_ciphertext, wrapped_key_iv, wrapped_key_tag, auto_lock_minutes, clear_clipboard_seconds, backup_created_at, password_changed_at ON vault_config
FOR EACH ROW
BEGIN
  UPDATE vault_config
  SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS vault_credentials_touch_updated_at
AFTER UPDATE OF encrypted_payload, encryption_iv, authentication_tag ON vault_credentials
FOR EACH ROW
BEGIN
  UPDATE vault_credentials
  SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE id = NEW.id;
END;
