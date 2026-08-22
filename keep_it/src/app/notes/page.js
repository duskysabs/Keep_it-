"use client";

import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Files, Pin, Plus, Search } from "lucide-react";
import NoteEditor from "./NoteEditor";
import { useWorkspace } from "@/context/WorkspaceContext";
import { useNotes } from "@/context/NoteContext";
import SelectField from "@/components/ui/SelectField";
import { emptyNoteDocument } from "@/data/notes/noteMapper";

const filters = ["All notes", "Pinned", "Personal", "Work", "School", "Archive"];

const updatedLabel = (value) => {
  if (!value) return "Just now";
  const date = new Date(value);
  const difference = Date.now() - date.getTime();
  if (difference < 60_000) return "Just now";
  if (difference < 3_600_000) return `${Math.floor(difference / 60_000)} minutes ago`;
  if (difference < 86_400_000) return `${Math.floor(difference / 3_600_000)} hours ago`;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date);
};

const NotesPage = () => {
  const { notes, addNote, updateNote, deleteNote } = useNotes();
  const { recordActivity } = useWorkspace();
  const [selectedId, setSelectedId] = useState("");
  const [newNoteId, setNewNoteId] = useState("");
  const [activeFilter, setActiveFilter] = useState("All notes");
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [toast, setToast] = useState("");

  const selectedNote = notes.find((note) => note.id === selectedId);
  const visibleNotes = useMemo(() => notes.filter((note) => {
    if (activeFilter === "Archive") return note.archived;
    if (note.archived) return false;
    if (activeFilter === "Pinned") return note.pinned;
    if (["Personal", "Work", "School"].includes(activeFilter)) return note.tag === activeFilter;
    return true;
  }).filter((note) => `${note.titleText} ${note.contentText}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt)), [activeFilter, notes, search]);

  const showToast = (message) => { setToast(message); setTimeout(() => setToast(""), 1800); };
  const saveNoteChanges = (id, changes) => updateNote(id, changes).catch(() => showToast("Note could not be saved"));

  const createNote = async () => {
    try {
      const note = await addNote({
        title: emptyNoteDocument(),
        titleText: "",
        content: emptyNoteDocument(),
        contentText: "",
        tag: ["Personal", "Work", "School"].includes(activeFilter) ? activeFilter : "Personal",
        pinned: false,
        archived: false,
      });
      recordActivity("note", "Created a note", "Untitled note");
      setSelectedId(note.id); setNewNoteId(note.id); setActiveFilter("All notes");
    } catch {
      showToast("Note could not be created");
    }
  };

  const closeEditor = async ({ title, titleText, content, contentText }) => {
    if (!selectedNote) return;
    try {
      if (!titleText && !contentText) { await deleteNote(selectedId); showToast("Empty note removed"); }
      else { await updateNote(selectedId, { title, titleText, content, contentText }); recordActivity("note", "Updated a note", titleText || "Untitled note"); }
      setSelectedId(""); setNewNoteId("");
    } catch {
      showToast("Note could not be saved");
    }
  };

  const archiveNote = async ({ title, titleText, content, contentText }) => {
    if (!selectedNote) return;
    try {
      if (!titleText && !contentText) { await deleteNote(selectedId); showToast("Empty note removed"); }
      else { await updateNote(selectedId, { title, titleText, content, contentText, archived: !selectedNote.archived }); showToast(selectedNote.archived ? "Note restored" : "Note archived"); recordActivity("note", selectedNote.archived ? "Restored a note" : "Archived a note", titleText || "Untitled note"); }
      setSelectedId("");
    } catch {
      showToast("Note could not be archived");
    }
  };

  const handleDeleteNote = async () => {
    try {
      await deleteNote(selectedId);
      recordActivity("note", "Deleted a note", selectedNote?.titleText || "Untitled note");
      setConfirmDelete(false); setSelectedId(""); setNewNoteId(""); showToast("Note deleted");
    } catch {
      showToast("Note could not be deleted");
    }
  };

  const noteCount = (name) => {
    if (name === "Archive") return notes.filter((note) => note.archived).length;
    if (name === "Pinned") return notes.filter((note) => note.pinned && !note.archived).length;
    if (["Personal", "Work", "School"].includes(name)) return notes.filter((note) => note.tag === name && !note.archived).length;
    return notes.filter((note) => !note.archived).length;
  };

  return (
    <main className="mx-auto max-w-[1400px] p-4 sm:p-5 lg:p-8">
      {toast && <div role="status" className="fixed right-5 top-5 z-[80] flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-xl"><CheckCircle2 size={16} className="text-emerald-400" />{toast}</div>}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><h2 className="text-2xl font-bold text-slate-950">Your notes</h2><p className="mt-1 text-sm text-slate-500">Capture ideas, organize thoughts, and find them when you need them.</p></div>
        <button onClick={createNote} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 sm:w-auto sm:self-start"><Plus size={16} /> New note</button>
      </div>

      <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:w-56">
            <SelectField
              value={activeFilter}
              onValueChange={setActiveFilter}
              options={filters.map((filter) => ({ value: filter, label: `${filter} (${noteCount(filter)})` }))}
              ariaLabel="Filter notes"
            />
          </div>
          <label className="relative block w-full sm:max-w-sm"><span className="sr-only">Search notes</span><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search notes" className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none transition focus:border-[#74aeb7] focus:bg-white focus:ring-2 focus:ring-[#dceff1]" /></label>
        </div>
      </section>

      <div className="mt-5 flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{activeFilter}</p><p className="text-xs text-slate-400">{visibleNotes.length} {visibleNotes.length === 1 ? "note" : "notes"}</p></div>

      {visibleNotes.length ? <section className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visibleNotes.map((note) => (
        <article key={note.id} onClick={() => { setSelectedId(note.id); setConfirmDelete(false); }} className="group flex min-h-56 cursor-pointer flex-col rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-[#b9dadd] hover:shadow-md">
          <div className="flex items-start justify-between gap-4"><div className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-slate-500"><Files size={17} /></div>{note.pinned && <Pin size={15} className="fill-[#167d8d] text-[#167d8d]" />}</div>
          <h3 className="note-card-title mt-4 truncate font-bold text-slate-900">{note.titleText || "Untitled note"}</h3>
          <p className="mt-2 line-clamp-4 whitespace-pre-line text-sm leading-6 text-slate-500">{note.contentText || "Empty note. Open it to start writing."}</p>
          <div className="mt-auto flex items-center justify-between pt-5"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">{note.tag}</span><span className="text-xs text-slate-400">{updatedLabel(note.updatedAt)}</span></div>
        </article>
      ))}</section> : <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center"><Files className="mx-auto text-slate-300" /><p className="mt-3 font-semibold text-slate-700">{search ? "No matching notes" : activeFilter === "All notes" ? "Your notes are empty" : `No notes in ${activeFilter}`}</p><p className="mt-1 text-sm text-slate-400">{search ? `Nothing matches “${search}”.` : activeFilter === "All notes" ? "Create your first note to start writing." : "Create a note here or choose another filter."}</p>{search ? <button onClick={() => setSearch("")} className="mt-4 text-sm font-bold text-[#167d8d]">Clear search</button> : <button onClick={createNote} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"><Plus size={16} /> New note</button>}</div>}

      {selectedNote && <NoteEditor note={selectedNote} isNew={selectedId === newNoteId} onChange={saveNoteChanges} onClose={closeEditor} onArchive={archiveNote} onDelete={() => setConfirmDelete(true)} onTogglePinned={() => saveNoteChanges(selectedId, { pinned: !selectedNote.pinned })} />}
      {confirmDelete && selectedNote && <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/50 p-4"><div role="alertdialog" aria-modal="true" aria-labelledby="delete-note-title" className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"><div className="grid h-10 w-10 place-items-center rounded-xl bg-rose-50 text-rose-600"><AlertCircle size={18} /></div><h3 id="delete-note-title" className="mt-4 font-bold text-slate-950">Delete {selectedNote.titleText || "Untitled note"}?</h3><p className="mt-2 text-sm leading-6 text-slate-500">This note will be permanently removed. This cannot be undone.</p><div className="mt-5 flex justify-end gap-2"><button onClick={() => setConfirmDelete(false)} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-100">Keep note</button><button onClick={handleDeleteNote} className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700">Delete</button></div></div></div>}
    </main>
  );
};

export default NotesPage;
