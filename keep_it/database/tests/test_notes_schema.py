import sqlite3
import unittest
from pathlib import Path


MIGRATION = Path(__file__).parents[1] / "migrations" / "002_create_notes.sql"
EMPTY_DOCUMENT = '{"type":"doc","content":[{"type":"paragraph"}]}'


class NotesSchemaTests(unittest.TestCase):
    def setUp(self):
        self.database = sqlite3.connect(":memory:")
        self.database.executescript(MIGRATION.read_text(encoding="utf-8"))

    def tearDown(self):
        self.database.close()

    def test_creates_expected_columns(self):
        columns = [row[1] for row in self.database.execute("PRAGMA table_info(notes)")]
        self.assertEqual(
            columns,
            [
                "id", "title_json", "title_text", "content_json", "content_text",
                "folder", "is_pinned", "archived_at", "created_at", "updated_at",
            ],
        )

    def test_accepts_an_empty_draft(self):
        self.database.execute(
            "INSERT INTO notes (id, title_json, content_json) VALUES (?, ?, ?)",
            ("note-1", EMPTY_DOCUMENT, EMPTY_DOCUMENT),
        )
        note = self.database.execute(
            "SELECT title_text, content_text, folder, is_pinned, archived_at FROM notes WHERE id = ?",
            ("note-1",),
        ).fetchone()
        self.assertEqual(note, ("", "", "Personal", 0, None))

    def test_rejects_invalid_documents(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.database.execute(
                "INSERT INTO notes (id, title_json, content_json) VALUES (?, ?, ?)",
                ("bad-json", "not-json", EMPTY_DOCUMENT),
            )

    def test_rejects_unknown_folders_and_boolean_values(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.database.execute(
                "INSERT INTO notes (id, title_json, content_json, folder) VALUES (?, ?, ?, ?)",
                ("bad-folder", EMPTY_DOCUMENT, EMPTY_DOCUMENT, "Ideas"),
            )
        with self.assertRaises(sqlite3.IntegrityError):
            self.database.execute(
                "INSERT INTO notes (id, title_json, content_json, is_pinned) VALUES (?, ?, ?, ?)",
                ("bad-pin", EMPTY_DOCUMENT, EMPTY_DOCUMENT, 2),
            )

    def test_refreshes_updated_at_after_editing_note_data(self):
        self.database.execute(
            "INSERT INTO notes (id, title_json, content_json) VALUES (?, ?, ?)",
            ("note-1", EMPTY_DOCUMENT, EMPTY_DOCUMENT),
        )
        self.database.execute(
            "UPDATE notes SET updated_at = ? WHERE id = ?",
            ("2000-01-01T00:00:00.000Z", "note-1"),
        )
        self.database.execute(
            "UPDATE notes SET title_text = ? WHERE id = ?",
            ("Updated title", "note-1"),
        )
        updated_at = self.database.execute(
            "SELECT updated_at FROM notes WHERE id = ?",
            ("note-1",),
        ).fetchone()[0]
        self.assertNotEqual(updated_at, "2000-01-01T00:00:00.000Z")
        self.assertTrue(updated_at.endswith("Z"))


if __name__ == "__main__":
    unittest.main()
