const { contextBridge, ipcRenderer } = require("electron");

const invoke = (channel, ...argumentsList) => ipcRenderer.invoke(channel, ...argumentsList);

contextBridge.exposeInMainWorld("keepIt", Object.freeze({
  platform: process.platform,
  vault: Object.freeze({
    status: () => invoke("vault:status"),
    setup: (masterPassword) => invoke("vault:setup", masterPassword),
    unlock: (masterPassword) => invoke("vault:unlock", masterPassword),
    lock: () => invoke("vault:lock"),
    changeMasterPassword: (passwords) => invoke("vault:change-master-password", passwords),
    list: () => invoke("vault:list"),
    get: (id) => invoke("vault:get", id),
    create: (credential) => invoke("vault:create", credential),
    update: (id, changes) => invoke("vault:update", id, changes),
    delete: (id) => invoke("vault:delete", id),
    updateSettings: (changes) => invoke("vault:update-settings", changes),
    activity: () => invoke("vault:activity"),
  }),
  wallets: Object.freeze({
    listWallets: () => invoke("wallets:list"),
    getWallet: (id) => invoke("wallets:get", id),
    createWallet: (wallet) => invoke("wallets:create", wallet),
    updateWallet: (id, changes) => invoke("wallets:update", id, changes),
    deleteWallet: (id) => invoke("wallets:delete", id),
    listTransactions: () => invoke("transactions:list"),
    getTransaction: (id) => invoke("transactions:get", id),
    createTransaction: (transaction) => invoke("transactions:create", transaction),
    updateTransaction: (id, changes) => invoke("transactions:update", id, changes),
    deleteTransaction: (id) => invoke("transactions:delete", id),
  }),
  notes: Object.freeze({
    list: (options) => invoke("notes:list", options),
    get: (id) => invoke("notes:get", id),
    create: (note) => invoke("notes:create", note),
    update: (id, changes) => invoke("notes:update", id, changes),
    delete: (id) => invoke("notes:delete", id),
  }),
  tasks: Object.freeze({
    list: (options) => invoke("tasks:list", options),
    get: (id) => invoke("tasks:get", id),
    create: (task) => invoke("tasks:create", task),
    update: (id, changes) => invoke("tasks:update", id, changes),
    toggle: (id) => invoke("tasks:toggle", id),
    delete: (id) => invoke("tasks:delete", id),
    listForDate: (date) => invoke("tasks:list-for-date", date),
    listAttention: (limit) => invoke("tasks:list-attention", limit),
    listUpcoming: (options) => invoke("tasks:list-upcoming", options),
  }),
}));
