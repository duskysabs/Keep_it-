import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";

import { createTaskRepository } from "../../src/data/tasks/taskRepository.js";

const migration = readFileSync(
  new URL("../migrations/001_create_tasks.sql", import.meta.url),
  "utf8",
);

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
  let nextTimestamp = 1;
  const repository = createTaskRepository({
    database,
    createId: () => `task-${nextId++}`,
    now: () => `2026-08-2${nextTimestamp++}T01:02:03.000Z`,
  });

  return { repository, sqlite };
};

test("creates, updates, toggles, and deletes a task", async (context) => {
  const { repository, sqlite } = createHarness();
  context.after(() => sqlite.close());

  const created = await repository.createTask({
    title: "  Review task schema  ",
    due: "2026-08-24",
  });
  assert.deepEqual(created, {
    id: "task-1",
    title: "Review task schema",
    due: "2026-08-24",
    done: false,
  });

  const completed = await repository.updateTask(created.id, { done: true });
  assert.equal(completed.done, true);

  const reopened = await repository.toggleTask(created.id);
  assert.equal(reopened.done, false);

  assert.equal(await repository.deleteTask(created.id), true);
  assert.equal(await repository.getTask(created.id), null);
  assert.equal(await repository.deleteTask(created.id), false);
});

test("preserves Tasks, Calendar, and Dashboard query behavior", async (context) => {
  const { repository, sqlite } = createHarness();
  context.after(() => sqlite.close());

  const later = await repository.createTask({ title: "Later dated task", due: "2026-08-25" });
  const undated = await repository.createTask({ title: "Undated task" });
  const earlier = await repository.createTask({ title: "Earlier dated task", due: "2026-08-22" });
  const completed = await repository.createTask({ title: "Completed task", due: "2026-08-21" });
  await repository.updateTask(completed.id, { done: true });

  const allTasks = await repository.listTasks();
  assert.deepEqual(
    allTasks.map((task) => task.id),
    [earlier.id, later.id, undated.id, completed.id],
  );

  assert.deepEqual(
    (await repository.listTasks({ filter: "Active", search: "dated" })).map((task) => task.id),
    [earlier.id, later.id, undated.id],
  );
  assert.deepEqual(
    (await repository.listTasks({ filter: "Completed" })).map((task) => task.id),
    [completed.id],
  );
  assert.deepEqual(
    (await repository.listTasksForDate("2026-08-22")).map((task) => task.id),
    [earlier.id],
  );
  assert.deepEqual(
    (await repository.listAttentionTasks(2)).map((task) => task.id),
    [earlier.id, later.id],
  );
  assert.deepEqual(
    (await repository.listUpcomingTasks({ fromDate: "2026-08-23", limit: 4 })).map((task) => task.id),
    [later.id],
  );
});

test("rejects invalid task input before it reaches SQLite", async (context) => {
  const { repository, sqlite } = createHarness();
  context.after(() => sqlite.close());

  await assert.rejects(() => repository.createTask({ title: "   " }), /required/);
  await assert.rejects(
    () => repository.createTask({ title: "Invalid date", due: "2026-02-31" }),
    /valid calendar date/,
  );
  await assert.rejects(() => repository.listTasks({ filter: "Priority" }), /Unknown task filter/);
  await assert.rejects(() => repository.listAttentionTasks(0), /integer from 1 to 100/);
});
