import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";

import { createVaultRepository } from "../../electron/vaultRepository.mjs";

const migration = readFileSync(new URL("../migrations/004_create_encrypted_vault.sql", import.meta.url), "utf8");

const createHarness = () => {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(migration);
  const database = {
    all: async (sql, parameters = []) => sqlite.prepare(sql).all(...parameters),
    get: async (sql, parameters = []) => sqlite.prepare(sql).get(...parameters),
    run: async (sql, parameters = []) => {
      const result = sqlite.prepare(sql).run(...parameters);
      return { changes: Number(result.changes) };
    },
  };
  const repository = createVaultRepository({ database, createId: () => "credential-1" });
  return { repository, sqlite };
};

const masterPassword = "correct horse battery staple";
const credential = {
  name: "GitHub private",
  username: "dusky@example.com",
  password: "NeverStoreThisAsPlaintext!42",
  url: "https://github.com",
  notes: "Private development account",
};

test("encrypts every private credential field and requires the master password after locking", async (context) => {
  const { repository, sqlite } = createHarness();
  context.after(() => sqlite.close());

  const setupStatus = await repository.setup(masterPassword);
  assert.equal(setupStatus.configured, true);
  assert.equal(setupStatus.unlocked, true);

  const created = await repository.createCredential(credential);
  assert.deepEqual({ ...created, id: undefined, createdAt: undefined, updatedAt: undefined }, { ...credential, id: undefined, createdAt: undefined, updatedAt: undefined });

  const stored = sqlite.prepare("SELECT * FROM vault_credentials WHERE id = ?").get(created.id);
  const rawRecord = Buffer.concat([
    Buffer.from(stored.encrypted_payload),
    Buffer.from(stored.encryption_iv),
    Buffer.from(stored.authentication_tag),
  ]).toString("utf8");
  for (const plaintext of Object.values(credential)) assert.equal(rawRecord.includes(plaintext), false);

  await repository.lock();
  assert.equal((await repository.status()).credentialCount, 1);
  await assert.rejects(() => repository.listCredentials(), /locked/);
  await assert.rejects(() => repository.unlock("wrong password"), /incorrect/);
  await repository.unlock(masterPassword);
  assert.equal((await repository.getCredential(created.id)).password, credential.password);
});

test("supports credential updates, deletion, password rotation, and authenticated tamper detection", async (context) => {
  const { repository, sqlite } = createHarness();
  context.after(() => sqlite.close());

  await repository.setup(masterPassword);
  const created = await repository.createCredential(credential);
  const updated = await repository.updateCredential(created.id, { username: "updated@example.com", notes: "Updated note" });
  assert.equal(updated.username, "updated@example.com");

  const newMasterPassword = "a different long master password";
  await repository.changeMasterPassword({ currentPassword: masterPassword, newPassword: newMasterPassword });
  await repository.lock();
  await assert.rejects(() => repository.unlock(masterPassword), /incorrect/);
  await repository.unlock(newMasterPassword);
  assert.equal((await repository.getCredential(created.id)).notes, "Updated note");

  const row = sqlite.prepare("SELECT authentication_tag FROM vault_credentials WHERE id = ?").get(created.id);
  const tamperedTag = Buffer.from(row.authentication_tag);
  tamperedTag[0] ^= 0xff;
  sqlite.prepare("UPDATE vault_credentials SET authentication_tag = ? WHERE id = ?").run(tamperedTag, created.id);
  await assert.rejects(() => repository.getCredential(created.id), /authenticated/);

  sqlite.prepare("UPDATE vault_credentials SET authentication_tag = ? WHERE id = ?").run(row.authentication_tag, created.id);
  assert.equal(await repository.deleteCredential(created.id), true);
  assert.equal((await repository.status()).credentialCount, 0);
});
