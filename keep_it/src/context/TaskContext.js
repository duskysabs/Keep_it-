"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { getTaskClient } from "@/data/tasks/taskClient";

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

const emptyTasks = [];

const TaskContext = createContext(null);

export const TaskProvider = ({ children }) => {
  const [tasks, setTasks] = useState(emptyTasks);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const clientRef = useRef(null);

  useEffect(() => {
    let active = true;
    const taskClient = getTaskClient(emptyTasks);
    clientRef.current = taskClient;

    taskClient.list()
      .then((storedTasks) => {
        if (active) setTasks(storedTasks);
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Tasks could not be loaded.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => { active = false; };
  }, []);

  const getClient = useCallback(() => {
    if (!clientRef.current) clientRef.current = getTaskClient(emptyTasks);
    return clientRef.current;
  }, []);

  const runMutation = useCallback(async (operation, applyResult) => {
    setError("");
    try {
      const result = await operation(getClient());
      applyResult(result);
      return result;
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : "The task change could not be saved.");
      throw mutationError;
    }
  }, [getClient]);

  const addTask = useCallback((task) => runMutation(
    (taskClient) => taskClient.create(task),
    (createdTask) => setTasks((current) => [createdTask, ...current]),
  ), [runMutation]);

  const updateTask = useCallback((id, changes) => runMutation(
    (taskClient) => taskClient.update(id, changes),
    (updatedTask) => setTasks((current) => current.map((task) => task.id === id ? updatedTask : task)),
  ), [runMutation]);

  const deleteTask = useCallback((id) => runMutation(
    (taskClient) => taskClient.delete(id),
    (deleted) => { if (deleted) setTasks((current) => current.filter((task) => task.id !== id)); },
  ), [runMutation]);

  const toggleTask = useCallback((id) => runMutation(
    (taskClient) => taskClient.toggle(id),
    (updatedTask) => setTasks((current) => current.map((task) => task.id === id ? updatedTask : task)),
  ), [runMutation]);

  return <TaskContext.Provider value={{ tasks, isLoading, error, addTask, updateTask, deleteTask, toggleTask }}>{children}</TaskContext.Provider>;
};

export const useTasks = () => {
  const context = useContext(TaskContext);
  if (!context) throw new Error("useTasks must be used inside TaskProvider");
  return context;
};
