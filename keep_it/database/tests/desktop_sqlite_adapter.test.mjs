import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { createSqliteAdapter } from "../../electron/database.mjs";
import { createVaultRepository } from "../../electron/vaultRepository.mjs";
import { createNoteRepository } from "../../src/data/notes/noteRepository.js";
import { createTaskRepository } from "../../src/data/tasks/taskRepository.js";
import { createWalletRepository } from "../../src/data/wallets/walletRepository.js";

const document = (text = "") => ({
  type: "doc",
  content: [{ type: "paragraph", ...(text ? { content: [{ type: "text", text }] } : {}) }],
});

test("persists every module across a desktop database restart", async () => {
  const temporaryDirectory = mkdtempSync(join(tmpdir(), "keep-it-desktop-"));
  const databasePath = join(temporaryDirectory, "keep-it.sqlite");
  let database;

  try {
    database = createSqliteAdapter({ databasePath, appPath: resolve(".") });
    const taskRepository = createTaskRepository({
      database,
      createId: () => "desktop-task",
      now: () => "2026-08-21T04:00:00.000Z",
    });
    const noteRepository = createNoteRepository({
      database,
      createId: () => "desktop-note",
      now: () => "2026-08-21T04:00:00.000Z",
    });
    let walletRecord = 0;
    const walletRepository = createWalletRepository({
      database,
      createId: () => `desktop-wallet-record-${++walletRecord}`,
    });
    let vaultRepository = createVaultRepository({
      database,
      createId: () => "desktop-credential",
    });

    assert.deepEqual(await taskRepository.listTasks(), []);
    assert.deepEqual(await noteRepository.listNotes(), []);
    assert.deepEqual(await walletRepository.listWallets(), []);
    assert.deepEqual(await walletRepository.listTransactions(), []);
    assert.deepEqual(await vaultRepository.status(), {
      configured: false,
      unlocked: false,
      credentialCount: 0,
      settings: {
        autoLockMinutes: 5,
        clearClipboardSeconds: 30,
        backupCreatedAt: null,
        lastPasswordChangeAt: null,
      },
    });

    const task = await taskRepository.createTask({ title: "Stored on this device", due: "2026-08-24" });
    await taskRepository.updateTask(task.id, { title: "Edited after saving", done: true });

    const note = await noteRepository.createNote({
      title: document("Offline note"),
      titleText: "Offline note",
      content: document("This survives a restart."),
      contentText: "This survives a restart.",
      tag: "School",
    });
    await noteRepository.updateNote(note.id, { pinned: true });

    const bank = await walletRepository.createWallet({ name: "Stored wallet", type: "Bank", startingBalance: 25.5 });
    const cash = await walletRepository.createWallet({ name: "Cash", type: "Cash", startingBalance: 0 });
    const transaction = await walletRepository.createTransaction({
      walletId: bank.id,
      targetWalletId: cash.id,
      type: "transfer",
      amount: 5.25,
      category: "Transfer",
      payee: "Cash withdrawal",
      date: "2026-08-21",
      note: "Persistence check",
    });

    const masterPassword = "desktop persistence test password";
    await vaultRepository.setup(masterPassword);
    const credential = await vaultRepository.createCredential({
      name: "Stored credential",
      username: "dusky@example.com",
      password: "Offline-only-password!42",
      url: "https://example.com",
      notes: "Encrypted on this device",
    });
    await vaultRepository.updateCredential(credential.id, { notes: "Edited and encrypted" });
    await vaultRepository.lock();

    database.close();
    database = createSqliteAdapter({ databasePath, appPath: resolve(".") });

    const reopenedTasks = createTaskRepository({ database });
    const reopenedNotes = createNoteRepository({ database });
    const reopenedWallets = createWalletRepository({ database });
    vaultRepository = createVaultRepository({ database });

    assert.deepEqual(await reopenedTasks.listTasks(), [{
      id: "desktop-task",
      title: "Edited after saving",
      due: "2026-08-24",
      done: true,
    }]);
    assert.deepEqual((await reopenedNotes.listNotes()).map((storedNote) => ({
      id: storedNote.id,
      titleText: storedNote.titleText,
      contentText: storedNote.contentText,
      tag: storedNote.tag,
      pinned: storedNote.pinned,
    })), [{
      id: "desktop-note",
      titleText: "Offline note",
      contentText: "This survives a restart.",
      tag: "School",
      pinned: true,
    }]);
    assert.deepEqual(
      (await reopenedWallets.listWallets()).map((storedWallet) => storedWallet.name).sort(),
      ["Cash", "Stored wallet"],
    );
    assert.equal((await reopenedWallets.getWallet(bank.id)).startingBalance, 25.5);
    assert.deepEqual((await reopenedWallets.listTransactions()).map((storedTransaction) => ({
      id: storedTransaction.id,
      type: storedTransaction.type,
      amount: storedTransaction.amount,
      note: storedTransaction.note,
    })), [{
      id: transaction.id,
      type: "transfer",
      amount: 5.25,
      note: "Persistence check",
    }]);

    const lockedStatus = await vaultRepository.status();
    assert.equal(lockedStatus.configured, true);
    assert.equal(lockedStatus.unlocked, false);
    await vaultRepository.unlock(masterPassword);
    assert.deepEqual((await vaultRepository.listCredentials()).map((storedCredential) => ({
      id: storedCredential.id,
      name: storedCredential.name,
      notes: storedCredential.notes,
    })), [{
      id: "desktop-credential",
      name: "Stored credential",
      notes: "Edited and encrypted",
    }]);

    assert.deepEqual(
      (await database.all("SELECT name FROM schema_migrations ORDER BY name")).map((row) => row.name),
      ["001_create_tasks.sql", "002_create_notes.sql", "003_create_wallets_and_transactions.sql", "004_create_encrypted_vault.sql"],
    );

    await reopenedTasks.deleteTask(task.id);
    await reopenedNotes.deleteNote(note.id);
    await reopenedWallets.deleteTransaction(transaction.id);
    await reopenedWallets.deleteWallet(bank.id);
    await reopenedWallets.deleteWallet(cash.id);
    await vaultRepository.deleteCredential(credential.id);
    await vaultRepository.lock();

    database.close();
    database = createSqliteAdapter({ databasePath, appPath: resolve(".") });

    assert.deepEqual(await createTaskRepository({ database }).listTasks(), []);
    assert.deepEqual(await createNoteRepository({ database }).listNotes(), []);
    assert.deepEqual(await createWalletRepository({ database }).listWallets(), []);
    assert.deepEqual(await createWalletRepository({ database }).listTransactions(), []);
    assert.equal((await createVaultRepository({ database }).status()).credentialCount, 0);
  } finally {
    database?.close();
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
});
