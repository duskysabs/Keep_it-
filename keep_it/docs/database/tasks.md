# Tasks database design

This is the first database module for Keep_it!. It preserves the existing Tasks, Calendar, and Dashboard behavior while preparing the app for an offline SQLite database.

## Ownership and data flow

Tasks are the source of truth. Calendar and Dashboard read task records; they do not store copies.

```text
Tasks page ───────┐
Calendar page ────┼── Task repository ── SQLite tasks table
Dashboard ────────┘
```

The repository is the only part of the app allowed to issue task SQL. React components continue to work with simple task objects. Electron exposes narrow task operations through its preload bridge; it does not expose SQLite or raw IPC to the page.

## Table: `tasks`

| Column | SQLite type | Required | Purpose |
| --- | --- | --- | --- |
| `id` | `TEXT` | Yes | Application-generated UUID and primary key. |
| `title` | `TEXT` | Yes | Trimmed task title, limited to 300 characters. |
| `due_date` | `TEXT` | No | Local calendar date in `YYYY-MM-DD` form. `NULL` means no due date. |
| `completed_at` | `TEXT` | No | UTC ISO timestamp. `NULL` means the task is active. |
| `created_at` | `TEXT` | Yes | UTC ISO timestamp assigned when the task is created. |
| `updated_at` | `TEXT` | Yes | UTC ISO timestamp refreshed whenever editable task data changes. |

The executable migration is [`database/migrations/001_create_tasks.sql`](../../database/migrations/001_create_tasks.sql).

## Why completion is a timestamp

SQLite does not have a dedicated Boolean type. Instead of storing both a completion flag and a completion date, Keep_it! stores only `completed_at`:

- `completed_at IS NULL` means active.
- A timestamp means completed.

The UI still receives `done: true` or `done: false`; the repository performs that conversion.

## UI-to-database mapping

```text
UI task                         Database row
-------------------------------------------------------------
id                              id
title                           title
due: "2026-08-24"              due_date: "2026-08-24"
due: ""                        due_date: NULL
done: false                     completed_at: NULL
done: true                      completed_at: current UTC time
```

The repository will return this existing UI shape so the completed frontend does not need to change:

```js
{
  id: "task-uuid",
  title: "Review monthly budget",
  due: "2026-08-24",
  done: false,
}
```

## Repository contract

The Task context calls asynchronous operations instead of directly changing an in-memory array:

```js
listTasks({ filter, search })
getTask(id)
createTask({ title, due })
updateTask(id, { title, due, done })
toggleTask(id)
deleteTask(id)
listTasksForDate(date)
listAttentionTasks(limit)
listUpcomingTasks({ fromDate, limit })
```

Each write returns the saved task. This lets Tasks, Calendar, and Dashboard update from the same canonical result.

## Query behavior to preserve

### Tasks page

1. Active tasks before completed tasks.
2. Dated tasks before undated tasks.
3. Earlier due dates first.
4. Titles used as the final alphabetical tie-breaker.

### Calendar

Calendar queries `due_date`; no separate calendar-event record is created. Undated tasks do not appear on the calendar.

### Dashboard

The Dashboard reads the next three active, dated tasks ordered by `due_date`, then title.

## Deliberate exclusions

The first version does not add fields that the current product does not use:

- No priority field.
- No recurrence or reminders yet.
- No separate Calendar table.
- No user or workspace foreign key while the app is single-user and local-only.
- No soft deletion because the current confirmed delete action is permanent.

These can be added later through new migrations without changing migration `001`.

## Migration and rollout order

1. ✅ Add the SQLite connection and migration runner inside the desktop application.
2. ✅ Run migration `001_create_tasks.sql` safely whenever the local database opens.
3. ✅ Use the Task repository and row-to-UI mapper in `src/data/tasks`.
4. ✅ Make `TaskContext` load asynchronously from the desktop bridge.
5. ✅ Route every Tasks and Calendar write through shared context methods.
6. Verify Calendar and Dashboard update immediately in the Electron window.
7. Remove the browser-only starter task fallback after all modules use persistent repositories.

The production database should start empty. Demo tasks, if retained for development, should be inserted by a separate development seed and never by the production migration.
