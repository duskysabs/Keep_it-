const NOTE_FOLDERS = new Set(["Personal", "Work", "School"]);
const MAX_DOCUMENT_LENGTH = 2_000_000;

export const emptyNoteDocument = () => ({
  type: "doc",
  content: [{ type: "paragraph" }],
});

export const normalizeNoteDocument = (document, fieldName) => {
  const value = document ?? emptyNoteDocument();
  if (!value || typeof value !== "object" || Array.isArray(value) || value.type !== "doc") {
    throw new Error(`${fieldName} must be a TipTap document.`);
  }

  let serialized;
  try {
    serialized = JSON.stringify(value);
  } catch {
    throw new Error(`${fieldName} could not be saved as JSON.`);
  }

  if (serialized.length > MAX_DOCUMENT_LENGTH) {
    throw new Error(`${fieldName} is too large to save.`);
  }

  return { document: JSON.parse(serialized), serialized };
};

export const normalizeNoteText = (value, fieldName, maximumLength) => {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") throw new TypeError(`${fieldName} must be text.`);
  const normalized = value.trim();
  if (normalized.length > maximumLength) throw new Error(`${fieldName} is too long.`);
  return normalized;
};

export const normalizeNoteFolder = (folder) => {
  if (!NOTE_FOLDERS.has(folder)) throw new Error(`Unknown note folder: ${folder}`);
  return folder;
};

export const noteRowToModel = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    title: JSON.parse(row.title_json),
    titleText: row.title_text,
    content: JSON.parse(row.content_json),
    contentText: row.content_text,
    tag: row.folder,
    pinned: row.is_pinned === 1,
    archived: row.archived_at !== null,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};
