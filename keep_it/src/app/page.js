import { Activity, ArrowUpRight, CheckCircle2, KeyRound, ListTodo, NotebookPen, ShieldCheck, WalletCards } from "lucide-react";
import SummaryCard from "../components/SummaryCard";
import Dashboard from "../components/Dashboard";

const tasks = [
  { title: "Review monthly budget", due: "Today", tone: "bg-amber-500" },
  { title: "Organize vault entries", due: "Tomorrow", tone: "bg-[#167d8d]" },
  { title: "Plan next week", due: "Fri", tone: "bg-blue-500" },
];

export const LegacyHomePage = () => {
  return (
    <main className="mx-auto max-w-[1500px] p-5 lg:p-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#167d8d]">Thursday, August 20</p>
          <h2 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Good morning, Dusky.</h2>
          <p className="mt-2 text-sm text-slate-500">Here is everything happening across your personal workspace.</p>
        </div>
        <button type="button" className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700">
          Quick add <ArrowUpRight size={16} />
        </button>
      </section>

      <section className="mt-7 grid gap-4 sm:grid-cols-3">
        <SummaryCard title="Credentials" value="8" detail="All entries protected" icon={KeyRound} />
        <SummaryCard title="Notes" value="12" detail="3 edited this week" icon={NotebookPen} accent="blue" />
        <SummaryCard title="Open tasks" value="5" detail="1 task needs attention" icon={ListTodo} accent="amber" />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1.55fr_0.85fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-bold text-slate-900">Income activity</p>
              <p className="mt-1 text-xs text-slate-400">Your last six months at a glance</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">+8.4%</span>
          </div>
          <div className="mt-6 flex items-end justify-between gap-3 border-b border-slate-100 pb-1">
            {[42, 67, 53, 82, 75, 94].map((height, index) => (
              <div key={height} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex h-40 w-full items-end rounded-xl bg-slate-50 px-2 pt-2">
                  <div className="w-full rounded-t-lg bg-gradient-to-t from-[#167d8d] to-[#78b9c2]" style={{ height: `${height}%` }} />
                </div>
                <span className="text-[11px] font-medium text-slate-400">{["Mar", "Apr", "May", "Jun", "Jul", "Aug"][index]}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-900">Activity log</p>
              <p className="mt-1 text-xs text-slate-400">Latest across your workspace</p>
            </div>
            <Activity size={18} className="text-slate-400" />
          </div>
          <div className="mt-4 divide-y divide-slate-100">
            {[
              [CheckCircle2, "Completed a task", "Review monthly budget", "10m", "text-emerald-600 bg-emerald-50"],
              [NotebookPen, "Edited a note", "Ideas for Keep_it!", "1h", "text-blue-600 bg-blue-50"],
              [WalletCards, "Added an expense", "Groceries · ₱2,460", "1d", "text-amber-600 bg-amber-50"],
              [KeyRound, "Updated a credential", "GitHub", "2d", "text-[#167d8d] bg-[#e3f2f4]"],
            ].map(([Icon, action, item, time, tone]) => (
              <div key={action} className="flex items-center gap-3 py-3">
                <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${tone}`}>
                  <Icon size={15} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-slate-700">{action}</p>
                  <p className="truncate text-[11px] text-slate-400">{item}</p>
                </div>
                <span className="text-[11px] text-slate-400">{time}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-slate-900">Upcoming tasks</p>
            <a href="/tasks" className="text-xs font-bold text-[#167d8d] hover:underline">View all</a>
          </div>
          <div className="mt-4 space-y-2">
            {tasks.map((task) => (
              <div key={task.title} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                <div className="flex items-center gap-3">
                  <span className={`h-2 w-2 rounded-full ${task.tone}`} />
                  <p className="text-sm font-medium text-slate-700">{task.title}</p>
                </div>
                <span className="text-xs text-slate-400">{task.due}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-900">Vault protection</p>
              <p className="mt-1 text-xs text-slate-400">Security health</p>
            </div>
            <ShieldCheck size={19} className="text-emerald-600" />
          </div>
          <div className="mt-5 flex items-end justify-between">
            <p className="text-3xl font-bold text-slate-950">3/3</p>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">Ready</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-full rounded-full bg-[#167d8d]" /></div>
          <div className="mt-4 grid gap-2 text-xs text-slate-500">
            {["Backup is current", "Auto-lock is enabled", "Recovery code is ready"].map((item) => (
              <div key={item} className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-600" />{item}</div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
};

export default Dashboard;
