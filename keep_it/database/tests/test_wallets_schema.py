import sqlite3
import unittest
from pathlib import Path


MIGRATION = Path(__file__).parents[1] / "migrations" / "003_create_wallets_and_transactions.sql"


class WalletsSchemaTests(unittest.TestCase):
    def setUp(self):
        self.database = sqlite3.connect(":memory:")
        self.database.execute("PRAGMA foreign_keys = ON")
        self.database.executescript(MIGRATION.read_text(encoding="utf-8"))
        self.database.execute(
            "INSERT INTO wallets (id, name, type, starting_balance_centavos) VALUES (?, ?, ?, ?)",
            ("bank", "BPI Savings", "Bank", 100000),
        )
        self.database.execute(
            "INSERT INTO wallets (id, name, type, starting_balance_centavos) VALUES (?, ?, ?, ?)",
            ("cash", "Cash", "Cash", 0),
        )

    def tearDown(self):
        self.database.close()

    def test_creates_expected_wallet_columns(self):
        columns = [row[1] for row in self.database.execute("PRAGMA table_info(wallets)")]
        self.assertEqual(columns, ["id", "name", "type", "starting_balance_centavos", "created_at", "updated_at"])

    def test_creates_expected_transaction_columns(self):
        columns = [row[1] for row in self.database.execute("PRAGMA table_info(transactions)")]
        self.assertEqual(
            columns,
            ["id", "wallet_id", "target_wallet_id", "type", "amount_centavos", "category", "payee", "transaction_date", "note", "created_at", "updated_at"],
        )

    def test_accepts_income_expense_and_transfer_records(self):
        records = [
            ("income", "bank", None, "income", 50000, "Salary", "Payday"),
            ("expense", "cash", None, "expense", 1250, "Food", "Lunch"),
            ("transfer", "bank", "cash", "transfer", 10000, "Transfer", "Withdrawal"),
        ]
        for record_id, source, target, kind, amount, category, payee in records:
            self.database.execute(
                "INSERT INTO transactions (id, wallet_id, target_wallet_id, type, amount_centavos, category, payee, transaction_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (record_id, source, target, kind, amount, category, payee, "2026-08-21"),
            )
        self.assertEqual(self.database.execute("SELECT COUNT(*) FROM transactions").fetchone()[0], 3)

    def test_rejects_invalid_wallet_types_and_money(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.database.execute("INSERT INTO wallets (id, name, type) VALUES (?, ?, ?)", ("bad", "Bad", "Crypto"))
        with self.assertRaises(sqlite3.IntegrityError):
            self.database.execute(
                "INSERT INTO transactions (id, wallet_id, type, amount_centavos, category, payee, transaction_date) VALUES (?, ?, ?, ?, ?, ?, ?)",
                ("bad-amount", "cash", "expense", 0, "Food", "Lunch", "2026-08-21"),
            )

    def test_rejects_invalid_transfer_relationships(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.database.execute(
                "INSERT INTO transactions (id, wallet_id, target_wallet_id, type, amount_centavos, category, payee, transaction_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                ("same-wallet", "bank", "bank", "transfer", 1000, "Transfer", "Invalid", "2026-08-21"),
            )
        with self.assertRaises(sqlite3.IntegrityError):
            self.database.execute(
                "INSERT INTO transactions (id, wallet_id, target_wallet_id, type, amount_centavos, category, payee, transaction_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                ("target-expense", "bank", "cash", "expense", 1000, "Food", "Invalid", "2026-08-21"),
            )

    def test_cascades_transactions_when_either_wallet_is_deleted(self):
        self.database.execute(
            "INSERT INTO transactions (id, wallet_id, target_wallet_id, type, amount_centavos, category, payee, transaction_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            ("transfer", "bank", "cash", "transfer", 1000, "Transfer", "Withdrawal", "2026-08-21"),
        )
        self.database.execute("DELETE FROM wallets WHERE id = ?", ("cash",))
        self.assertIsNone(self.database.execute("SELECT id FROM transactions WHERE id = ?", ("transfer",)).fetchone())

    def test_refreshes_updated_timestamps(self):
        self.database.execute("UPDATE wallets SET updated_at = ? WHERE id = ?", ("2000-01-01T00:00:00.000Z", "bank"))
        self.database.execute("UPDATE wallets SET name = ? WHERE id = ?", ("Updated bank", "bank"))
        updated_at = self.database.execute("SELECT updated_at FROM wallets WHERE id = ?", ("bank",)).fetchone()[0]
        self.assertNotEqual(updated_at, "2000-01-01T00:00:00.000Z")
        self.assertTrue(updated_at.endswith("Z"))


if __name__ == "__main__":
    unittest.main()
