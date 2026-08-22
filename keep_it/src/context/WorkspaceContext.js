"use client";

import { createContext, useContext, useState } from "react";

const WorkspaceContext = createContext(null);

export const WorkspaceProvider = ({ children }) => {
  const [activities, setActivities] = useState([]);

  const recordActivity = (type, action, item) => setActivities((current) => [{ id: crypto.randomUUID(), type, action, item, time: "Just now" }, ...current].slice(0, 30));

  return <WorkspaceContext.Provider value={{ activities, recordActivity }}>{children}</WorkspaceContext.Provider>;
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return context;
};
