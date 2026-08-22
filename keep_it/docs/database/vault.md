# Encrypted vault storage

The Vault uses a master password to derive a wrapping key with scrypt. A random 256-bit data key encrypts each complete credential payload with AES-256-GCM, and the wrapping key encrypts only that data key. Changing the master password therefore re-wraps the data key without decrypting and rewriting every credential.

`vault_credentials` intentionally contains no plaintext name, username, password, URL, or notes columns. Each row stores only an opaque encrypted payload, a unique 12-byte IV, a 16-byte authentication tag, timestamps, and a non-secret identifier.

The data key exists only in process memory while the Vault is unlocked. It is overwritten and discarded when the user locks the Vault, when automatic locking fires, and when the desktop process exits. The master password and its derived wrapping key are never stored.

`vault_config` stores the scrypt salt and parameters, the wrapped data key, security intervals, and timestamps. The clipboard-clear interval is enforced in the renderer after copying a password; automatic locking is enforced in both the renderer and desktop main process.

Backups are deliberately not exposed yet. A safe backup must include the complete application database and preserve the encrypted Vault records without suggesting that the master password can be recovered.
