"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CalendarDays, Check, Circle, Plus, Search, Trash2, X } from "lucide-react";
import DatePicker from "@/components/ui/DatePicker";
import SelectField from "@/components/ui/SelectField";
import { relativeDate, useTasks } from "@/context/TaskContext";
import { useWorkspace } from "@/context/WorkspaceContext";

const dateLabel = (dateString) => {
  if (!dateString) return "No date";
  if (dateString === relativeDate(0)) return "Today";
  if (dateString === relativeDate(1)) return "Tomorrow";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(`${dateString}T12:00:00`));
};

const taskTiming = (task) => {
  if (task.done || !task.due) return "normal";
  if (task.due < relativeDate(0)) return "overdue";
  if (task.due === relativeDate(0)) return "today";
  return "normal";
};

const TasksPage = () => {
  const { tasks, addTask, updateTask, deleteTask, toggleTask } = useTasks();
  const { recordActivity } = useWorkspace();
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [done, setDone] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [titleError, setTitleError] = useState("");

  useEffect(() => {
    if (!showForm && !confirmDelete) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [showForm, confirmDelete]);

  const counts = useMemo(() => ({
    All: tasks.length,
    Active: tasks.filter((task) => !task.done).length,
    Completed: tasks.filter((task) => task.done).length,
  }), [tasks]);

  const visibleTasks = useMemo(() => tasks
    .filter((task) => filter === "All" || (filter === "Completed" ? task.done : !task.done))
    .filter((task) => task.title.toLowerCase().includes(search.toLowerCase()))
    .sort((first, second) => {
      if (first.done !== second.done) return Number(first.done) - Number(second.done);
      if (!first.due && second.due) return 1;
      if (first.due && !second.due) return -1;
      if (first.due !== second.due) return first.due.localeCompare(second.due);
      return first.title.localeCompare(second.title);
    }), [tasks, filter, search]);

  const summary = filter === "All"
    ? `${counts.All} total · ${counts.Active} remaining`
    : filter === "Active"
      ? `${counts.Active} ${counts.Active === 1 ? "active task" : "active tasks"}`
      : `${counts.Completed} completed ${counts.Completed === 1 ? "task" : "tasks"}`;

  const resetForm = () => {
    setEditingId("");
    setTitle("");
    setDue("");
    setDone(false);
    setConfirmDelete(false);
    setTitleError("");
  };

  const closeForm = () => {
    setShowForm(false);
    resetForm();
  };

  const openNewTask = () => {
    resetForm();
    setShowForm(true);
  };

  const openTask = (task) => {
    setEditingId(task.id);
    setTitle(task.title);
    setDue(task.due);
    setDone(task.done);
    setConfirmDelete(false);
    setShowForm(true);
  };

  useEffect(() => {
    if (!showForm && !confirmDelete) return;
    const handleEscape = (event) => {
      if (event.key !== "Escape") return;
      if (confirmDelete) {
        setConfirmDelete(false);
        return;
      }
      setShowForm(false);
      setEditingId("");
      setTitle("");
      setDue("");
      setDone(false);
      setTitleError("");
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [showForm, confirmDelete]);

  const saveTask = async (event) => {
    event.preventDefault();
    if (!title.trim()) {
      setTitleError("Enter a task title before saving.");
      return;
    }
    if (editingId) {
      await updateTask(editingId, { title: title.trim(), due, done });
      recordActivity("task", "Updated a task", title.trim());
    } else {
      await addTask({ title: title.trim(), due });
      recordActivity("task", "Added a task", title.trim());
    }
    closeForm();
  };

  const handleToggleTask = async (id) => {
    const selectedTask = tasks.find((task) => task.id === id);
    await toggleTask(id);
    if (selectedTask) recordActivity("task", selectedTask.done ? "Reopened a task" : "Completed a task", selectedTask.title);
  };

  const handleDeleteTask = async () => {
    await deleteTask(editingId);
    recordActivity("task", "Deleted a task", title);
    setConfirmDelete(false);
    closeForm();
  };

  return (
    <main className="mx-auto max-w-[1400px] p-4 sm:p-5 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><h2 className="text-2xl font-bold text-slate-950">Your tasks</h2><p className="mt-1 text-sm text-slate-500">Plan the work, clear the list, and protect your focus.</p></div>
        <button onClick={openNewTask} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 sm:w-auto sm:self-start"><Plus size={16} /> New task</button>
      </div>

      <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <SelectField value={filter} onValueChange={setFilter} options={["All", "Active", "Completed"].map((item) => ({ value: item, label: `${item} (${counts[item]})` }))} ariaLabel="Filter tasks" compact className="w-full lg:w-48" />
          <label className="relative block w-full lg:w-72"><span className="sr-only">Search tasks</span><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tasks" className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-[#74aeb7] focus:bg-white" /></label>
        </div>
      </section>

      <div className="mt-5 flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{filter} tasks</p><p className="text-xs text-slate-400">{summary}</p></div>

      <section className="mt-3 space-y-3">
        {visibleTasks.map((task) => {
          const timing = taskTiming(task);
          return <article key={task.id} role="button" tabIndex={0} onClick={() => openTask(task)} onKeyDown={(event) => { if (event.target !== event.currentTarget) return; if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openTask(task); } }} className="group flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-[#b9dadd] hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#74aeb7]">
            <button onClick={(event) => { event.stopPropagation(); handleToggleTask(task.id); }} aria-label={task.done ? "Mark task active" : "Complete task"} className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border transition ${task.done ? "border-[#167d8d] bg-[#167d8d] text-white" : "border-slate-300 text-transparent hover:border-[#167d8d]"}`}>{task.done ? <Check size={14} /> : <Circle size={12} />}</button>
            <div className="min-w-0 flex-1"><p className={`truncate text-sm font-semibold ${task.done ? "text-slate-400 line-through" : "text-slate-800"}`}>{task.title}</p><div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-slate-400"><span className={`flex items-center gap-1 ${timing === "overdue" ? "font-semibold text-rose-600" : timing === "today" ? "font-semibold text-amber-600" : ""}`}><CalendarDays size={12} />{timing === "overdue" ? `Overdue · ${dateLabel(task.due)}` : dateLabel(task.due)}</span></div></div>
          </article>;
        })}
        {!visibleTasks.length && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center"><Check className="mx-auto text-emerald-500" /><p className="mt-3 font-semibold text-slate-700">{search ? "No matching tasks" : "Nothing here"}</p><p className="mt-1 text-sm text-slate-400">{search ? `Nothing matches “${search}”.` : "You are all caught up in this view."}</p>{search && <button onClick={() => setSearch("")} className="mt-4 text-sm font-bold text-[#167d8d]">Clear search</button>}</div>}
      </section>

      {showForm && <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-sm" onMouseDown={closeForm} onKeyDown={(event) => { if (event.key === "Escape" && !event.defaultPrevented) closeForm(); }}>
        <form onSubmit={saveTask} onMouseDown={(event) => event.stopPropagation()} className="my-auto w-full max-w-lg">
          <div className="rounded-3xl bg-white shadow-2xl">
            <div className="p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4"><div><h3 className="text-xl font-bold text-slate-950">{editingId ? "Edit task" : "Add a task"}</h3><p className="mt-1 text-sm text-slate-500">{editingId ? "Update the task details or remove it." : "Capture what needs to be done."}</p></div><button type="button" onClick={closeForm} aria-label="Close task form" className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={18} /></button></div>
              <label className="mt-6 block"><span className="text-xs font-bold uppercase tracking-wider text-slate-500">Task title</span><input autoFocus aria-invalid={Boolean(titleError)} aria-describedby={titleError ? "task-title-error" : undefined} value={title} onChange={(event) => { setTitle(event.target.value); if (event.target.value.trim()) setTitleError(""); }} placeholder="What needs to be done?" className={`mt-2 h-11 w-full rounded-xl border px-3 text-sm outline-none focus:ring-2 ${titleError ? "border-rose-400 focus:border-rose-400 focus:ring-rose-100" : "border-slate-200 focus:border-[#74aeb7] focus:ring-[#dceff1]"}`} />{titleError && <span id="task-title-error" role="alert" className="mt-2 block text-xs font-medium text-rose-600">{titleError}</span>}</label>
              <div className="mt-4"><span className="text-xs font-bold uppercase tracking-wider text-slate-500">Due date <span className="font-normal normal-case text-slate-400">(optional)</span></span><DatePicker value={due} onChange={setDue} /></div>
              {editingId && <label className="mt-4 flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-600"><input type="checkbox" checked={done} onChange={(event) => setDone(event.target.checked)} className="h-4 w-4 accent-[#167d8d]" /> Task completed</label>}
              <div className="mt-7 flex items-center gap-2">{editingId && <button type="button" onClick={() => setConfirmDelete(true)} aria-label="Delete task" title="Delete task" className="grid h-10 w-10 place-items-center rounded-xl text-rose-600 hover:bg-rose-50"><Trash2 size={17} /></button>}<div className="ml-auto flex gap-2"><button type="button" onClick={closeForm} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-100">Cancel</button><button className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700">{editingId ? "Save" : "Add"}</button></div></div>
            </div>
          </div>
        </form>
      </div>}

      {confirmDelete && <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/50 p-4" onMouseDown={() => setConfirmDelete(false)} onKeyDown={(event) => { if (event.key === "Escape") setConfirmDelete(false); }}><div role="alertdialog" aria-modal="true" aria-labelledby="delete-task-title" onMouseDown={(event) => event.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"><div className="grid h-10 w-10 place-items-center rounded-xl bg-rose-50 text-rose-600"><AlertCircle size={18} /></div><h3 id="delete-task-title" className="mt-4 font-bold text-slate-950">Delete “{title}”?</h3><p className="mt-2 text-sm leading-6 text-slate-500">This task will be permanently removed. This cannot be undone.</p><div className="mt-5 flex justify-end gap-2"><button onClick={() => setConfirmDelete(false)} autoFocus className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-100">Keep task</button><button onClick={handleDeleteTask} className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700">Delete</button></div></div></div>}
    </main>
  );
};

export default TasksPage;
