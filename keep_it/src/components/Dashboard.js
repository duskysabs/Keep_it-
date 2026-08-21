"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Activity, AlertTriangle, ArrowDownLeft, ArrowLeftRight, ArrowUpRight, CalendarDays, CheckCircle2, KeyRound, ListTodo, NotebookPen, ShieldCheck, WalletCards } from "lucide-react";
import { relativeDate, useTasks } from "@/context/TaskContext";
import { useWorkspace } from "@/context/WorkspaceContext";

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 });
const plainText = (content = "") => content.replace(/<br\s*\/?>/gi, " ").replace(/<\/div>|<\/p>|<\/li>/gi, " ").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
const shortDate = (value) => value === relativeDate(0) ? "Today" : value === relativeDate(1) ? "Tomorrow" : new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(`${value}T12:00:00`));

const Dashboard = () => {
  const { tasks } = useTasks();
  const { notes, credentials, wallets, transactions, activities } = useWorkspace();
  const [name, setName] = useState("Dusky");
  useEffect(() => {
    const timer = window.setTimeout(() => setName(window.localStorage.getItem("keepit-profile-name") || "Dusky"), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const balanceFor = (walletId) => {
    const wallet = wallets.find((item) => item.id === walletId);
    if (!wallet) return 0;
    return transactions.reduce((balance, transaction) => {
      if (transaction.type === "income" && transaction.walletId === walletId) return balance + transaction.amount;
      if ((transaction.type === "expense" || transaction.type === "transfer") && transaction.walletId === walletId) return balance - transaction.amount;
      if (transaction.type === "transfer" && transaction.targetWalletId === walletId) return balance + transaction.amount;
      return balance;
    }, wallet.startingBalance);
  };

  const totalBalance = wallets.reduce((total, wallet) => total + balanceFor(wallet.id), 0);
  const activeNotes = notes.filter((note) => !note.archived);
  const openTasks = tasks.filter((task) => !task.done);
  const attentionTasks = useMemo(() => tasks.filter((task) => !task.done && task.due).sort((a, b) => a.due.localeCompare(b.due) || a.title.localeCompare(b.title)).slice(0, 3), [tasks]);
  const dashboardNotes = activeNotes.slice().sort((a, b) => Number(b.pinned) - Number(a.pinned)).slice(0, 3);
  const monthTransactions = transactions.filter((transaction) => transaction.date.startsWith(relativeDate(0).slice(0, 7)));
  const monthIncome = monthTransactions.filter((item) => item.type === "income").reduce((total, item) => total + item.amount, 0);
  const monthExpenses = monthTransactions.filter((item) => item.type === "expense").reduce((total, item) => total + item.amount, 0);
  const overdueCount = openTasks.filter((task) => task.due && task.due < relativeDate(0)).length;
  const todayLabel = new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(new Date());
  const activityIcons = { task: CheckCircle2, note: NotebookPen, credential: KeyRound, wallet: WalletCards, transaction: WalletCards };
  const cards = [
    ["/tasks", "Open tasks", openTasks.length, overdueCount ? `${overdueCount} overdue` : "Nothing overdue", ListTodo, "bg-slate-100 text-slate-600"],
    ["/notes", "Notes", activeNotes.length, `${notes.filter((note) => note.pinned && !note.archived).length} pinned`, NotebookPen, "bg-slate-100 text-slate-600"],
    ["/vault", "Credentials", credentials.length, "Protected in your vault", KeyRound, "bg-[#e3f2f4] text-[#167d8d]"],
    ["/wallet", "Total balance", peso.format(totalBalance), `Across ${wallets.length} wallets`, WalletCards, "bg-slate-100 text-slate-600"],
  ];

  return <main className="mx-auto max-w-[1400px] p-4 sm:p-5 lg:p-8">
    <section><p className="text-sm font-semibold text-[#167d8d]">{todayLabel}</p><h2 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Good morning, {name}.</h2><p className="mt-2 text-sm text-slate-500">Here is what needs your attention across Keep_it!.</p></section>

    <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([href, title, value, detail, Icon, tone]) => <Link href={href} key={title} className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-[#b9dadd] hover:shadow-md"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-sm font-medium text-slate-500">{title}</p><p className="mt-2 truncate text-2xl font-bold text-slate-950">{value}</p></div><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tone}`}><Icon size={19} /></span></div><p className="mt-3 text-xs text-slate-400">{detail}</p></Link>)}</section>

    <section className="mt-4 grid gap-4 xl:grid-cols-[1.25fr_0.85fr]">
      <article className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between"><div><h3 className="font-bold text-slate-900">Tasks needing attention</h3><p className="mt-1 text-xs text-slate-400">Your next dated tasks</p></div><Link href="/tasks" className="text-xs font-bold text-[#167d8d]">View all</Link></div><div className="mt-4 space-y-2">{attentionTasks.length ? attentionTasks.map((task) => { const overdue = task.due < relativeDate(0); const today = task.due === relativeDate(0); return <Link href="/tasks" key={task.id} className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-3 hover:bg-slate-50"><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${overdue ? "bg-rose-50 text-rose-600" : today ? "bg-amber-50 text-amber-600" : "bg-[#edf7f8] text-[#167d8d]"}`}><CalendarDays size={15} /></span><span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-700">{task.title}</span><span className={`text-xs ${overdue ? "font-semibold text-rose-600" : today ? "font-semibold text-amber-600" : "text-slate-400"}`}>{overdue ? `Overdue · ${shortDate(task.due)}` : shortDate(task.due)}</span></Link>; }) : <p className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-400">No upcoming tasks.</p>}</div></article>
      <article className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between"><div><h3 className="font-bold text-slate-900">Wallet snapshot</h3><p className="mt-1 text-xs text-slate-400">This month</p></div><Link href="/wallet" className="text-xs font-bold text-[#167d8d]">Open wallet</Link></div><p className="mt-5 text-3xl font-bold text-slate-950">{peso.format(totalBalance)}</p><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl bg-emerald-50 p-3"><p className="text-xs text-emerald-700">Income</p><p className="mt-1 font-bold text-emerald-800">{peso.format(monthIncome)}</p></div><div className="rounded-xl bg-rose-50 p-3"><p className="text-xs text-rose-700">Expenses</p><p className="mt-1 font-bold text-rose-800">{peso.format(monthExpenses)}</p></div></div><div className="mt-4 space-y-2">{transactions.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3).map((item) => { const Icon = item.type === "income" ? ArrowDownLeft : item.type === "expense" ? ArrowUpRight : ArrowLeftRight; const tone = item.type === "income" ? "bg-emerald-50 text-emerald-600" : item.type === "expense" ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-500"; return <Link href="/wallet" key={item.id} className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-3 transition hover:border-[#b9dadd] hover:bg-slate-50"><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${tone}`}><Icon size={15} /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-700">{item.payee}</span><span className="mt-0.5 block text-[10px] capitalize text-slate-400">{item.type} · {shortDate(item.date)}</span></span><span className={`shrink-0 text-xs font-bold ${item.type === "income" ? "text-emerald-600" : item.type === "expense" ? "text-rose-600" : "text-slate-500"}`}>{item.type === "income" ? "+" : item.type === "expense" ? "−" : ""}{peso.format(item.amount)}</span></Link>; })}</div></article>
    </section>

    <section className="mt-4 grid gap-4 xl:grid-cols-[1.15fr_0.95fr]">
      <article className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between"><div><h3 className="font-bold text-slate-900">Pinned and recent notes</h3><p className="mt-1 text-xs text-slate-400">Continue where you left off</p></div><Link href="/notes" className="text-xs font-bold text-[#167d8d]">View all</Link></div><div className="mt-4 grid gap-3 sm:grid-cols-3">{dashboardNotes.map((note) => <Link href="/notes" key={note.id} className="min-w-0 rounded-xl border border-slate-100 p-3 hover:bg-slate-50"><div className="flex items-center gap-2"><NotebookPen size={14} className="text-[#167d8d]" /><p className="truncate text-sm font-bold text-slate-800">{plainText(note.title) || "Untitled note"}</p></div><p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400">{plainText(note.content) || "Empty note"}</p><div className="mt-3 flex justify-between text-[10px] text-slate-400"><span>{note.tag}</span><span>{note.updatedAt}</span></div></Link>)}</div></article>
      <article className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between"><div><h3 className="font-bold text-slate-900">Vault protection</h3><p className="mt-1 text-xs text-slate-400">Security health</p></div><ShieldCheck size={19} className="text-amber-500" /></div><div className="mt-5 flex items-end justify-between"><p className="text-3xl font-bold text-slate-950">2/3</p><span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">Needs attention</span></div><div className="mt-3 h-2 rounded-full bg-slate-100"><div className="h-full w-2/3 rounded-full bg-amber-400" /></div><div className="mt-4 space-y-2 text-xs text-slate-500"><p className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-600" /> Master password configured</p><p className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-600" /> Auto-lock enabled</p><p className="flex items-center gap-2"><AlertTriangle size={14} className="text-amber-500" /> Encrypted backup needed</p></div><Link href="/settings#security" className="mt-5 inline-flex text-xs font-bold text-[#167d8d]">Review security</Link></article>
    </section>

    <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2"><Activity size={18} className="text-slate-400" /><div><h3 className="font-bold text-slate-900">Recent activity</h3><p className="mt-1 text-xs text-slate-400">Changes made during this session</p></div></div>{activities.length ? <div className="mt-4 divide-y divide-slate-100">{activities.slice(0, 5).map((item) => { const Icon = activityIcons[item.type] || Activity; return <div key={item.id} className="flex items-center gap-3 py-3"><span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-500"><Icon size={15} /></span><span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-slate-700">{item.action}</span><span className="block truncate text-[11px] text-slate-400">{item.item}</span></span><span className="text-[11px] text-slate-400">{item.time}</span></div>; })}</div> : <p className="mt-4 rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-400">Your latest edits will appear here.</p>}</section>
  </main>;
};

export default Dashboard;
