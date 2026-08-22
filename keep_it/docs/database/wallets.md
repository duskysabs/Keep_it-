# Wallet and transaction storage

Wallets and transactions are stored locally in the desktop SQLite database by migration `003_create_wallets_and_transactions.sql`.

## Wallets

Each wallet contains:

- `id`: stable UUID used by transactions.
- `name`: user-facing account name.
- `type`: Cash, E-wallet, Bank, or Debit card.
- `starting_balance_centavos`: the balance before logged transactions.
- `created_at` and `updated_at`: UTC audit timestamps.

Money is stored as integer Philippine centavos. For example, `1234.56` pesos is stored as `123456`. This avoids floating-point rounding errors in persisted balances.

## Transactions

Each transaction contains:

- `wallet_id`: the wallet receiving income or paying an expense; for a transfer, the source wallet.
- `target_wallet_id`: the destination wallet for transfers and `NULL` otherwise.
- `type`: income, expense, or transfer.
- `amount_centavos`: a positive integer amount.
- `category`, `payee`, `transaction_date`, and an optional `note`.
- `created_at` and `updated_at`: UTC audit timestamps.

A transfer must connect two different existing wallets. SQLite foreign keys keep those relationships valid. Deleting either wallet cascades to every transaction connected to it, matching the confirmation shown by the UI.

## Runtime flow

The Wallet page and Dashboard read from `WalletContext`. In Electron, its client calls the narrow `window.keepIt.wallets` preload bridge, which invokes the SQLite repository in the main process. In a normal browser-only development session, the same interface uses an in-memory fallback with starter data.

The renderer never receives direct filesystem or SQLite access.
