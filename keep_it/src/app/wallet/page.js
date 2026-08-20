"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Banknote, Building2, CreditCard, Pencil, Plus, Search, Smartphone, Trash2, WalletCards, X } from "lucide-react";
import DatePicker from "@/components/ui/DatePicker";
import ScrollArea from "@/components/ui/ScrollArea";
import SelectField from "@/components/ui/SelectField";
import { useWorkspace } from "@/context/WorkspaceContext";

const walletTypes = ["Cash", "E-wallet", "Bank", "Debit card"];
const categories = ["Salary", "Food", "Transportation", "Utilities", "Shopping", "Entertainment", "Health", "Savings", "Income", "Other"];
const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 });

const WalletPage = () => {
  const { wallets, setWallets, transactions, setTransactions, recordActivity } = useWorkspace();
  const [selectedWalletId, setSelectedWalletId] = useState("all");
  const [dialog, setDialog] = useState("");
  const [walletForm, setWalletForm] = useState({ name: "", type: "E-wallet", startingBalance: "" });
  const [transactionForm, setTransactionForm] = useState({ walletId: "gcash", targetWalletId: "bpi", type: "expense", amount: "", category: "Food", payee: "", date: "2026-08-20", note: "" });
  const [editingWalletId, setEditingWalletId] = useState("");
  const [editingTransactionId, setEditingTransactionId] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const [formError, setFormError] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    if (!dialog && !confirmation) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleEscape = (event) => {
      if (event.key !== "Escape") return;
      if (confirmation) setConfirmation(null);
      else setDialog("");
    };
    document.addEventListener("keydown", handleEscape);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", handleEscape); };
  }, [dialog, confirmation]);

  const balanceFor = (walletId) => {
    const wallet = wallets.find((item) => item.id === walletId);
    if (!wallet) return 0;
    return transactions.reduce((balance, transaction) => {
      if (transaction.type === "income" && transaction.walletId === walletId) return balance + transaction.amount;
      if (transaction.type === "expense" && transaction.walletId === walletId) return balance - transaction.amount;
      if (transaction.type === "transfer" && transaction.walletId === walletId) return balance - transaction.amount;
      if (transaction.type === "transfer" && transaction.targetWalletId === walletId) return balance + transaction.amount;
      return balance;
    }, wallet.startingBalance);
  };

  const filteredTransactions = useMemo(() => transactions
    .filter((transaction) => selectedWalletId === "all" || transaction.walletId === selectedWalletId || transaction.targetWalletId === selectedWalletId)
    .filter((transaction) => typeFilter === "all" || transaction.type === typeFilter)
    .filter((transaction) => `${transaction.payee} ${transaction.category} ${transaction.note}`.toLowerCase().includes(search.toLowerCase()))
    .sort((first, second) => second.date.localeCompare(first.date)), [selectedWalletId, transactions, typeFilter, search]);

  const walletName = (id) => wallets.find((wallet) => wallet.id === id)?.name || "Unknown wallet";

  const walletIcon = (type) => {
    if (type === "E-wallet") return Smartphone;
    if (type === "Bank") return Building2;
    if (type.includes("card")) return CreditCard;
    return Banknote;
  };

  const openNewWallet = () => { setEditingWalletId(""); setWalletForm({ name: "", type: "E-wallet", startingBalance: "" }); setFormError(""); setDialog("wallet"); };
  const openWallet = (wallet) => { setSelectedWalletId(wallet.id); setEditingWalletId(wallet.id); setWalletForm({ ...wallet, startingBalance: String(wallet.startingBalance) }); setFormError(""); setDialog("wallet"); };

  const saveWallet = (event) => {
    event.preventDefault();
    if (!walletForm.name.trim()) return setFormError("Enter a wallet name.");
    if (walletForm.startingBalance === "" || Number.isNaN(Number(walletForm.startingBalance))) return setFormError("Enter a valid starting balance.");
    const values = { name: walletForm.name.trim(), type: walletForm.type, startingBalance: Number(walletForm.startingBalance) };
    if (editingWalletId) { setWallets((current) => current.map((wallet) => wallet.id === editingWalletId ? { ...wallet, ...values } : wallet)); recordActivity("wallet", "Updated a wallet", values.name); }
    else {
      const id = crypto.randomUUID();
      setWallets((current) => [...current, { id, ...values }]);
      recordActivity("wallet", "Added a wallet", values.name);
      setSelectedWalletId(id);
      setTransactionForm({ ...transactionForm, walletId: id });
    }
    setFormError("");
    setDialog("");
  };

  const saveTransaction = (event) => {
    event.preventDefault();
    const amount = Number(transactionForm.amount);
    if (!transactionForm.walletId) return setFormError("Choose a wallet.");
    if (!amount || amount <= 0) return setFormError("Enter an amount greater than zero.");
    if (!transactionForm.date) return setFormError("Choose a transaction date.");
    if (transactionForm.type === "transfer" && (!transactionForm.targetWalletId || transactionForm.targetWalletId === transactionForm.walletId)) return setFormError("Choose two different wallets for a transfer.");
    const values = { ...transactionForm, amount, category: transactionForm.type === "transfer" ? "Transfer" : transactionForm.category, payee: transactionForm.payee.trim() || (transactionForm.type === "transfer" ? "Account transfer" : "Untitled transaction") };
    if (editingTransactionId) { setTransactions((current) => current.map((item) => item.id === editingTransactionId ? { ...item, ...values } : item)); recordActivity("transaction", "Updated a transaction", values.payee); }
    else { setTransactions((current) => [{ id: crypto.randomUUID(), ...values }, ...current]); recordActivity("transaction", `Added an ${values.type}`, values.payee); }
    setFormError("");
    setDialog("");
  };

  const openTransactionDialog = () => {
    const sourceWalletId = selectedWalletId === "all" ? wallets[0]?.id : selectedWalletId;
    const targetWalletId = wallets.find((wallet) => wallet.id !== sourceWalletId)?.id || "";
    setEditingTransactionId("");
    setFormError("");
    setTransactionForm({ walletId: sourceWalletId, targetWalletId, type: "expense", amount: "", category: "Food", payee: "", date: new Date().toISOString().slice(0, 10), note: "" });
    setDialog("transaction");
  };

  const openTransaction = (transaction) => { setEditingTransactionId(transaction.id); setTransactionForm({ ...transaction, amount: String(transaction.amount) }); setFormError(""); setDialog("transaction"); };

  const confirmationId = confirmation?.id;
  const confirmationType = confirmation?.type;

  const deleteConfirmed = () => {
    if (!confirmationId) return;
    if (confirmationType === "wallet") {
      recordActivity("wallet", "Deleted a wallet", wallets.find((wallet) => wallet.id === confirmationId)?.name || "Wallet");
      setWallets((current) => current.filter((wallet) => wallet.id !== confirmationId));
      setTransactions((current) => current.filter((item) => item.walletId !== confirmationId && item.targetWalletId !== confirmationId));
      setSelectedWalletId("all");
    } else { recordActivity("transaction", "Deleted a transaction", transactions.find((item) => item.id === confirmationId)?.payee || "Transaction"); setTransactions((current) => current.filter((item) => item.id !== confirmationId)); }
    setConfirmation(null);
    setDialog("");
  };

  return (
    <main className="mx-auto max-w-[1400px] p-4 sm:p-5 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><h2 className="text-2xl font-bold text-slate-950">Your wallet</h2><p className="mt-1 text-sm text-slate-500">Track every account and transaction in one clear view.</p></div>
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
          <button onClick={openNewWallet} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><WalletCards size={16} /> Add wallet</button>
          <button onClick={openTransactionDialog} disabled={!wallets.length} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"><Plus size={16} /> Add transaction</button>
        </div>
      </div>

      <section className="mt-7">
        <div className="flex items-center justify-between"><h3 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">My wallets</h3><p className="text-xs text-slate-400">{wallets.length} accounts</p></div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <button onClick={() => setSelectedWalletId("all")} className={`rounded-2xl border p-5 text-left transition ${selectedWalletId === "all" ? "border-slate-900 bg-slate-900 text-white shadow-md" : "border-slate-200 bg-white hover:border-slate-300"}`}>
            <div className="flex items-center justify-between"><span className={`grid h-9 w-9 place-items-center rounded-xl ${selectedWalletId === "all" ? "bg-white/10" : "bg-slate-100 text-slate-600"}`}><WalletCards size={18} /></span><span className={`text-[10px] font-bold uppercase tracking-wider ${selectedWalletId === "all" ? "text-slate-300" : "text-slate-400"}`}>Combined</span></div>
            <p className="mt-5 text-sm font-semibold">All wallets</p><p className="mt-1 text-2xl font-bold">{peso.format(wallets.reduce((total, wallet) => total + balanceFor(wallet.id), 0))}</p>
          </button>
          {wallets.map((wallet) => {
            const Icon = walletIcon(wallet.type);
            const selected = selectedWalletId === wallet.id;
            return (
              <div key={wallet.id} className="relative">
              <button onClick={() => setSelectedWalletId(wallet.id)} aria-label={`Filter transactions by ${wallet.name}`} className={`h-full w-full rounded-2xl border p-5 text-left transition ${selected ? "border-[#167d8d] bg-[#167d8d] text-white shadow-md" : "border-slate-200 bg-white hover:border-[#b9dadd]"}`}>
                <div className="flex items-center justify-between"><span className={`grid h-9 w-9 place-items-center rounded-xl ${selected ? "bg-white/10" : "bg-[#e3f2f4] text-[#167d8d]"}`}><Icon size={18} /></span><span className={`text-[10px] font-bold uppercase tracking-wider ${selected ? "text-white/70" : "text-slate-400"}`}>{wallet.type}</span></div>
                <p className="mt-5 truncate text-sm font-semibold">{wallet.name}</p><p className="mt-1 pr-8 text-2xl font-bold">{peso.format(balanceFor(wallet.id))}</p>
              </button>
              <button type="button" onClick={() => openWallet(wallet)} aria-label={`Edit ${wallet.name}`} title={`Edit ${wallet.name}`} className={`absolute bottom-3 right-3 z-10 grid h-8 w-8 place-items-center rounded-lg transition ${selected ? "text-white/70 hover:bg-white/10 hover:text-white" : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"}`}><Pencil size={14} /></button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 p-4 sm:p-5"><div className="flex items-center justify-between gap-3"><div><h3 className="font-bold text-slate-900">Recent transactions</h3><p className="mt-1 text-xs text-slate-400">{selectedWalletId === "all" ? "Activity across all wallets" : `Activity for ${walletName(selectedWalletId)}`}</p></div><span className="text-xs font-semibold text-slate-400">{filteredTransactions.length} entries</span></div><div className="mt-4 flex flex-col gap-2 lg:flex-row"><label className="relative flex-1"><span className="sr-only">Search transactions</span><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search transactions" className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-[#74aeb7] focus:bg-white" /></label><div className="grid grid-cols-4 rounded-xl bg-slate-100 p-1">{["all", "income", "expense", "transfer"].map((type) => <button key={type} onClick={() => setTypeFilter(type)} className={`rounded-lg px-2 py-2 text-xs font-semibold capitalize ${typeFilter === type ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>{type === "expense" ? "Expenses" : type}</button>)}</div></div></div>
        <ScrollArea className="h-[min(520px,60vh)]">
        <div className="divide-y divide-slate-100">
          {filteredTransactions.map((transaction) => {
            const isIncome = transaction.type === "income";
            const isTransfer = transaction.type === "transfer";
            const Icon = isTransfer ? ArrowLeftRight : isIncome ? ArrowDownLeft : ArrowUpRight;
            return (
              <button key={transaction.id} onClick={() => openTransaction(transaction)} className="grid w-full grid-cols-[1fr_auto] items-center gap-4 px-4 py-4 text-left transition hover:bg-slate-50 sm:px-5 md:grid-cols-[1fr_170px_90px_120px]">
                <div className="flex min-w-0 items-center gap-3"><div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${isTransfer ? "bg-blue-50 text-blue-600" : isIncome ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}><Icon size={16} /></div><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{transaction.payee}</p><p className="truncate text-xs text-slate-400 md:hidden">{walletName(transaction.walletId)} · {new Date(`${transaction.date}T12:00:00`).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}</p><p className="hidden truncate text-xs text-slate-400 md:block">{transaction.category}</p></div></div>
                <p className="hidden truncate text-xs text-slate-500 md:block">{isTransfer ? `${walletName(transaction.walletId)} → ${walletName(transaction.targetWalletId)}` : walletName(transaction.walletId)}</p>
                <p className="hidden text-xs text-slate-400 md:block">{new Date(`${transaction.date}T00:00:00`).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}</p>
                <p className={`text-right text-sm font-bold ${isTransfer ? "text-blue-600" : isIncome ? "text-emerald-600" : "text-slate-700"}`}>{isTransfer ? "" : isIncome ? "+" : "-"}{peso.format(transaction.amount)}</p>
              </button>
            );
          })}
          {!filteredTransactions.length && <div className="p-10 text-center"><WalletCards className="mx-auto text-slate-300" /><p className="mt-3 font-semibold text-slate-700">{search ? "No matching transactions" : "No transactions yet"}</p><p className="mt-1 text-sm text-slate-400">{search ? `Nothing matches “${search}”.` : "Add the first transaction for this wallet."}</p>{search ? <button onClick={() => setSearch("")} className="mt-4 text-sm font-bold text-[#167d8d]">Clear search</button> : wallets.length > 0 && <button onClick={openTransactionDialog} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"><Plus size={16} /> Add transaction</button>}</div>}
        </div>
        </ScrollArea>
      </section>

      {dialog === "wallet" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-sm" onMouseDown={() => setDialog("")}>
          <form onSubmit={saveWallet} onMouseDown={(event) => event.stopPropagation()} className="my-auto w-full max-w-lg rounded-3xl bg-white shadow-2xl">
            <div className="p-6">
            <div className="flex items-start justify-between"><div><h3 className="text-xl font-bold">{editingWalletId ? "Edit wallet" : "Add a wallet"}</h3><p className="mt-1 text-sm text-slate-500">{editingWalletId ? "Update this account or remove it." : "Create a manual account and starting balance."}</p></div><button type="button" onClick={() => setDialog("")} aria-label="Close wallet form" className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 hover:bg-slate-100"><X size={18} /></button></div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2"><span className="text-xs font-bold uppercase tracking-wider text-slate-500">Wallet name</span><input value={walletForm.name} onChange={(event) => { setWalletForm({ ...walletForm, name: event.target.value }); setFormError(""); }} placeholder="Example: GCash" className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#74aeb7]" /></label>
              <div><span className="text-xs font-bold uppercase tracking-wider text-slate-500">Type</span><SelectField value={walletForm.type} onValueChange={(type) => setWalletForm({ ...walletForm, type })} options={walletTypes} ariaLabel="Wallet type" className="mt-2" /></div>
              <label><span className="text-xs font-bold uppercase tracking-wider text-slate-500">Starting balance</span><input type="number" step="0.01" value={walletForm.startingBalance} onChange={(event) => { setWalletForm({ ...walletForm, startingBalance: event.target.value }); setFormError(""); }} placeholder="0.00" className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#74aeb7]" /></label>
            </div>
            {formError && <p role="alert" className="mt-3 text-xs font-semibold text-rose-600">{formError}</p>}
            <div className={`mt-7 flex items-center gap-2 ${editingWalletId ? "justify-between" : "justify-end"}`}>{editingWalletId && <button type="button" onClick={() => setConfirmation({ type: "wallet", id: editingWalletId, name: walletForm.name })} aria-label="Delete wallet" title="Delete wallet" className="grid h-10 w-10 place-items-center rounded-xl text-rose-600 hover:bg-rose-50"><Trash2 size={18} /></button>}<div className="flex gap-2"><button type="button" onClick={() => setDialog("")} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-100">Cancel</button><button className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">{editingWalletId ? "Save" : "Add wallet"}</button></div></div>
            </div>
          </form>
        </div>
      )}

      {dialog === "transaction" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-sm" onMouseDown={() => setDialog("")}>
          <form onSubmit={saveTransaction} onMouseDown={(event) => event.stopPropagation()} className="my-auto w-full max-w-xl rounded-3xl bg-white shadow-2xl">
            <div className="p-6">
            <div className="flex items-start justify-between"><div><h3 className="text-xl font-bold">{editingTransactionId ? "Edit transaction" : "Add transaction"}</h3><p className="mt-1 text-sm text-slate-500">Log income, an expense, or a transfer.</p></div><button type="button" onClick={() => setDialog("")} aria-label="Close transaction form" className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 hover:bg-slate-100"><X size={18} /></button></div>
            <div className="mt-6 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">{["expense", "income", "transfer"].map((type) => <button type="button" key={type} onClick={() => setTransactionForm({ ...transactionForm, type })} className={`rounded-lg px-2 py-2 text-xs font-bold capitalize ${transactionForm.type === type ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>{type}</button>)}</div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div><span className="text-xs font-bold uppercase tracking-wider text-slate-500">{transactionForm.type === "transfer" ? "From wallet" : "Wallet"}</span><SelectField value={transactionForm.walletId} onValueChange={(walletId) => setTransactionForm({ ...transactionForm, walletId })} options={wallets.map((wallet) => ({ value: wallet.id, label: wallet.name }))} ariaLabel={transactionForm.type === "transfer" ? "From wallet" : "Wallet"} className="mt-2" /></div>
              {transactionForm.type === "transfer" ? <div><span className="text-xs font-bold uppercase tracking-wider text-slate-500">To wallet</span><SelectField value={transactionForm.targetWalletId} onValueChange={(targetWalletId) => setTransactionForm({ ...transactionForm, targetWalletId })} options={wallets.filter((wallet) => wallet.id !== transactionForm.walletId).map((wallet) => ({ value: wallet.id, label: wallet.name }))} ariaLabel="To wallet" className="mt-2" /></div> : <div><span className="text-xs font-bold uppercase tracking-wider text-slate-500">Category</span><SelectField value={transactionForm.category} onValueChange={(category) => setTransactionForm({ ...transactionForm, category })} options={categories} ariaLabel="Category" className="mt-2" /></div>}
              <label><span className="text-xs font-bold uppercase tracking-wider text-slate-500">Amount</span><input type="number" min="0.01" step="0.01" value={transactionForm.amount} onChange={(event) => { setTransactionForm({ ...transactionForm, amount: event.target.value }); setFormError(""); }} placeholder="0.00" className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#74aeb7]" /></label>
              <div><span className="text-xs font-bold uppercase tracking-wider text-slate-500">Date</span><DatePicker value={transactionForm.date} onChange={(date) => setTransactionForm({ ...transactionForm, date })} /></div>
              <label className="sm:col-span-2"><span className="text-xs font-bold uppercase tracking-wider text-slate-500">{transactionForm.type === "transfer" ? "Description" : "Payee or description"}</span><input value={transactionForm.payee} onChange={(event) => setTransactionForm({ ...transactionForm, payee: event.target.value })} placeholder={transactionForm.type === "transfer" ? "Example: Top up GCash" : "Example: Grocery store"} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#74aeb7]" /></label>
              <label className="sm:col-span-2"><span className="text-xs font-bold uppercase tracking-wider text-slate-500">Note</span><textarea rows={3} value={transactionForm.note} onChange={(event) => setTransactionForm({ ...transactionForm, note: event.target.value })} placeholder="Optional details" className="mt-2 w-full resize-none rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-[#74aeb7]" /></label>
            </div>
            {formError && <p role="alert" className="mt-3 text-xs font-semibold text-rose-600">{formError}</p>}
            <div className={`mt-7 flex items-center gap-2 ${editingTransactionId ? "justify-between" : "justify-end"}`}>{editingTransactionId && <button type="button" onClick={() => setConfirmation({ type: "transaction", id: editingTransactionId, name: transactionForm.payee || "this transaction" })} aria-label="Delete transaction" title="Delete transaction" className="grid h-10 w-10 place-items-center rounded-xl text-rose-600 hover:bg-rose-50"><Trash2 size={18} /></button>}<div className="flex gap-2"><button type="button" onClick={() => setDialog("")} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-100">Cancel</button><button className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">{editingTransactionId ? "Save" : "Add transaction"}</button></div></div>
            </div>
          </form>
        </div>
      )}

      {confirmation && <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/50 p-4" onMouseDown={() => setConfirmation(null)}><div role="alertdialog" aria-modal="true" aria-labelledby="wallet-delete-title" onMouseDown={(event) => event.stopPropagation()} className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-rose-50 text-rose-600"><AlertCircle size={20} /></div><h3 id="wallet-delete-title" className="mt-4 text-lg font-bold text-slate-950">Delete “{confirmation.name}”?</h3><p className="mt-2 text-sm leading-6 text-slate-500">{confirmation.type === "wallet" ? "This also removes every transaction connected to this wallet." : "This transaction will be permanently removed."}</p><div className="mt-6 flex justify-end gap-2"><button onClick={() => setConfirmation(null)} autoFocus className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-100">Keep it</button><button onClick={deleteConfirmed} className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700">Delete</button></div></div></div>}
    </main>
  );
};

export default WalletPage;
