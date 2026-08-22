const clone = (value) => JSON.parse(JSON.stringify(value));

const createMemoryWalletClient = ({ wallets: initialWallets, transactions: initialTransactions }) => {
  let wallets = clone(initialWallets);
  let transactions = clone(initialTransactions);
  return {
    listWallets: async () => clone(wallets),
    createWallet: async (values) => {
      const timestamp = new Date().toISOString();
      const wallet = { id: crypto.randomUUID(), ...clone(values), createdAt: timestamp, updatedAt: timestamp };
      wallets = [...wallets, wallet];
      return clone(wallet);
    },
    updateWallet: async (id, changes) => {
      const current = wallets.find((wallet) => wallet.id === id);
      if (!current) throw new Error(`Wallet not found: ${id}`);
      const wallet = { ...current, ...clone(changes), updatedAt: new Date().toISOString() };
      wallets = wallets.map((item) => item.id === id ? wallet : item);
      return clone(wallet);
    },
    deleteWallet: async (id) => {
      const previousLength = wallets.length;
      wallets = wallets.filter((wallet) => wallet.id !== id);
      transactions = transactions.filter((transaction) => transaction.walletId !== id && transaction.targetWalletId !== id);
      return wallets.length !== previousLength;
    },
    listTransactions: async () => clone(transactions),
    createTransaction: async (values) => {
      const timestamp = new Date().toISOString();
      const transaction = { id: crypto.randomUUID(), ...clone(values), createdAt: timestamp, updatedAt: timestamp };
      transactions = [transaction, ...transactions];
      return clone(transaction);
    },
    updateTransaction: async (id, changes) => {
      const current = transactions.find((transaction) => transaction.id === id);
      if (!current) throw new Error(`Transaction not found: ${id}`);
      const transaction = { ...current, ...clone(changes), updatedAt: new Date().toISOString() };
      transactions = transactions.map((item) => item.id === id ? transaction : item);
      return clone(transaction);
    },
    deleteTransaction: async (id) => {
      const previousLength = transactions.length;
      transactions = transactions.filter((transaction) => transaction.id !== id);
      return transactions.length !== previousLength;
    },
  };
};

let client;

export const getWalletClient = (initialData) => {
  if (client) return client;
  if (typeof window !== "undefined" && window.keepIt?.wallets) {
    client = window.keepIt.wallets;
    return client;
  }
  client = createMemoryWalletClient(initialData);
  return client;
};
