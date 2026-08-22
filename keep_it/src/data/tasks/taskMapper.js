const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const normalizeTaskTitle = (title) => {
  if (typeof title !== "string") throw new TypeError("Task title must be text.");
  const normalizedTitle = title.trim();
  if (!normalizedTitle) throw new Error("Task title is required.");
  if (normalizedTitle.length > 300) throw new Error("Task title must be 300 characters or fewer.");
  return normalizedTitle;
};

export const normalizeTaskDueDate = (due) => {
  if (due === undefined || due === null || due === "") return null;
  if (typeof due !== "string" || !DATE_ONLY_PATTERN.test(due)) {
    throw new Error("Task due date must use YYYY-MM-DD format.");
  }

  const [year, month, day] = due.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12);
  const isValid = date.getFullYear() === year
    && date.getMonth() === month - 1
    && date.getDate() === day;

  if (!isValid) throw new Error("Task due date is not a valid calendar date.");
  return due;
};

export const taskRowToModel = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    due: row.due_date ?? "",
    done: row.completed_at !== null,
  };
};
