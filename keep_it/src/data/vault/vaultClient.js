const clone = (value) => JSON.parse(JSON.stringify(value));

const createMemoryVaultClient = () => {
  let credentials = [];
  let configured = false;
  let unlocked = false;
  let masterPassword = "";
  let settings = { autoLockMinutes: 5, clearClipboardSeconds: 30, backupCreatedAt: null, lastPasswordChangeAt: null };
  const requireUnlocked = () => { if (!configured || !unlocked) throw new Error("Vault is locked."); };
  const getStatus = () => ({ configured, unlocked, credentialCount: credentials.length, settings: clone(settings), mode: "memory" });

  return {
    mode: "memory",
    status: async () => getStatus(),
    setup: async (password) => {
      if (configured) throw new Error("A master password is already configured.");
      if (password?.length < 12) throw new Error("Master password must contain at least 12 characters.");
      masterPassword = password;
      configured = true;
      unlocked = true;
      settings = { ...settings, lastPasswordChangeAt: new Date().toISOString() };
      return getStatus();
    },
    unlock: async (password) => {
      if (!configured) throw new Error("Create a master password first.");
      if (password !== masterPassword) throw new Error("Master password is incorrect.");
      unlocked = true;
      return getStatus();
    },
    lock: async () => { unlocked = false; return getStatus(); },
    changeMasterPassword: async ({ currentPassword, newPassword }) => {
      if (currentPassword !== masterPassword) throw new Error("Master password is incorrect.");
      if (newPassword?.length < 12) throw new Error("Master password must contain at least 12 characters.");
      masterPassword = newPassword;
      settings = { ...settings, lastPasswordChangeAt: new Date().toISOString() };
      return getStatus();
    },
    list: async () => { requireUnlocked(); return clone(credentials); },
    get: async (id) => { requireUnlocked(); return clone(credentials.find((item) => item.id === id) ?? null); },
    create: async (values) => {
      requireUnlocked();
      const timestamp = new Date().toISOString();
      const credential = { id: crypto.randomUUID(), ...clone(values), createdAt: timestamp, updatedAt: timestamp };
      credentials = [credential, ...credentials];
      return clone(credential);
    },
    update: async (id, changes) => {
      requireUnlocked();
      const current = credentials.find((item) => item.id === id);
      if (!current) throw new Error(`Credential not found: ${id}`);
      const credential = { ...current, ...clone(changes), updatedAt: new Date().toISOString() };
      credentials = credentials.map((item) => item.id === id ? credential : item);
      return clone(credential);
    },
    delete: async (id) => {
      requireUnlocked();
      const previousLength = credentials.length;
      credentials = credentials.filter((item) => item.id !== id);
      return credentials.length !== previousLength;
    },
    updateSettings: async (changes) => { settings = { ...settings, ...clone(changes) }; return getStatus(); },
    activity: async () => ({ unlocked }),
  };
};

let client;

export const getVaultClient = () => {
  if (client) return client;
  if (typeof window !== "undefined" && window.keepIt?.vault) {
    client = { ...window.keepIt.vault, mode: "desktop" };
    return client;
  }
  client = createMemoryVaultClient();
  return client;
};
