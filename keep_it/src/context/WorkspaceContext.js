"use client";

import { createContext, useContext, useState } from "react";

const starterNotes = [
  { id: "1", title: "<p><strong>Ideas for Keep_it!</strong></p>", content: "<p>A calm personal workspace for notes, tasks, finances, and important credentials.</p><p>Next ideas:</p><ul><li><p>Add a weekly review</p></li><li><p>Improve global search</p></li><li><p>Create a focus mode</p></li></ul>", tag: "Work", pinned: true, archived: false, updatedAt: "10 minutes ago" },
  { id: "2", title: "<p><strong>Books to read</strong></p>", content: "<p>The Design of Everyday Things</p><p>Atomic Habits</p><p>The Creative Act</p>", tag: "Personal", pinned: false, archived: false, updatedAt: "Yesterday" },
  { id: "3", title: "<p><strong>Project checklist</strong></p>", content: "<p>Finish the frontend</p><p>Connect the database</p><p>Add authentication</p><p>Test the complete application</p>", tag: "Work", pinned: false, archived: false, updatedAt: "Aug 18" },
  { id: "4", title: "<p><strong>Old shopping list</strong></p>", content: "<p>Keyboard stand</p><p>Desk lamp</p><p>Storage boxes</p>", tag: "Personal", pinned: false, archived: true, updatedAt: "Aug 12" },
];

const starterCredentials = [
  { id: "1", name: "GitHub", username: "dusky.dev", password: "demo-password", url: "https://github.com", notes: "Personal development account", color: "bg-slate-900" },
  { id: "2", name: "Vercel", username: "dusky@example.com", password: "frontend-only", url: "https://vercel.com", notes: "", color: "bg-black" },
  { id: "3", name: "Google", username: "dusky@example.com", password: "not-a-real-secret", url: "https://google.com", notes: "", color: "bg-blue-600" },
  { id: "4", name: "Home Wi-Fi", username: "KeepIt_Network", password: "sample-value", url: "", notes: "Home network", color: "bg-[#167d8d]" },
];

const starterWallets = [
  { id: "gcash", name: "GCash", type: "E-wallet", startingBalance: 8500 },
  { id: "bpi", name: "BPI Savings", type: "Bank", startingBalance: 54200 },
  { id: "cash", name: "Cash", type: "Cash", startingBalance: 5200 },
];

const starterTransactions = [
  { id: "1", walletId: "bpi", targetWalletId: "", type: "income", amount: 48000, category: "Salary", payee: "Salary", date: "2026-08-15", note: "" },
  { id: "2", walletId: "gcash", targetWalletId: "", type: "expense", amount: 2460, category: "Food", payee: "Groceries", date: "2026-08-18", note: "" },
  { id: "3", walletId: "gcash", targetWalletId: "", type: "expense", amount: 1699, category: "Utilities", payee: "Internet bill", date: "2026-08-18", note: "" },
  { id: "4", walletId: "bpi", targetWalletId: "", type: "income", amount: 12500, category: "Income", payee: "Freelance project", date: "2026-08-19", note: "" },
  { id: "5", walletId: "bpi", targetWalletId: "gcash", type: "transfer", amount: 3000, category: "Transfer", payee: "BPI to GCash", date: "2026-08-20", note: "" },
];

const WorkspaceContext = createContext(null);

export const WorkspaceProvider = ({ children }) => {
  const [notes, setNotes] = useState(starterNotes);
  const [credentials, setCredentials] = useState(starterCredentials);
  const [wallets, setWallets] = useState(starterWallets);
  const [transactions, setTransactions] = useState(starterTransactions);
  const [activities, setActivities] = useState([]);

  const recordActivity = (type, action, item) => setActivities((current) => [{ id: crypto.randomUUID(), type, action, item, time: "Just now" }, ...current].slice(0, 30));

  return <WorkspaceContext.Provider value={{ notes, setNotes, credentials, setCredentials, wallets, setWallets, transactions, setTransactions, activities, recordActivity }}>{children}</WorkspaceContext.Provider>;
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return context;
};
