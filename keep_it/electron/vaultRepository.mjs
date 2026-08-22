import { createCipheriv, createDecipheriv, randomBytes, randomUUID, scrypt } from "node:crypto";
import { promisify } from "node:util";

const deriveWithScrypt = promisify(scrypt);
const CIPHER = "aes-256-gcm";
const AUTH_TAG_LENGTH = 16;
const IV_LENGTH = 12;
const KEY_LENGTH = 32;
const DEFAULT_KDF = Object.freeze({ n: 32768, r: 8, p: 3 });
const KDF_MAX_MEMORY = 64 * 1024 * 1024;
const WRAPPED_KEY_AAD = Buffer.from("keep-it-vault-key:v1", "utf8");

const toBuffer = (value) => Buffer.isBuffer(value) ? value : Buffer.from(value);

const validateNewMasterPassword = (password) => {
  if (typeof password !== "string") throw new TypeError("Master password must be text.");
  if (password.length < 12) throw new Error("Master password must contain at least 12 characters.");
  if (Buffer.byteLength(password, "utf8") > 1024) throw new Error("Master password is too long.");
  return password;
};

const validateUnlockPassword = (password) => {
  if (typeof password !== "string" || !password) throw new Error("Enter your master password.");
  if (Buffer.byteLength(password, "utf8") > 1024) throw new Error("Master password is too long.");
  return password;
};

const deriveKey = async (password, salt, parameters) => toBuffer(await deriveWithScrypt(
  Buffer.from(password, "utf8"),
  toBuffer(salt),
  KEY_LENGTH,
  { N: parameters.n, r: parameters.r, p: parameters.p, maxmem: KDF_MAX_MEMORY },
));

const encrypt = (key, plaintext, aad) => {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(CIPHER, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  cipher.setAAD(aad);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return { ciphertext, iv, tag: cipher.getAuthTag() };
};

const decrypt = (key, encrypted, aad) => {
  const decipher = createDecipheriv(CIPHER, key, toBuffer(encrypted.iv), { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAAD(aad);
  decipher.setAuthTag(toBuffer(encrypted.tag));
  return Buffer.concat([decipher.update(toBuffer(encrypted.ciphertext)), decipher.final()]);
};

const credentialAad = (id) => Buffer.from(`keep-it-credential:${id}:v1`, "utf8");

const normalizeCredential = (credential) => {
  const normalizeRequired = (value, label, maximumLength) => {
    if (typeof value !== "string") throw new TypeError(`${label} must be text.`);
    const normalized = value.trim();
    if (!normalized) throw new Error(`${label} is required.`);
    if (normalized.length > maximumLength) throw new Error(`${label} must be ${maximumLength} characters or fewer.`);
    return normalized;
  };
  const name = normalizeRequired(credential.name, "Service name", 120);
  const username = normalizeRequired(credential.username, "Username", 320);
  if (typeof credential.password !== "string" || !credential.password) throw new Error("Password is required.");
  if (credential.password.length > 10000) throw new Error("Password is too long.");
  const url = typeof credential.url === "string" ? credential.url.trim() : "";
  if (url.length > 2048) throw new Error("Website address is too long.");
  if (url) {
    let parsed;
    try { parsed = new URL(url); } catch { throw new Error("Website address must be a valid URL."); }
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Website address must use http:// or https://.");
  }
  const notes = typeof credential.notes === "string" ? credential.notes.trim() : "";
  if (notes.length > 5000) throw new Error("Credential notes must be 5000 characters or fewer.");
  return { name, username, password: credential.password, url, notes };
};

const rowToEncryptedRecord = (row) => ({ ciphertext: row.encrypted_payload, iv: row.encryption_iv, tag: row.authentication_tag });

export const createVaultRepository = ({ database, createId = randomUUID }) => {
  let dataKey = null;
  let autoLockTimer = null;

  const getConfig = async () => database.get("SELECT * FROM vault_config WHERE id = 1");
  const getCredentialRow = async (id) => database.get("SELECT * FROM vault_credentials WHERE id = ?", [id]);

  const clearTimer = () => {
    if (autoLockTimer) clearTimeout(autoLockTimer);
    autoLockTimer = null;
  };

  const clearKey = () => {
    clearTimer();
    dataKey?.fill(0);
    dataKey = null;
  };

  const resetAutoLock = async () => {
    clearTimer();
    if (!dataKey) return;
    const config = await getConfig();
    if (!config?.auto_lock_minutes) return;
    autoLockTimer = setTimeout(clearKey, config.auto_lock_minutes * 60_000);
    autoLockTimer.unref?.();
  };

  const requireUnlockedKey = async () => {
    if (!dataKey) throw new Error("Vault is locked.");
    await resetAutoLock();
    return dataKey;
  };

  const status = async () => {
    const config = await getConfig();
    const count = Number((await database.get("SELECT COUNT(*) AS count FROM vault_credentials"))?.count ?? 0);
    return {
      configured: Boolean(config),
      unlocked: Boolean(dataKey),
      credentialCount: count,
      settings: {
        autoLockMinutes: config?.auto_lock_minutes ?? 5,
        clearClipboardSeconds: config?.clear_clipboard_seconds ?? 30,
        backupCreatedAt: config?.backup_created_at ?? null,
        lastPasswordChangeAt: config?.password_changed_at ?? null,
      },
    };
  };

  const setup = async (masterPassword) => {
    if (await getConfig()) throw new Error("A master password is already configured.");
    const password = validateNewMasterPassword(masterPassword);
    const salt = randomBytes(16);
    const wrappingKey = await deriveKey(password, salt, DEFAULT_KDF);
    const nextDataKey = randomBytes(KEY_LENGTH);
    const wrapped = encrypt(wrappingKey, nextDataKey, WRAPPED_KEY_AAD);
    wrappingKey.fill(0);
    try {
      await database.run(
        `INSERT INTO vault_config (id, kdf_salt, kdf_n, kdf_r, kdf_p, wrapped_key_ciphertext, wrapped_key_iv, wrapped_key_tag)
         VALUES (1, ?, ?, ?, ?, ?, ?, ?)`,
        [salt, DEFAULT_KDF.n, DEFAULT_KDF.r, DEFAULT_KDF.p, wrapped.ciphertext, wrapped.iv, wrapped.tag],
      );
      clearKey();
      dataKey = nextDataKey;
    } catch (error) {
      nextDataKey.fill(0);
      throw error;
    }
    await resetAutoLock();
    return status();
  };

  const unwrapDataKey = async (masterPassword, config) => {
    const wrappingKey = await deriveKey(validateUnlockPassword(masterPassword), config.kdf_salt, {
      n: config.kdf_n,
      r: config.kdf_r,
      p: config.kdf_p,
    });
    try {
      return decrypt(wrappingKey, {
        ciphertext: config.wrapped_key_ciphertext,
        iv: config.wrapped_key_iv,
        tag: config.wrapped_key_tag,
      }, WRAPPED_KEY_AAD);
    } catch {
      throw new Error("Master password is incorrect.");
    } finally {
      wrappingKey.fill(0);
    }
  };

  const unlock = async (masterPassword) => {
    const config = await getConfig();
    if (!config) throw new Error("Create a master password first.");
    const unlockedKey = await unwrapDataKey(masterPassword, config);
    clearKey();
    dataKey = unlockedKey;
    await resetAutoLock();
    return status();
  };

  const lock = async () => {
    clearKey();
    return status();
  };

  const changeMasterPassword = async ({ currentPassword, newPassword }) => {
    const config = await getConfig();
    if (!config) throw new Error("Create a master password first.");
    const password = validateNewMasterPassword(newPassword);
    const unlockedKey = await unwrapDataKey(currentPassword, config);
    const salt = randomBytes(16);
    let wrappingKey;
    try {
      wrappingKey = await deriveKey(password, salt, DEFAULT_KDF);
      const wrapped = encrypt(wrappingKey, unlockedKey, WRAPPED_KEY_AAD);
      await database.run(
        `UPDATE vault_config
         SET kdf_salt = ?, kdf_n = ?, kdf_r = ?, kdf_p = ?, wrapped_key_ciphertext = ?, wrapped_key_iv = ?, wrapped_key_tag = ?,
             password_changed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
         WHERE id = 1`,
        [salt, DEFAULT_KDF.n, DEFAULT_KDF.r, DEFAULT_KDF.p, wrapped.ciphertext, wrapped.iv, wrapped.tag],
      );
      clearKey();
      dataKey = unlockedKey;
    } catch (error) {
      unlockedKey.fill(0);
      throw error;
    } finally {
      wrappingKey?.fill(0);
    }
    await resetAutoLock();
    return status();
  };

  const decryptCredential = (row, key) => {
    try {
      const payload = JSON.parse(decrypt(key, rowToEncryptedRecord(row), credentialAad(row.id)).toString("utf8"));
      return { id: row.id, ...payload, createdAt: row.created_at, updatedAt: row.updated_at };
    } catch {
      throw new Error("Encrypted credential data could not be authenticated.");
    }
  };

  const listCredentials = async () => {
    const key = await requireUnlockedKey();
    const rows = await database.all("SELECT * FROM vault_credentials ORDER BY updated_at DESC");
    return rows.map((row) => decryptCredential(row, key));
  };

  const getCredential = async (id) => {
    const key = await requireUnlockedKey();
    const row = await getCredentialRow(id);
    return row ? decryptCredential(row, key) : null;
  };

  const createCredential = async (credential) => {
    const key = await requireUnlockedKey();
    const id = createId();
    const payload = normalizeCredential(credential);
    const encrypted = encrypt(key, Buffer.from(JSON.stringify(payload), "utf8"), credentialAad(id));
    await database.run(
      "INSERT INTO vault_credentials (id, encrypted_payload, encryption_iv, authentication_tag) VALUES (?, ?, ?, ?)",
      [id, encrypted.ciphertext, encrypted.iv, encrypted.tag],
    );
    return getCredential(id);
  };

  const updateCredential = async (id, changes = {}) => {
    const key = await requireUnlockedKey();
    const row = await getCredentialRow(id);
    if (!row) throw new Error(`Credential not found: ${id}`);
    const current = decryptCredential(row, key);
    const payload = normalizeCredential({ ...current, ...changes });
    const encrypted = encrypt(key, Buffer.from(JSON.stringify(payload), "utf8"), credentialAad(id));
    await database.run(
      "UPDATE vault_credentials SET encrypted_payload = ?, encryption_iv = ?, authentication_tag = ? WHERE id = ?",
      [encrypted.ciphertext, encrypted.iv, encrypted.tag, id],
    );
    return getCredential(id);
  };

  const deleteCredential = async (id) => {
    await requireUnlockedKey();
    const result = await database.run("DELETE FROM vault_credentials WHERE id = ?", [id]);
    return (result?.changes ?? 0) > 0;
  };

  const updateSettings = async (changes = {}) => {
    const config = await getConfig();
    if (!config) throw new Error("Create a master password first.");
    const autoLockMinutes = changes.autoLockMinutes ?? config.auto_lock_minutes;
    const clearClipboardSeconds = changes.clearClipboardSeconds ?? config.clear_clipboard_seconds;
    if (![0, 1, 5, 15, 30, 60].includes(autoLockMinutes)) throw new Error("Unsupported auto-lock interval.");
    if (![0, 15, 30, 60].includes(clearClipboardSeconds)) throw new Error("Unsupported clipboard-clear interval.");
    await database.run(
      "UPDATE vault_config SET auto_lock_minutes = ?, clear_clipboard_seconds = ? WHERE id = 1",
      [autoLockMinutes, clearClipboardSeconds],
    );
    await resetAutoLock();
    return status();
  };

  const activity = async () => {
    if (dataKey) await resetAutoLock();
    return { unlocked: Boolean(dataKey) };
  };

  const destroy = () => clearKey();

  return { status, setup, unlock, lock, changeMasterPassword, listCredentials, getCredential, createCredential, updateCredential, deleteCredential, updateSettings, activity, destroy };
};
