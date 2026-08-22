const clone = (value) => JSON.parse(JSON.stringify(value));

const createMemoryNoteClient = (initialNotes) => {
  let notes = clone(initialNotes);

  const get = async (id) => clone(notes.find((note) => note.id === id) ?? null);

  return {
    list: async () => clone(notes),
    get,
    create: async (note) => {
      const timestamp = new Date().toISOString();
      const created = {
        ...clone(note),
        id: note.id || crypto.randomUUID(),
        archivedAt: note.archived ? timestamp : null,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      notes = [created, ...notes];
      return clone(created);
    },
    update: async (id, changes) => {
      const current = notes.find((note) => note.id === id);
      if (!current) throw new Error(`Note not found: ${id}`);
      const timestamp = new Date().toISOString();
      const archivedAt = changes.archived === true
        ? current.archivedAt || timestamp
        : changes.archived === false
          ? null
          : current.archivedAt;
      const updated = { ...current, ...clone(changes), archivedAt, updatedAt: timestamp };
      notes = notes.map((note) => note.id === id ? updated : note);
      return clone(updated);
    },
    delete: async (id) => {
      const previousLength = notes.length;
      notes = notes.filter((note) => note.id !== id);
      return notes.length !== previousLength;
    },
  };
};

let client;

export const getNoteClient = (initialNotes) => {
  if (client) return client;
  if (typeof window !== "undefined" && window.keepIt?.notes) {
    client = window.keepIt.notes;
    return client;
  }
  client = createMemoryNoteClient(initialNotes);
  return client;
};
