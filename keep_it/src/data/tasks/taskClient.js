const cloneTask = (task) => ({ ...task });

const createMemoryTaskClient = (initialTasks) => {
  let tasks = initialTasks.map(cloneTask);

  return {
    list: async () => tasks.map(cloneTask),
    create: async ({ title, due = "" }) => {
      const task = { id: crypto.randomUUID(), title: title.trim(), due, done: false };
      tasks = [task, ...tasks];
      return cloneTask(task);
    },
    update: async (id, changes) => {
      let updatedTask = null;
      tasks = tasks.map((task) => {
        if (task.id !== id) return task;
        updatedTask = {
          id: task.id,
          title: changes.title ?? task.title,
          due: changes.due ?? task.due,
          done: changes.done ?? task.done,
        };
        return updatedTask;
      });
      if (!updatedTask) throw new Error(`Task not found: ${id}`);
      return cloneTask(updatedTask);
    },
    toggle: async (id) => {
      const task = tasks.find((item) => item.id === id);
      if (!task) throw new Error(`Task not found: ${id}`);
      const updatedTask = { ...task, done: !task.done };
      tasks = tasks.map((item) => item.id === id ? updatedTask : item);
      return cloneTask(updatedTask);
    },
    delete: async (id) => {
      const previousLength = tasks.length;
      tasks = tasks.filter((task) => task.id !== id);
      return tasks.length !== previousLength;
    },
  };
};

let client;

export const getTaskClient = (initialTasks) => {
  if (client) return client;
  if (typeof window !== "undefined" && window.keepIt?.tasks) {
    client = window.keepIt.tasks;
    return client;
  }
  client = createMemoryTaskClient(initialTasks);
  return client;
};
