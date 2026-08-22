const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const WALLET_TYPES = new Set(["Cash", "E-wallet", "Bank", "Debit card"]);
const TRANSACTION_TYPES = new Set(["income", "expense", "transfer"]);
const MAX_CENTAVOS = 9_000_000_000_000_000;

const normalizeText = (value, label, maximumLength) => {
  if (typeof value !== "string") throw new TypeError(`${label} must be text.`);
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} is required.`);
  if (normalized.length > maximumLength) throw new Error(`${label} must be ${maximumLength} characters or fewer.`);
  return normalized;
};

export const normalizeWalletName = (name) => normalizeText(name, "Wallet name", 120);

export const normalizeWalletType = (type) => {
  if (!WALLET_TYPES.has(type)) throw new Error(`Unknown wallet type: ${type}`);
  return type;
};

export const moneyToCentavos = (value, { positive = false } = {}) => {
  const amount = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  if (typeof amount !== "number" || !Number.isFinite(amount)) throw new Error("Amount must be a valid number.");
  const centavos = Math.round(amount * 100);
  if (Math.abs((amount * 100) - centavos) > 0.000001) throw new Error("Amount can have at most two decimal places.");
  if (!Number.isSafeInteger(centavos) || Math.abs(centavos) > MAX_CENTAVOS) throw new Error("Amount is outside the supported range.");
  if (positive && centavos <= 0) throw new Error("Amount must be greater than zero.");
  return centavos;
};

export const normalizeTransactionType = (type) => {
  if (!TRANSACTION_TYPES.has(type)) throw new Error(`Unknown transaction type: ${type}`);
  return type;
};

export const normalizeTransactionDate = (date) => {
  if (typeof date !== "string" || !DATE_ONLY_PATTERN.test(date)) throw new Error("Transaction date must use YYYY-MM-DD format.");
  const [year, month, day] = date.split("-").map(Number);
  const parsed = new Date(year, month - 1, day, 12);
  if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) throw new Error("Transaction date is not a valid calendar date.");
  return date;
};

export const normalizeCategory = (category) => normalizeText(category, "Transaction category", 80);
export const normalizePayee = (payee) => normalizeText(payee, "Transaction description", 200);

export const normalizeNote = (note = "") => {
  if (typeof note !== "string") throw new TypeError("Transaction note must be text.");
  if (note.length > 2000) throw new Error("Transaction note must be 2000 characters or fewer.");
  return note;
};

export const walletRowToModel = (row) => row ? {
  id: row.id,
  name: row.name,
  type: row.type,
  startingBalance: row.starting_balance_centavos / 100,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
} : null;

export const transactionRowToModel = (row) => row ? {
  id: row.id,
  walletId: row.wallet_id,
  targetWalletId: row.target_wallet_id ?? "",
  type: row.type,
  amount: row.amount_centavos / 100,
  category: row.category,
  payee: row.payee,
  date: row.transaction_date,
  note: row.note,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
} : null;
