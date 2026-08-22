import {
  normalizeNoteDocument,
  normalizeNoteFolder,
  normalizeNoteText,
  noteRowToModel,
} from "./noteMapper.js";

const NOTE_COLUMNS = "id, title_json, title_text, content_json, content_text, folder, is_pinned, archived_at, created_at, updated_at";
const NOTE_FILTERS = new Set(["All notes", "Pinned", "Personal", "Work", "School", "Archive"]);

const defaultCreateId = () => {
  if (!globalThis.crypto?.randomUUID) throw new Error("Secure UUID generation is unavailable.");
  return globalThis.crypto.randomUUID();
};

const defaultNow = () => new Date().toISOString();

const assertDatabaseAdapter = (database) => {
  for (const method of ["all", "get", "run"]) {
    if (typeof database?.[method] !== "function") {
      throw new TypeError(`Note database adapter must provide a ${method}() method.`);
    }
  }
};

export const createNoteRepository = ({ database, createId = defaultCreateId, now = defaultNow }) => {
  assertDatabaseAdapter(database);

  const getNoteRow = async (id) => database.get(
    `SELECT ${NOTE_COLUMNS} FROM notes WHERE id = ?`,
    [id],
  );

  const getNote = async (id) => noteRowToModel(await getNoteRow(id));

  const listNotes = async ({ filter = "All notes", search = "" } = {}) => {
    if (!NOTE_FILTERS.has(filter)) throw new Error(`Unknown note filter: ${filter}`);

    const conditions = [];
    const parameters = [];

    if (filter === "Archive") conditions.push("archived_at IS NOT NULL");
    else {
      conditions.push("archived_at IS NULL");
      if (filter === "Pinned") conditions.push("is_pinned = 1");
      if (["Personal", "Work", "School"].includes(filter)) {
        conditions.push("folder = ?");
        parameters.push(filter);
      }
    }

    const normalizedSearch = String(search).trim();
    if (normalizedSearch) {
      conditions.push("(title_text LIKE ? COLLATE NOCASE OR content_text LIKE ? COLLATE NOCASE)");
      parameters.push(`%${normalizedSearch}%`, `%${normalizedSearch}%`);
    }

    const rows = await database.all(
      `SELECT ${NOTE_COLUMNS}
       FROM notes
       WHERE ${conditions.join(" AND ")}
       ORDER BY is_pinned DESC, updated_at DESC, title_text COLLATE NOCASE ASC`,
      parameters,
    );

    return rows.map(noteRowToModel);
  };

  const createNote = async ({ id, title, titleText, content, contentText, tag = "Personal", pinned = false, archived = false } = {}) => {
    const noteId = id || createId();
    const normalizedTitle = normalizeNoteDocument(title, "Note title");
    const normalizedContent = normalizeNoteDocument(content, "Note content");
    const normalizedTitleText = normalizeNoteText(titleText, "Note title", 500);
    const normalizedContentText = normalizeNoteText(contentText, "Note content", 1_000_000);
    const folder = normalizeNoteFolder(tag);
    const archivedAt = archived ? now() : null;

    await database.run(
      `INSERT INTO notes (id, title_json, title_text, content_json, content_text, folder, is_pinned, archived_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [noteId, normalizedTitle.serialized, normalizedTitleText, normalizedContent.serialized, normalizedContentText, folder, pinned ? 1 : 0, archivedAt],
    );

    return getNote(noteId);
  };

  const updateNote = async (id, changes = {}) => {
    const current = await getNoteRow(id);
    if (!current) throw new Error(`Note not found: ${id}`);

    const title = changes.title === undefined
      ? current.title_json
      : normalizeNoteDocument(changes.title, "Note title").serialized;
    const content = changes.content === undefined
      ? current.content_json
      : normalizeNoteDocument(changes.content, "Note content").serialized;
    const titleText = changes.titleText === undefined
      ? current.title_text
      : normalizeNoteText(changes.titleText, "Note title", 500);
    const contentText = changes.contentText === undefined
      ? current.content_text
      : normalizeNoteText(changes.contentText, "Note content", 1_000_000);
    const folder = changes.tag === undefined ? current.folder : normalizeNoteFolder(changes.tag);
    const pinned = changes.pinned === undefined ? current.is_pinned : changes.pinned ? 1 : 0;
    let archivedAt = current.archived_at;
    if (changes.archived === true && archivedAt === null) archivedAt = now();
    if (changes.archived === false) archivedAt = null;

    await database.run(
      `UPDATE notes
       SET title_json = ?, title_text = ?, content_json = ?, content_text = ?, folder = ?, is_pinned = ?, archived_at = ?
       WHERE id = ?`,
      [title, titleText, content, contentText, folder, pinned, archivedAt, id],
    );

    return getNote(id);
  };

  const deleteNote = async (id) => {
    const result = await database.run("DELETE FROM notes WHERE id = ?", [id]);
    return (result?.changes ?? 0) > 0;
  };

  return { listNotes, getNote, createNote, updateNote, deleteNote };
};
