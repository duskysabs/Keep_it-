"use client";

import { createContext, useContext, useState } from "react";

export const toISODate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const relativeDate = (days) => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return toISODate(date);
};

const starterTasks = [
  { id: "1", title: "Review monthly budget", due: relativeDate(0), done: false },
  { id: "2", title: "Organize vault credentials", due: relativeDate(1), done: false },
  { id: "3", title: "Write project notes", due: relativeDate(2), done: true },
  { id: "4", title: "Plan next week", due: relativeDate(3), done: false },
];

const TaskContext = createContext(null);

export const TaskProvider = ({ children }) => {
  const [tasks, setTasks] = useState(starterTasks);

  const addTask = (task) => setTasks((current) => [{ id: crypto.randomUUID(), title: task.title, due: task.due || "", done: false }, ...current]);
  const updateTask = (id, changes) => setTasks((current) => current.map((task) => task.id === id ? { id: task.id, title: changes.title ?? task.title, due: changes.due ?? task.due, done: changes.done ?? task.done } : task));
  const deleteTask = (id) => setTasks((current) => current.filter((task) => task.id !== id));
  const toggleTask = (id) => setTasks((current) => current.map((task) => task.id === id ? { ...task, done: !task.done } : task));

  return <TaskContext.Provider value={{ tasks, setTasks, addTask, updateTask, deleteTask, toggleTask }}>{children}</TaskContext.Provider>;
};

export const useTasks = () => {
  const context = useContext(TaskContext);
  if (!context) throw new Error("useTasks must be used inside TaskProvider");
  return context;
};
