"use client";

import { useEffect, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import { Archive, Bold, CheckSquare, Italic, List, Pin, Trash2, X } from "lucide-react";
import ScrollArea from "@/components/ui/ScrollArea";
import SelectField from "@/components/ui/SelectField";

const titleExtensions = [
  StarterKit.configure({
    blockquote: false,
    bulletList: false,
    codeBlock: false,
    heading: false,
    horizontalRule: false,
    listItem: false,
    orderedList: false,
  }),
  Placeholder.configure({ placeholder: "Untitled note" }),
];

const bodyExtensions = [
  StarterKit,
  TaskList,
  TaskItem.configure({ nested: true }),
  Placeholder.configure({ placeholder: "Start writing..." }),
];

const NoteEditor = ({ note, isNew, onChange, onClose, onArchive, onDelete, onTogglePinned }) => {
  const [activeArea, setActiveArea] = useState("title");
  const [, refreshToolbar] = useState(0);

  const updateToolbar = () => refreshToolbar((value) => value + 1);

  const titleEditor = useEditor({
    extensions: titleExtensions,
    content: note.title,
    immediatelyRender: false,
    editorProps: {
      attributes: { "aria-label": "Note title", class: "note-title-input" },
      handleKeyDown: (_view, event) => {
        if (event.key !== "Enter") return false;
        event.preventDefault();
        document.querySelector(".note-body-input")?.focus();
        return true;
      },
    },
    onFocus: () => setActiveArea("title"),
    onSelectionUpdate: updateToolbar,
    onTransaction: updateToolbar,
    onUpdate: ({ editor }) => onChange(note.id, { title: editor.getHTML() }),
  });

  const bodyEditor = useEditor({
    extensions: bodyExtensions,
    content: note.content,
    immediatelyRender: false,
    editorProps: { attributes: { "aria-label": "Note content", class: "note-body-input" } },
    onFocus: () => setActiveArea("body"),
    onSelectionUpdate: updateToolbar,
    onTransaction: updateToolbar,
    onUpdate: ({ editor }) => onChange(note.id, { content: editor.getHTML() }),
  });

  useEffect(() => {
    if (!titleEditor || !bodyEditor) return;
    titleEditor.commands.setContent(note.title, { emitUpdate: false });
    bodyEditor.commands.setContent(note.content, { emitUpdate: false });
    requestAnimationFrame(() => titleEditor.commands.focus("start"));
    // Content changes are already applied by each editor's onUpdate callback.
    // Reloading here while typing would reset the caret, so only a new note ID should resync.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.id, titleEditor, bodyEditor]);

  const activeEditor = activeArea === "title" ? titleEditor : bodyEditor;
  const currentContent = () => ({
    title: titleEditor?.getHTML() ?? note.title,
    content: bodyEditor?.getHTML() ?? note.content,
  });

  const runCommand = (command) => {
    if (!activeEditor) return;
    if (command === "bold") activeEditor.chain().focus().toggleBold().run();
    if (command === "italic") activeEditor.chain().focus().toggleItalic().run();
    if (command === "bullet") bodyEditor?.chain().focus().toggleBulletList().run();
    if (command === "task") bodyEditor?.chain().focus().toggleTaskList().run();
    updateToolbar();
  };

  const toolbarButton = (command, label, Icon, disabled = false) => {
    const active = command === "bold"
      ? activeEditor?.isActive("bold")
      : command === "italic"
        ? activeEditor?.isActive("italic")
        : command === "bullet"
          ? bodyEditor?.isActive("bulletList")
          : bodyEditor?.isActive("taskList");

    return (
      <button
        type="button"
        disabled={disabled}
        aria-label={label}
        aria-pressed={Boolean(active)}
        onMouseDown={(event) => {
          event.preventDefault();
          runCommand(command);
        }}
        className={`grid h-8 w-8 place-items-center rounded-lg transition disabled:cursor-not-allowed disabled:opacity-30 ${active ? "bg-[#e4f2f4] text-[#116b78]" : "text-slate-500 hover:bg-slate-100"}`}
      >
        <Icon size={16} />
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-2 backdrop-blur-sm sm:p-4" role="presentation" onMouseDown={() => onClose(currentContent())}>
      <section onMouseDown={(event) => event.stopPropagation()} className="flex h-[calc(100vh-1rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:h-[82vh] sm:rounded-3xl">
        <div className="flex flex-wrap items-center gap-1 border-b border-slate-100 px-3 py-3 sm:px-4">
          {toolbarButton("bold", "Bold", Bold)}
          {toolbarButton("italic", "Italic", Italic)}
          {toolbarButton("bullet", "Bullet list", List, activeArea === "title")}
          {toolbarButton("task", "Checklist", CheckSquare, activeArea === "title")}
          <div className="mx-2 h-5 w-px bg-slate-200" />
          <SelectField value={note.tag} onValueChange={(tag) => onChange(note.id, { tag })} options={["Personal", "Work", "School"]} ariaLabel="Note folder" compact className="min-w-24 font-semibold" />
          <div className="ml-auto flex items-center gap-1">
            <button onClick={onTogglePinned} aria-label={note.pinned ? "Unpin note" : "Pin note"} className={`grid h-8 w-8 place-items-center rounded-lg hover:bg-slate-100 ${note.pinned ? "text-[#167d8d]" : "text-slate-400"}`}><Pin size={16} className={note.pinned ? "fill-current" : ""} /></button>
            {!isNew && <button onClick={() => onArchive(currentContent())} aria-label={note.archived ? "Restore note" : "Archive note"} className={`grid h-8 w-8 place-items-center rounded-lg hover:bg-slate-100 ${note.archived ? "text-[#167d8d]" : "text-slate-400"}`}><Archive size={16} /></button>}
            {!isNew && <button onClick={onDelete} aria-label="Delete note" className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={16} /></button>}
            <button onClick={() => onClose(currentContent())} aria-label="Close editor" className="ml-1 grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={18} /></button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-4 py-5 sm:px-10 sm:py-8">
          <EditorContent editor={titleEditor} className="note-title-editor w-full overflow-hidden text-2xl tracking-tight text-slate-950 sm:text-3xl" />
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400"><span>{note.tag}</span><span>•</span><span>Saved in draft</span></div>
          <ScrollArea className="note-editor mt-5 min-h-0 flex-1 text-[15px] leading-7 text-slate-600 sm:mt-6">
            <EditorContent editor={bodyEditor} />
          </ScrollArea>
        </div>
      </section>
    </div>
  );
};

export default NoteEditor;
