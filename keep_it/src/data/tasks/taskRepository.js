import { normalizeTaskDueDate, normalizeTaskTitle, taskRowToModel } from "./taskMapper.js";

const TASK_COLUMNS = "id, title, due_date, completed_at, created_at, updated_at";
const TASK_FILTERS = new Set(["All", "Active", "Completed"]);

const defaultCreateId = () => {
  if (!globalThis.crypto?.randomUUID) throw new Error("Secure UUID generation is unavailable.");
  return globalThis.crypto.randomUUID();
};

const defaultNow = () => new Date().toISOString();

const assertDatabaseAdapter = (database) => {
  for (const method of ["all", "get", "run"]) {
    if (typeof database?.[method] !== "function") {
      throw new TypeError(`Task database adapter must provide a ${method}() method.`);
    }
  }
};

const normalizeLimit = (limit) => {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new RangeError("Task query limit must be an integer from 1 to 100.");
  }
  return limit;
};

export const createTaskRepository = ({ database, createId = defaultCreateId, now = defaultNow }) => {
  assertDatabaseAdapter(database);

  const getTaskRow = async (id) => database.get(
    `SELECT ${TASK_COLUMNS} FROM tasks WHERE id = ?`,
    [id],
  );

  const getTask = async (id) => taskRowToModel(await getTaskRow(id));

  const listTasks = async ({ filter = "All", search = "" } = {}) => {
    if (!TASK_FILTERS.has(filter)) throw new Error(`Unknown task filter: ${filter}`);

    const conditions = [];
    const parameters = [];

    if (filter === "Active") conditions.push("completed_at IS NULL");
    if (filter === "Completed") conditions.push("completed_at IS NOT NULL");

    const normalizedSearch = String(search).trim();
    if (normalizedSearch) {
      conditions.push("title LIKE ? COLLATE NOCASE");
      parameters.push(`%${normalizedSearch}%`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const rows = await database.all(
      `SELECT ${TASK_COLUMNS}
       FROM tasks
       ${whereClause}
       ORDER BY
         CASE WHEN completed_at IS NULL THEN 0 ELSE 1 END,
         CASE WHEN due_date IS NULL THEN 1 ELSE 0 END,
         due_date ASC,
         title COLLATE NOCASE ASC`,
      parameters,
    );

    return rows.map(taskRowToModel);
  };

  const createTask = async ({ title, due = "" }) => {
    const id = createId();
    const normalizedTitle = normalizeTaskTitle(title);
    const dueDate = normalizeTaskDueDate(due);

    await database.run(
      `INSERT INTO tasks (id, title, due_date)
       VALUES (?, ?, ?)`,
      [id, normalizedTitle, dueDate],
    );

    return getTask(id);
  };

  const updateTask = async (id, changes = {}) => {
    const current = await getTaskRow(id);
    if (!current) throw new Error(`Task not found: ${id}`);

    const title = changes.title === undefined ? current.title : normalizeTaskTitle(changes.title);
    const dueDate = changes.due === undefined ? current.due_date : normalizeTaskDueDate(changes.due);
    let completedAt = current.completed_at;

    if (changes.done === true && completedAt === null) completedAt = now();
    if (changes.done === false) completedAt = null;

    await database.run(
      `UPDATE tasks
       SET title = ?, due_date = ?, completed_at = ?
       WHERE id = ?`,
      [title, dueDate, completedAt, id],
    );

    return getTask(id);
  };

  const toggleTask = async (id) => {
    const current = await getTaskRow(id);
    if (!current) throw new Error(`Task not found: ${id}`);

    await database.run(
      `UPDATE tasks SET completed_at = ? WHERE id = ?`,
      [current.completed_at === null ? now() : null, id],
    );

    return getTask(id);
  };

  const deleteTask = async (id) => {
    const result = await database.run("DELETE FROM tasks WHERE id = ?", [id]);
    return (result?.changes ?? 0) > 0;
  };

  const listTasksForDate = async (date) => {
    const dueDate = normalizeTaskDueDate(date);
    if (dueDate === null) throw new Error("A calendar date is required.");

    const rows = await database.all(
      `SELECT ${TASK_COLUMNS}
       FROM tasks
       WHERE due_date = ?
       ORDER BY
         CASE WHEN completed_at IS NULL THEN 0 ELSE 1 END,
         title COLLATE NOCASE ASC`,
      [dueDate],
    );

    return rows.map(taskRowToModel);
  };

  const listAttentionTasks = async (limit = 3) => {
    const rows = await database.all(
      `SELECT ${TASK_COLUMNS}
       FROM tasks
       WHERE completed_at IS NULL AND due_date IS NOT NULL
       ORDER BY due_date ASC, title COLLATE NOCASE ASC
       LIMIT ?`,
      [normalizeLimit(limit)],
    );

    return rows.map(taskRowToModel);
  };

  const listUpcomingTasks = async ({ fromDate, limit = 4 }) => {
    const startDate = normalizeTaskDueDate(fromDate);
    if (startDate === null) throw new Error("An upcoming-task start date is required.");

    const rows = await database.all(
      `SELECT ${TASK_COLUMNS}
       FROM tasks
       WHERE completed_at IS NULL AND due_date >= ?
       ORDER BY due_date ASC, title COLLATE NOCASE ASC
       LIMIT ?`,
      [startDate, normalizeLimit(limit)],
    );

    return rows.map(taskRowToModel);
  };

  return {
    listTasks,
    getTask,
    createTask,
    updateTask,
    toggleTask,
    deleteTask,
    listTasksForDate,
    listAttentionTasks,
    listUpcomingTasks,
  };
};
