"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { getNoteClient } from "@/data/notes/noteClient";

const emptyNotes = [];

const NoteContext = createContext(null);

export const NoteProvider = ({ children }) => {
  const [notes, setNotes] = useState(emptyNotes);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const clientRef = useRef(null);
  const pendingWritesRef = useRef(new Map());

  useEffect(() => {
    let active = true;
    const noteClient = getNoteClient(emptyNotes);
    clientRef.current = noteClient;
    noteClient.list()
      .then((storedNotes) => { if (active) setNotes(storedNotes); })
      .catch((loadError) => { if (active) setError(loadError instanceof Error ? loadError.message : "Notes could not be loaded."); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, []);

  const getClient = useCallback(() => {
    if (!clientRef.current) clientRef.current = getNoteClient(emptyNotes);
    return clientRef.current;
  }, []);

  const addNote = useCallback(async (note) => {
    setError("");
    try {
      const created = await getClient().create(note);
      setNotes((current) => [created, ...current]);
      return created;
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "The note could not be created.");
      throw createError;
    }
  }, [getClient]);

  const updateNote = useCallback((id, changes) => {
    setError("");
    setNotes((current) => current.map((note) => note.id === id ? { ...note, ...changes, updatedAt: new Date().toISOString() } : note));

    const previousWrite = pendingWritesRef.current.get(id) || Promise.resolve();
    const write = previousWrite
      .catch(() => undefined)
      .then(() => getClient().update(id, changes))
      .then((saved) => {
        setNotes((current) => current.map((note) => note.id === id ? saved : note));
        return saved;
      })
      .catch((updateError) => {
        setError(updateError instanceof Error ? updateError.message : "The note could not be saved.");
        throw updateError;
      });

    pendingWritesRef.current.set(id, write);
    write.finally(() => {
      if (pendingWritesRef.current.get(id) === write) pendingWritesRef.current.delete(id);
    }).catch(() => undefined);
    return write;
  }, [getClient]);

  const deleteNote = useCallback(async (id) => {
    setError("");
    await pendingWritesRef.current.get(id)?.catch(() => undefined);
    try {
      const deleted = await getClient().delete(id);
      if (deleted) setNotes((current) => current.filter((note) => note.id !== id));
      return deleted;
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "The note could not be deleted.");
      throw deleteError;
    }
  }, [getClient]);

  return <NoteContext.Provider value={{ notes, isLoading, error, addNote, updateNote, deleteNote }}>{children}</NoteContext.Provider>;
};

export const useNotes = () => {
  const context = useContext(NoteContext);
  if (!context) throw new Error("useNotes must be used inside NoteProvider");
  return context;
};
