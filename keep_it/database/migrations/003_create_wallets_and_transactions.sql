PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS wallets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
    CHECK (length(trim(name)) BETWEEN 1 AND 120),
  type TEXT NOT NULL
    CHECK (type IN ('Cash', 'E-wallet', 'Bank', 'Debit card')),
  starting_balance_centavos INTEGER NOT NULL DEFAULT 0
    CHECK (abs(starting_balance_centavos) <= 9000000000000000),
  created_at TEXT NOT NULL
    DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL
    DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  wallet_id TEXT NOT NULL
    REFERENCES wallets(id) ON DELETE CASCADE,
  target_wallet_id TEXT
    REFERENCES wallets(id) ON DELETE CASCADE,
  type TEXT NOT NULL
    CHECK (type IN ('income', 'expense', 'transfer')),
  amount_centavos INTEGER NOT NULL
    CHECK (amount_centavos > 0 AND amount_centavos <= 9000000000000000),
  category TEXT NOT NULL
    CHECK (length(trim(category)) BETWEEN 1 AND 80),
  payee TEXT NOT NULL
    CHECK (length(trim(payee)) BETWEEN 1 AND 200),
  transaction_date TEXT NOT NULL
    CHECK (
      length(transaction_date) = 10
      AND date(transaction_date) IS NOT NULL
      AND transaction_date = date(transaction_date)
    ),
  note TEXT NOT NULL DEFAULT ''
    CHECK (length(note) <= 2000),
  created_at TEXT NOT NULL
    DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL
    DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (
    (
      type = 'transfer'
      AND target_wallet_id IS NOT NULL
      AND target_wallet_id <> wallet_id
      AND category = 'Transfer'
    )
    OR (
      type IN ('income', 'expense')
      AND target_wallet_id IS NULL
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_transactions_date
  ON transactions (transaction_date DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_wallet_date
  ON transactions (wallet_id, transaction_date DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_target_wallet_date
  ON transactions (target_wallet_id, transaction_date DESC)
  WHERE target_wallet_id IS NOT NULL;

CREATE TRIGGER IF NOT EXISTS wallets_touch_updated_at
AFTER UPDATE OF name, type, starting_balance_centavos ON wallets
FOR EACH ROW
BEGIN
  UPDATE wallets
  SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS transactions_touch_updated_at
AFTER UPDATE OF wallet_id, target_wallet_id, type, amount_centavos, category, payee, transaction_date, note ON transactions
FOR EACH ROW
BEGIN
  UPDATE transactions
  SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE id = NEW.id;
END;
