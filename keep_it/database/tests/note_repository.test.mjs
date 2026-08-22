import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import { createNoteRepository } from "../../src/data/notes/noteRepository.js";

const migration = readFileSync(new URL("../migrations/002_create_notes.sql", import.meta.url), "utf8");
const document = (text = "") => ({
  type: "doc",
  content: [{ type: "paragraph", ...(text ? { content: [{ type: "text", text }] } : {}) }],
});

const createHarness = () => {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(migration);
  const database = {
    all: async (sql, parameters = []) => sqlite.prepare(sql).all(...parameters),
    get: async (sql, parameters = []) => sqlite.prepare(sql).get(...parameters),
    run: async (sql, parameters = []) => {
      const result = sqlite.prepare(sql).run(...parameters);
      return { changes: Number(result.changes) };
    },
  };
  let nextId = 1;
  return {
    sqlite,
    repository: createNoteRepository({
      database,
      createId: () => `note-${nextId++}`,
      now: () => "2026-08-21T04:00:00.000Z",
    }),
  };
};

test("creates, edits, archives, restores, and deletes a formatted note", async (context) => {
  const { repository, sqlite } = createHarness();
  context.after(() => sqlite.close());

  const created = await repository.createNote({
    title: document("Database plan"),
    titleText: "Database plan",
    content: document("Store TipTap JSON"),
    contentText: "Store TipTap JSON",
    tag: "School",
  });
  assert.equal(created.id, "note-1");
  assert.equal(created.titleText, "Database plan");
  assert.equal(created.content.content[0].content[0].text, "Store TipTap JSON");
  assert.equal(created.tag, "School");

  const archived = await repository.updateNote(created.id, { pinned: true, archived: true });
  assert.equal(archived.pinned, true);
  assert.equal(archived.archivedAt, "2026-08-21T04:00:00.000Z");

  const restored = await repository.updateNote(created.id, { archived: false });
  assert.equal(restored.archived, false);
  assert.equal(await repository.deleteNote(created.id), true);
  assert.equal(await repository.getNote(created.id), null);
});

test("supports note folders, archive, pin, and plain-text search", async (context) => {
  const { repository, sqlite } = createHarness();
  context.after(() => sqlite.close());

  const personal = await repository.createNote({ title: document("Books"), titleText: "Books", content: document("Atomic Habits"), contentText: "Atomic Habits", tag: "Personal" });
  const work = await repository.createNote({ title: document("Launch"), titleText: "Launch", content: document("Database checklist"), contentText: "Database checklist", tag: "Work", pinned: true });
  const archived = await repository.createNote({ title: document("Old"), titleText: "Old", content: document(), contentText: "", archived: true });

  assert.deepEqual((await repository.listNotes({ filter: "Pinned" })).map((note) => note.id), [work.id]);
  assert.deepEqual((await repository.listNotes({ filter: "Personal" })).map((note) => note.id), [personal.id]);
  assert.deepEqual((await repository.listNotes({ filter: "Archive" })).map((note) => note.id), [archived.id]);
  assert.deepEqual((await repository.listNotes({ search: "checklist" })).map((note) => note.id), [work.id]);
});

test("rejects malformed note data before SQLite", async (context) => {
  const { repository, sqlite } = createHarness();
  context.after(() => sqlite.close());

  await assert.rejects(() => repository.createNote({ title: "HTML", content: document() }), /TipTap document/);
  await assert.rejects(() => repository.createNote({ title: document(), content: document(), tag: "Ideas" }), /Unknown note folder/);
  await assert.rejects(() => repository.listNotes({ filter: "Deleted" }), /Unknown note filter/);
});
