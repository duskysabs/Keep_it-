import sqlite3
import unittest
from pathlib import Path


MIGRATION = Path(__file__).parents[1] / "migrations" / "004_create_encrypted_vault.sql"


class VaultSchemaTests(unittest.TestCase):
    def setUp(self):
        self.database = sqlite3.connect(":memory:")
        self.database.executescript(MIGRATION.read_text(encoding="utf-8"))

    def tearDown(self):
        self.database.close()

    def insert_config(self):
        self.database.execute(
            """INSERT INTO vault_config
               (id, kdf_salt, kdf_n, kdf_r, kdf_p, wrapped_key_ciphertext, wrapped_key_iv, wrapped_key_tag)
               VALUES (1, ?, 32768, 8, 3, ?, ?, ?)""",
            (bytes(16), bytes(32), bytes(12), bytes(16)),
        )

    def test_credential_table_contains_no_plaintext_fields(self):
        columns = [row[1] for row in self.database.execute("PRAGMA table_info(vault_credentials)")]
        self.assertEqual(
            columns,
            ["id", "encrypted_payload", "encryption_iv", "authentication_tag", "created_at", "updated_at"],
        )
        for forbidden in ("name", "username", "password", "url", "notes"):
            self.assertNotIn(forbidden, columns)

    def test_config_stores_wrapped_key_and_independent_password_timestamp(self):
        self.insert_config()
        row = self.database.execute(
            "SELECT length(kdf_salt), length(wrapped_key_ciphertext), length(wrapped_key_iv), length(wrapped_key_tag), password_changed_at FROM vault_config"
        ).fetchone()
        self.assertEqual(row[:4], (16, 32, 12, 16))
        self.assertTrue(row[4].endswith("Z"))

    def test_rejects_invalid_crypto_lengths_and_settings(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.database.execute(
                """INSERT INTO vault_config
                   (id, kdf_salt, kdf_n, kdf_r, kdf_p, wrapped_key_ciphertext, wrapped_key_iv, wrapped_key_tag)
                   VALUES (1, ?, 32768, 8, 3, ?, ?, ?)""",
                (bytes(15), bytes(32), bytes(12), bytes(16)),
            )
        self.insert_config()
        with self.assertRaises(sqlite3.IntegrityError):
            self.database.execute("UPDATE vault_config SET auto_lock_minutes = 2 WHERE id = 1")
        with self.assertRaises(sqlite3.IntegrityError):
            self.database.execute(
                "INSERT INTO vault_credentials (id, encrypted_payload, encryption_iv, authentication_tag) VALUES (?, ?, ?, ?)",
                ("bad", b"ciphertext", bytes(11), bytes(16)),
            )

    def test_refreshes_credential_timestamp(self):
        self.database.execute(
            "INSERT INTO vault_credentials (id, encrypted_payload, encryption_iv, authentication_tag) VALUES (?, ?, ?, ?)",
            ("credential", b"ciphertext", bytes(12), bytes(16)),
        )
        self.database.execute("UPDATE vault_credentials SET updated_at = ? WHERE id = ?", ("2000-01-01T00:00:00.000Z", "credential"))
        self.database.execute("UPDATE vault_credentials SET encrypted_payload = ? WHERE id = ?", (b"updated", "credential"))
        updated_at = self.database.execute("SELECT updated_at FROM vault_credentials WHERE id = ?", ("credential",)).fetchone()[0]
        self.assertNotEqual(updated_at, "2000-01-01T00:00:00.000Z")


if __name__ == "__main__":
    unittest.main()
