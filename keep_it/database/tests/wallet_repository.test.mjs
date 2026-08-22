import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";

import { createWalletRepository } from "../../src/data/wallets/walletRepository.js";

const migration = readFileSync(new URL("../migrations/003_create_wallets_and_transactions.sql", import.meta.url), "utf8");

const createHarness = () => {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON;");
  sqlite.exec(migration);
  const database = {
    all: async (sql, parameters = []) => sqlite.prepare(sql).all(...parameters),
    get: async (sql, parameters = []) => sqlite.prepare(sql).get(...parameters),
    run: async (sql, parameters = []) => {
      const result = sqlite.prepare(sql).run(...parameters);
      return { changes: Number(result.changes) };
    },
  };
  let nextId = 1;
  const repository = createWalletRepository({ database, createId: () => `record-${nextId++}` });
  return { repository, sqlite };
};

test("creates wallets and preserves exact centavo values", async (context) => {
  const { repository, sqlite } = createHarness();
  context.after(() => sqlite.close());

  const wallet = await repository.createWallet({ name: "  Daily cash  ", type: "Cash", startingBalance: 1234.56 });
  assert.equal(wallet.name, "Daily cash");
  assert.equal(wallet.startingBalance, 1234.56);

  const stored = sqlite.prepare("SELECT starting_balance_centavos FROM wallets WHERE id = ?").get(wallet.id);
  assert.equal(stored.starting_balance_centavos, 123456);

  const updated = await repository.updateWallet(wallet.id, { startingBalance: -20.25 });
  assert.equal(updated.startingBalance, -20.25);
});

test("creates, edits, orders, and deletes transactions", async (context) => {
  const { repository, sqlite } = createHarness();
  context.after(() => sqlite.close());

  const bank = await repository.createWallet({ name: "Bank", type: "Bank", startingBalance: 1000 });
  const cash = await repository.createWallet({ name: "Cash", type: "Cash", startingBalance: 0 });
  const income = await repository.createTransaction({
    walletId: bank.id,
    targetWalletId: "",
    type: "income",
    amount: 100.25,
    category: "Salary",
    payee: "Payday",
    date: "2026-08-20",
    note: "August salary",
  });
  const transfer = await repository.createTransaction({
    walletId: bank.id,
    targetWalletId: cash.id,
    type: "transfer",
    amount: 25.1,
    category: "Ignored for transfers",
    payee: "ATM withdrawal",
    date: "2026-08-21",
    note: "",
  });

  assert.equal(transfer.category, "Transfer");
  assert.deepEqual((await repository.listTransactions()).map((item) => item.id), [transfer.id, income.id]);

  const expense = await repository.updateTransaction(transfer.id, {
    type: "expense",
    category: "Food",
    payee: "Lunch",
  });
  assert.equal(expense.targetWalletId, "");
  assert.equal(expense.category, "Food");

  assert.equal(await repository.deleteTransaction(income.id), true);
  assert.equal(await repository.getTransaction(income.id), null);
  assert.equal(await repository.deleteTransaction(income.id), false);
});

test("enforces transfer relationships and cascades wallet deletion", async (context) => {
  const { repository, sqlite } = createHarness();
  context.after(() => sqlite.close());

  const source = await repository.createWallet({ name: "Source", type: "E-wallet", startingBalance: 500 });
  const target = await repository.createWallet({ name: "Target", type: "Bank", startingBalance: 0 });

  await assert.rejects(() => repository.createTransaction({
    walletId: source.id,
    targetWalletId: source.id,
    type: "transfer",
    amount: 10,
    category: "Transfer",
    payee: "Invalid transfer",
    date: "2026-08-21",
    note: "",
  }), /different wallets/);

  const transfer = await repository.createTransaction({
    walletId: source.id,
    targetWalletId: target.id,
    type: "transfer",
    amount: 10,
    category: "Transfer",
    payee: "Valid transfer",
    date: "2026-08-21",
    note: "",
  });
  assert.ok(await repository.getTransaction(transfer.id));

  await repository.deleteWallet(target.id);
  assert.equal(await repository.getTransaction(transfer.id), null);
});

test("rejects malformed wallet and transaction values before SQLite", async (context) => {
  const { repository, sqlite } = createHarness();
  context.after(() => sqlite.close());

  await assert.rejects(() => repository.createWallet({ name: "", type: "Cash", startingBalance: 0 }), /required/);
  await assert.rejects(() => repository.createWallet({ name: "Crypto", type: "Coin", startingBalance: 0 }), /Unknown wallet type/);
  const wallet = await repository.createWallet({ name: "Cash", type: "Cash", startingBalance: 0 });
  await assert.rejects(() => repository.createTransaction({
    walletId: wallet.id,
    type: "expense",
    amount: 10.123,
    category: "Food",
    payee: "Lunch",
    date: "2026-08-21",
    note: "",
  }), /two decimal places/);
  await assert.rejects(() => repository.createTransaction({
    walletId: wallet.id,
    type: "expense",
    amount: 10,
    category: "Food",
    payee: "Lunch",
    date: "2026-02-31",
    note: "",
  }), /valid calendar date/);
});
