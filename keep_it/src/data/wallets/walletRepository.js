import {
  moneyToCentavos,
  normalizeCategory,
  normalizeNote,
  normalizePayee,
  normalizeTransactionDate,
  normalizeTransactionType,
  normalizeWalletName,
  normalizeWalletType,
  transactionRowToModel,
  walletRowToModel,
} from "./walletMapper.js";

const WALLET_COLUMNS = "id, name, type, starting_balance_centavos, created_at, updated_at";
const TRANSACTION_COLUMNS = "id, wallet_id, target_wallet_id, type, amount_centavos, category, payee, transaction_date, note, created_at, updated_at";

const defaultCreateId = () => {
  if (!globalThis.crypto?.randomUUID) throw new Error("Secure UUID generation is unavailable.");
  return globalThis.crypto.randomUUID();
};

const assertDatabaseAdapter = (database) => {
  for (const method of ["all", "get", "run"]) {
    if (typeof database?.[method] !== "function") throw new TypeError(`Wallet database adapter must provide a ${method}() method.`);
  }
};

const normalizeId = (id, label) => {
  if (typeof id !== "string" || !id.trim()) throw new Error(`${label} is required.`);
  return id.trim();
};

export const createWalletRepository = ({ database, createId = defaultCreateId }) => {
  assertDatabaseAdapter(database);

  const getWalletRow = async (id) => database.get(`SELECT ${WALLET_COLUMNS} FROM wallets WHERE id = ?`, [id]);
  const getTransactionRow = async (id) => database.get(`SELECT ${TRANSACTION_COLUMNS} FROM transactions WHERE id = ?`, [id]);
  const getWallet = async (id) => walletRowToModel(await getWalletRow(id));
  const getTransaction = async (id) => transactionRowToModel(await getTransactionRow(id));

  const assertWalletExists = async (id, label = "Wallet") => {
    const normalizedId = normalizeId(id, label);
    if (!await getWalletRow(normalizedId)) throw new Error(`${label} not found: ${normalizedId}`);
    return normalizedId;
  };

  const listWallets = async () => {
    const rows = await database.all(`SELECT ${WALLET_COLUMNS} FROM wallets ORDER BY created_at ASC, name COLLATE NOCASE ASC`);
    return rows.map(walletRowToModel);
  };

  const createWallet = async ({ name, type, startingBalance = 0 }) => {
    const id = createId();
    await database.run(
      "INSERT INTO wallets (id, name, type, starting_balance_centavos) VALUES (?, ?, ?, ?)",
      [id, normalizeWalletName(name), normalizeWalletType(type), moneyToCentavos(startingBalance)],
    );
    return getWallet(id);
  };

  const updateWallet = async (id, changes = {}) => {
    const current = await getWalletRow(id);
    if (!current) throw new Error(`Wallet not found: ${id}`);
    const name = changes.name === undefined ? current.name : normalizeWalletName(changes.name);
    const type = changes.type === undefined ? current.type : normalizeWalletType(changes.type);
    const startingBalance = changes.startingBalance === undefined ? current.starting_balance_centavos : moneyToCentavos(changes.startingBalance);
    await database.run(
      "UPDATE wallets SET name = ?, type = ?, starting_balance_centavos = ? WHERE id = ?",
      [name, type, startingBalance, id],
    );
    return getWallet(id);
  };

  const deleteWallet = async (id) => {
    const result = await database.run("DELETE FROM wallets WHERE id = ?", [id]);
    return (result?.changes ?? 0) > 0;
  };

  const listTransactions = async () => {
    const rows = await database.all(`SELECT ${TRANSACTION_COLUMNS} FROM transactions ORDER BY transaction_date DESC, created_at DESC`);
    return rows.map(transactionRowToModel);
  };

  const normalizeTransactionValues = async (values, current = null) => {
    const type = values.type === undefined ? current?.type : normalizeTransactionType(values.type);
    const walletId = values.walletId === undefined ? current?.wallet_id : await assertWalletExists(values.walletId);
    let targetWalletId = null;
    if (type === "transfer") {
      const requestedTarget = values.targetWalletId === undefined ? current?.target_wallet_id : values.targetWalletId;
      targetWalletId = await assertWalletExists(requestedTarget, "Target wallet");
      if (targetWalletId === walletId) throw new Error("A transfer needs two different wallets.");
    }
    return {
      walletId,
      targetWalletId,
      type,
      amountCentavos: values.amount === undefined ? current?.amount_centavos : moneyToCentavos(values.amount, { positive: true }),
      category: type === "transfer" ? "Transfer" : values.category === undefined ? current?.category : normalizeCategory(values.category),
      payee: values.payee === undefined ? current?.payee : normalizePayee(values.payee),
      date: values.date === undefined ? current?.transaction_date : normalizeTransactionDate(values.date),
      note: values.note === undefined ? current?.note : normalizeNote(values.note),
    };
  };

  const createTransaction = async (transaction) => {
    const id = createId();
    const values = await normalizeTransactionValues(transaction);
    await database.run(
      `INSERT INTO transactions (id, wallet_id, target_wallet_id, type, amount_centavos, category, payee, transaction_date, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, values.walletId, values.targetWalletId, values.type, values.amountCentavos, values.category, values.payee, values.date, values.note],
    );
    return getTransaction(id);
  };

  const updateTransaction = async (id, changes = {}) => {
    const current = await getTransactionRow(id);
    if (!current) throw new Error(`Transaction not found: ${id}`);
    const values = await normalizeTransactionValues(changes, current);
    await database.run(
      `UPDATE transactions
       SET wallet_id = ?, target_wallet_id = ?, type = ?, amount_centavos = ?, category = ?, payee = ?, transaction_date = ?, note = ?
       WHERE id = ?`,
      [values.walletId, values.targetWalletId, values.type, values.amountCentavos, values.category, values.payee, values.date, values.note, id],
    );
    return getTransaction(id);
  };

  const deleteTransaction = async (id) => {
    const result = await database.run("DELETE FROM transactions WHERE id = ?", [id]);
    return (result?.changes ?? 0) > 0;
  };

  return { listWallets, getWallet, createWallet, updateWallet, deleteWallet, listTransactions, getTransaction, createTransaction, updateTransaction, deleteTransaction };
};
