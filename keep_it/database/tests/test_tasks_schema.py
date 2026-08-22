import sqlite3
import unittest
from pathlib import Path


MIGRATION = Path(__file__).parents[1] / "migrations" / "001_create_tasks.sql"


class TasksSchemaTests(unittest.TestCase):
    def setUp(self):
        self.database = sqlite3.connect(":memory:")
        self.database.executescript(MIGRATION.read_text(encoding="utf-8"))

    def tearDown(self):
        self.database.close()

    def test_creates_expected_columns(self):
        columns = [row[1] for row in self.database.execute("PRAGMA table_info(tasks)")]
        self.assertEqual(
            columns,
            ["id", "title", "due_date", "completed_at", "created_at", "updated_at"],
        )

    def test_accepts_a_valid_task(self):
        self.database.execute(
            "INSERT INTO tasks (id, title, due_date) VALUES (?, ?, ?)",
            ("task-1", "Review task schema", "2026-08-24"),
        )
        task = self.database.execute(
            "SELECT title, due_date, completed_at FROM tasks WHERE id = ?",
            ("task-1",),
        ).fetchone()
        self.assertEqual(task, ("Review task schema", "2026-08-24", None))

    def test_rejects_blank_titles(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.database.execute(
                "INSERT INTO tasks (id, title) VALUES (?, ?)",
                ("blank-task", "   "),
            )

    def test_rejects_invalid_due_dates(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.database.execute(
                "INSERT INTO tasks (id, title, due_date) VALUES (?, ?, ?)",
                ("bad-date", "Invalid date", "2026-99-99"),
            )

    def test_rejects_invalid_completion_timestamps(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.database.execute(
                "INSERT INTO tasks (id, title, completed_at) VALUES (?, ?, ?)",
                ("bad-completion", "Invalid completion", "not-a-timestamp"),
            )

    def test_refreshes_updated_at_after_editing_task_data(self):
        self.database.execute(
            "INSERT INTO tasks (id, title) VALUES (?, ?)",
            ("task-1", "Original title"),
        )
        self.database.execute(
            "UPDATE tasks SET updated_at = ? WHERE id = ?",
            ("2000-01-01T00:00:00.000Z", "task-1"),
        )
        self.database.execute(
            "UPDATE tasks SET title = ? WHERE id = ?",
            ("Updated title", "task-1"),
        )
        updated_at = self.database.execute(
            "SELECT updated_at FROM tasks WHERE id = ?",
            ("task-1",),
        ).fetchone()[0]
        self.assertNotEqual(updated_at, "2000-01-01T00:00:00.000Z")
        self.assertTrue(updated_at.endswith("Z"))


if __name__ == "__main__":
    unittest.main()
