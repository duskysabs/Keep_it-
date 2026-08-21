"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, AlertTriangle, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Plus, Search, Trash2, X } from "lucide-react";
import DatePicker from "@/components/ui/DatePicker";
import SelectField from "@/components/ui/SelectField";
import { relativeDate, toISODate, useTasks } from "@/context/TaskContext";
import { useWorkspace } from "@/context/WorkspaceContext";

const monthName = (date) => new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(date);
const shortDate = (value) => new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(`${value}T12:00:00`));
const addDays = (date, days) => { const next = new Date(date); next.setDate(next.getDate() + days); return next; };
const startOfWeek = (date) => addDays(date, -date.getDay());
const monthKey = (date) => toISODate(date).slice(0, 7);

const TaskChip = ({ task, onOpen, compact = false }) => (
  <button type="button" onClick={(event) => { event.stopPropagation(); onOpen(task); }} title={`Open ${task.title}`} className={`block w-full truncate rounded-lg border text-left transition hover:bg-[#e4f2f4] ${compact ? "px-1.5 py-1 text-[9px]" : "px-2 py-1.5 text-[10px]"} ${task.done ? "border-slate-200 bg-slate-100 text-slate-400 line-through" : "border-[#c7e1e5] bg-[#f2f9fa] text-[#116b78]"}`}>
    {task.title}
  </button>
);

const DayTaskCard = ({ task, onOpen }) => (
  <button type="button" onClick={() => onOpen(task)} className="group flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left transition hover:border-[#b9dadd] hover:shadow-sm sm:px-5">
    <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${task.done ? "border-[#167d8d] bg-[#167d8d] text-white" : "border-slate-300 bg-white"}`}>
      {task.done && <CheckCircle2 size={15} />}
    </span>
    <span className="min-w-0 flex-1">
      <span className={`block truncate text-sm font-bold sm:text-base ${task.done ? "text-slate-400 line-through" : "text-slate-900"}`}>{task.title}</span>
      <span className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1 text-slate-400"><CalendarDays size={13} /> {relativeDate(0) === task.due ? "Today" : shortDate(task.due)}</span>
      </span>
    </span>
    <ChevronRight size={17} className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
  </button>
);

const CalendarPage = () => {
  const { tasks, addTask, updateTask, deleteTask } = useTasks();
  const { recordActivity } = useWorkspace();
  const [view, setView] = useState("Month");
  const [cursor, setCursor] = useState(() => new Date());
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState(relativeDate(0));
  const [done, setDone] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [titleError, setTitleError] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

  useEffect(() => {
    if (!showForm && !confirmDelete && !selectedDate) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [showForm, confirmDelete, selectedDate]);

  const matchingTasks = useMemo(() => tasks.filter((task) => task.title.toLowerCase().includes(search.toLowerCase())), [tasks, search]);
  const tasksByDate = useMemo(() => matchingTasks.reduce((grouped, task) => {
    if (!task.due) return grouped;
    if (!grouped[task.due]) grouped[task.due] = [];
    grouped[task.due].push(task);
    return grouped;
  }, {}), [matchingTasks]);

  const monthDays = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1, 12);
    const gridStart = startOfWeek(first);
    return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
  }, [cursor]);

  const weekDays = useMemo(() => {
    const first = startOfWeek(cursor);
    return Array.from({ length: 7 }, (_, index) => addDays(first, index));
  }, [cursor]);

  const currentMonthTasks = matchingTasks.filter((task) => task.due?.startsWith(monthKey(cursor)));
  const openThisMonth = currentMonthTasks.filter((task) => !task.done).length;
  const completedThisMonth = currentMonthTasks.filter((task) => task.done).length;
  const overdue = tasks.filter((task) => !task.done && task.due && task.due < relativeDate(0));
  const upcoming = tasks.filter((task) => !task.done && task.due && task.due >= relativeDate(0)).sort((a, b) => a.due.localeCompare(b.due)).slice(0, 4);

  const move = (direction) => setCursor((current) => {
    const next = new Date(current);
    if (view === "Week") next.setDate(next.getDate() + direction * 7);
    if (view === "Month") next.setMonth(next.getMonth() + direction);
    if (view === "Year") next.setFullYear(next.getFullYear() + direction);
    return next;
  });

  const openAddForDate = (date = cursor) => {
    setEditingId("");
    setTitle("");
    setDue(toISODate(date));
    setDone(false);
    setConfirmDelete(false);
    setTitleError("");
    setShowForm(true);
  };

  const openTask = (task) => {
    setEditingId(task.id);
    setTitle(task.title);
    setDue(task.due || "");
    setDone(task.done);
    setConfirmDelete(false);
    setTitleError("");
    setShowForm(true);
  };

  useEffect(() => {
    if (!showForm && !confirmDelete && !selectedDate) return;
    const handleEscape = (event) => {
      if (event.key !== "Escape") return;
      if (confirmDelete) setConfirmDelete(false);
      else if (showForm) {
        setShowForm(false);
        setEditingId("");
        setTitleError("");
      } else setSelectedDate("");
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [showForm, confirmDelete, selectedDate]);

  const saveTask = (event) => {
    event.preventDefault();
    if (!title.trim()) {
      setTitleError("Enter a task title before saving.");
      return;
    }
    if (editingId) { updateTask(editingId, { title: title.trim(), due, done }); recordActivity("task", "Updated a task", title.trim()); }
    else { addTask({ title: title.trim(), due }); recordActivity("task", "Added a task", title.trim()); }
    setShowForm(false);
  };

  const removeTask = () => {
    recordActivity("task", "Deleted a task", title);
    deleteTask(editingId);
    setConfirmDelete(false);
    setShowForm(false);
    setEditingId("");
  };

  const periodTitle = view === "Year" ? String(cursor.getFullYear()) : view === "Week" ? `${shortDate(toISODate(weekDays[0]))} – ${shortDate(toISODate(weekDays[6]))}` : monthName(cursor);
  const selectedTasks = selectedDate ? tasksByDate[selectedDate] || [] : [];

  return (
    <main className="mx-auto max-w-[1400px] p-4 sm:p-5 lg:p-8">
      <div className="relative flex flex-col gap-4">
        <div><h2 className="text-2xl font-bold text-slate-950">Calendar</h2><p className="mt-1 text-sm text-slate-500">See every dated task across your schedule.</p></div>
        <div className="grid w-full gap-2 xl:flex xl:w-auto xl:flex-wrap xl:items-center">
          <label className="relative block xl:w-56"><span className="sr-only">Search calendar tasks</span><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tasks" className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-[#74aeb7]" /></label>
          <div className="grid w-fit max-w-full grid-cols-[minmax(0,9rem)_auto] items-center gap-2">
            <SelectField value={view} onValueChange={setView} options={["Week", "Month", "Year"]} ariaLabel="Calendar view" compact className="w-36 max-w-full" />
            <div className="flex items-center gap-1"><button onClick={() => move(-1)} aria-label={`Previous ${view.toLowerCase()}`} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"><ChevronLeft size={17} /></button><button onClick={() => move(1)} aria-label={`Next ${view.toLowerCase()}`} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"><ChevronRight size={17} /></button></div>
          </div>
          <button onClick={() => openAddForDate()} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-700 sm:col-span-2 lg:absolute lg:right-0 lg:top-0 lg:w-auto xl:col-span-1"><Plus size={16} /> Add task</button>
        </div>
      </div>

      <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5"><div><h3 className="font-bold text-slate-900">{periodTitle}</h3><p className="mt-1 text-xs text-slate-400">{openThisMonth} open · {completedThisMonth} completed</p></div>{search && <button onClick={() => setSearch("")} className="text-xs font-bold text-[#167d8d]">Clear search</button>}</div>

        {view === "Month" && <div><div><div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <div key={day} className="px-1 py-2 text-center text-[9px] font-bold uppercase tracking-wider text-slate-400 sm:px-2 sm:text-[10px]">{day}</div>)}</div><div className="grid grid-cols-7">{monthDays.map((date) => {
          const iso = toISODate(date); const dayTasks = tasksByDate[iso] || []; const outside = date.getMonth() !== cursor.getMonth(); const today = iso === relativeDate(0);
          return <div key={iso} role="button" tabIndex={0} onClick={() => setSelectedDate(iso)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedDate(iso); } }} aria-label={`Show tasks for ${iso}`} className={`min-h-20 cursor-pointer border-b border-r border-slate-100 p-1 text-left align-top transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#74aeb7] sm:min-h-28 sm:p-2 ${selectedDate === iso ? "bg-[#f2f9fa] ring-2 ring-inset ring-[#74aeb7]" : outside ? "bg-slate-50/50" : "bg-white"}`}><span className={`inline-grid h-6 min-w-6 place-items-center rounded-lg px-1 text-[10px] font-semibold sm:h-7 sm:min-w-7 sm:text-xs ${today ? "bg-[#167d8d] text-white" : outside ? "text-slate-300" : "text-slate-600"}`}>{date.getDate()}</span><div className="mt-1 space-y-1 sm:mt-1.5">{dayTasks.slice(0, 2).map((task) => <TaskChip key={task.id} task={task} onOpen={openTask} compact />)}{dayTasks.length > 2 && <p className="px-1 text-[8px] font-semibold text-slate-400 sm:text-[9px]">+{dayTasks.length - 2} more</p>}</div></div>;
        })}</div></div></div>}

        {view === "Week" && <div className="grid min-h-[420px] grid-cols-1 divide-y divide-slate-100 sm:grid-cols-7 sm:divide-x sm:divide-y-0">{weekDays.map((date) => { const iso = toISODate(date); const dayTasks = tasksByDate[iso] || []; return <div key={iso} role="button" tabIndex={0} onClick={() => setSelectedDate(iso)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedDate(iso); } }} className={`min-h-32 cursor-pointer p-3 text-left hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#74aeb7] sm:min-h-[420px] ${selectedDate === iso ? "bg-[#f2f9fa]" : ""}`}><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{new Intl.DateTimeFormat("en", { weekday: "short" }).format(date)}</p><span className={`mt-1 inline-grid h-8 w-8 place-items-center rounded-lg text-sm font-bold ${iso === relativeDate(0) ? "bg-[#167d8d] text-white" : "text-slate-700"}`}>{date.getDate()}</span><div className="mt-3 space-y-2">{dayTasks.map((task) => <TaskChip key={task.id} task={task} onOpen={openTask} />)}</div></div>; })}</div>}

        {view === "Year" && <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 12 }, (_, month) => { const date = new Date(cursor.getFullYear(), month, 1, 12); const count = matchingTasks.filter((task) => task.due?.startsWith(monthKey(date))).length; return <button key={month} onClick={() => { setCursor(date); setView("Month"); }} className="rounded-2xl border border-slate-200 p-4 text-left transition hover:border-[#b9dadd] hover:shadow-sm"><div className="flex items-center justify-between"><h4 className="font-bold text-slate-800">{new Intl.DateTimeFormat("en", { month: "long" }).format(date)}</h4><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500">{count}</span></div><div className="mt-4 grid grid-cols-7 gap-1 text-center text-[9px] text-slate-400">{Array.from({ length: new Date(cursor.getFullYear(), month + 1, 0).getDate() }, (_, index) => { const iso = toISODate(new Date(cursor.getFullYear(), month, index + 1, 12)); const hasTasks = Boolean(tasksByDate[iso]?.length); return <span key={iso} className={`grid h-5 place-items-center rounded ${hasTasks ? "bg-[#e4f2f4] font-bold text-[#116b78]" : ""}`}>{index + 1}</span>; })}</div></button>; })}</div>}

        <div className="border-t border-slate-100 bg-slate-50/60 p-4"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Period summary</p><h4 className="mt-1 font-bold text-slate-800">{matchingTasks.filter((task) => task.due).length ? "Activity planned" : "No dated tasks"}</h4><p className="mt-1 text-xs text-slate-400">A quick snapshot of tasks in this calendar.</p></div>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2 text-slate-700"><CalendarDays size={17} className="text-[#167d8d]" /><h3 className="font-bold">This month</h3></div><dl className="mt-5 space-y-3 text-sm"><div className="flex justify-between"><dt className="text-slate-500">Open tasks</dt><dd className="font-bold text-slate-900">{openThisMonth}</dd></div><div className="flex justify-between"><dt className="text-slate-500">Completed</dt><dd className="font-bold text-slate-900">{completedThisMonth}</dd></div><div className="flex justify-between"><dt className="text-slate-500">Total dated</dt><dd className="font-bold text-slate-900">{currentMonthTasks.length}</dd></div></dl></article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2 text-slate-700"><Clock3 size={17} className="text-[#167d8d]" /><h3 className="font-bold">Upcoming tasks</h3></div><div className="mt-4 space-y-2">{upcoming.length ? upcoming.map((task) => <button key={task.id} onClick={() => openTask(task)} title={`Open ${task.title}`} className="flex w-full items-center gap-2 rounded-xl border border-slate-100 px-3 py-2 text-left hover:bg-slate-50"><span className="h-2 w-2 rounded-full bg-[#167d8d]" /><span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-700">{task.title}</span><span className="text-[10px] text-slate-400">{shortDate(task.due)}</span></button>) : <p className="text-sm text-slate-400">No upcoming dated tasks.</p>}</div></article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2 text-slate-700"><AlertTriangle size={17} className="text-rose-500" /><h3 className="font-bold">Needs attention</h3></div><div className="mt-5 flex items-center justify-between"><span className="text-sm text-slate-500">Overdue</span><span className={`text-lg font-bold ${overdue.length ? "text-rose-600" : "text-emerald-600"}`}>{overdue.length}</span></div>{!overdue.length && <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"><CheckCircle2 size={14} /> All caught up</div>}</article>
      </section>

      {selectedDate && view !== "Year" && !showForm && <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-sm" onMouseDown={() => setSelectedDate("")}><section role="dialog" aria-modal="true" aria-labelledby="selected-day-title" onMouseDown={(event) => event.stopPropagation()} className="my-auto w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"><div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5 sm:p-6"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Day schedule</p><h3 id="selected-day-title" className="mt-1 text-xl font-bold text-slate-900">{new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date(`${selectedDate}T12:00:00`))}</h3><p className="mt-1 text-sm text-slate-400">{selectedTasks.length} {selectedTasks.length === 1 ? "task" : "tasks"} scheduled</p></div><button type="button" onClick={() => setSelectedDate("")} aria-label="Close day schedule" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={18} /></button></div><div className="max-h-[min(55vh,32rem)] overflow-y-auto p-4 sm:p-5"><div className="space-y-3">{selectedTasks.length ? selectedTasks.map((task) => <DayTaskCard key={task.id} task={task} onOpen={openTask} />) : <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-4 py-8 text-center"><CalendarDays className="mx-auto text-slate-300" size={24} /><p className="mt-2 text-sm font-semibold text-slate-600">Nothing scheduled for this day</p><p className="mt-1 text-xs text-slate-400">Add a task when you want to plan something.</p></div>}</div></div><div className="border-t border-slate-100 p-4 sm:px-5"><button type="button" onClick={() => openAddForDate(new Date(`${selectedDate}T12:00:00`))} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-700"><Plus size={16} /> Add task</button></div></section></div>}

      {showForm && <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-sm" onMouseDown={() => setShowForm(false)}><form onSubmit={saveTask} onMouseDown={(event) => event.stopPropagation()} className="my-auto w-full max-w-lg"><div className="rounded-3xl bg-white shadow-2xl"><div className="p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><h3 className="text-xl font-bold">{editingId ? "Edit task" : "Add calendar task"}</h3><p className="mt-1 text-sm text-slate-500">{editingId ? "Update the task details or remove it." : "This task will also appear on the Tasks page."}</p></div><button type="button" onClick={() => setShowForm(false)} aria-label="Close calendar task form" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-400 hover:bg-slate-100"><X size={18} /></button></div><label className="mt-6 block"><span className="text-xs font-bold uppercase tracking-wider text-slate-500">Task title</span><input autoFocus aria-invalid={Boolean(titleError)} aria-describedby={titleError ? "calendar-task-title-error" : undefined} value={title} onChange={(event) => { setTitle(event.target.value); if (event.target.value.trim()) setTitleError(""); }} placeholder="What needs to be done?" className={`mt-2 h-11 w-full rounded-xl border px-3 text-sm outline-none focus:ring-2 ${titleError ? "border-rose-400 focus:border-rose-400 focus:ring-rose-100" : "border-slate-200 focus:border-[#74aeb7] focus:ring-[#dceff1]"}`} />{titleError && <span id="calendar-task-title-error" role="alert" className="mt-2 block text-xs font-medium text-rose-600">{titleError}</span>}</label><div className="mt-4"><span className="text-xs font-bold uppercase tracking-wider text-slate-500">Due date</span><DatePicker value={due} onChange={setDue} /></div>{editingId && <label className="mt-4 flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600"><input type="checkbox" checked={done} onChange={(event) => setDone(event.target.checked)} className="h-4 w-4 accent-[#167d8d]" /> Task completed</label>}<div className={`mt-7 flex items-center gap-2 ${editingId ? "justify-between" : "justify-end"}`}>{editingId && <button type="button" onClick={() => setConfirmDelete(true)} aria-label="Delete task" title="Delete task" className="grid h-10 w-10 place-items-center rounded-xl text-rose-500 hover:bg-rose-50"><Trash2 size={18} /></button>}<div className="flex gap-2"><button type="button" onClick={() => setShowForm(false)} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-100">Cancel</button><button className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">{editingId ? "Save" : "Add task"}</button></div></div></div></div></form></div>}
      {confirmDelete && <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm" onMouseDown={() => setConfirmDelete(false)}><div role="alertdialog" aria-modal="true" aria-labelledby="delete-calendar-task-title" onMouseDown={(event) => event.stopPropagation()} className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-rose-50 text-rose-500"><AlertCircle size={21} /></div><h3 id="delete-calendar-task-title" className="mt-4 text-lg font-bold text-slate-900">Delete “{title}”?</h3><p className="mt-2 text-sm leading-6 text-slate-500">This removes the task from both Calendar and Tasks.</p><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setConfirmDelete(false)} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-100">Keep task</button><button type="button" onClick={removeTask} className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700">Delete</button></div></div></div>}
    </main>
  );
};

export default CalendarPage;
