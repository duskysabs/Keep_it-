"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { getVaultClient } from "@/data/vault/vaultClient";

const initialStatus = {
  configured: false,
  unlocked: false,
  credentialCount: 0,
  settings: { autoLockMinutes: 5, clearClipboardSeconds: 30, backupCreatedAt: null, lastPasswordChangeAt: null },
  mode: "memory",
};

const VaultContext = createContext(null);

export const VaultProvider = ({ children }) => {
  const [credentials, setCredentials] = useState([]);
  const [status, setStatus] = useState(initialStatus);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const clientRef = useRef(null);

  const getClient = useCallback(() => {
    if (!clientRef.current) clientRef.current = getVaultClient();
    return clientRef.current;
  }, []);

  const loadUnlockedCredentials = useCallback(async (vaultStatus) => {
    if (!vaultStatus.unlocked) {
      setCredentials([]);
      return [];
    }
    const storedCredentials = await getClient().list();
    setCredentials(storedCredentials);
    return storedCredentials;
  }, [getClient]);

  useEffect(() => {
    let active = true;
    const vaultClient = getClient();
    vaultClient.status()
      .then(async (storedStatus) => {
        if (!active) return;
        const nextStatus = { ...storedStatus, mode: vaultClient.mode };
        setStatus(nextStatus);
        if (nextStatus.unlocked) {
          const storedCredentials = await vaultClient.list();
          if (active) setCredentials(storedCredentials);
        } else if (active) setCredentials([]);
      })
      .catch((loadError) => { if (active) setError(loadError instanceof Error ? loadError.message : "The vault could not be loaded."); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [getClient]);

  const runStatusOperation = useCallback(async (operation, loadCredentials = false) => {
    setError("");
    try {
      const nextStatus = { ...await operation(getClient()), mode: getClient().mode };
      setStatus(nextStatus);
      if (loadCredentials) await loadUnlockedCredentials(nextStatus);
      return nextStatus;
    } catch (operationError) {
      setError(operationError instanceof Error ? operationError.message : "The vault operation failed.");
      throw operationError;
    }
  }, [getClient, loadUnlockedCredentials]);

  const setupVault = useCallback((masterPassword) => runStatusOperation((client) => client.setup(masterPassword), true), [runStatusOperation]);
  const unlockVault = useCallback((masterPassword) => runStatusOperation((client) => client.unlock(masterPassword), true), [runStatusOperation]);
  const lockVault = useCallback(() => runStatusOperation((client) => client.lock()).then((nextStatus) => { setCredentials([]); return nextStatus; }), [runStatusOperation]);
  const changeMasterPassword = useCallback((passwords) => runStatusOperation((client) => client.changeMasterPassword(passwords), true), [runStatusOperation]);
  const updateVaultSettings = useCallback((changes) => runStatusOperation((client) => client.updateSettings(changes)), [runStatusOperation]);

  const runCredentialOperation = useCallback(async (operation, applyResult) => {
    setError("");
    try {
      const result = await operation(getClient());
      applyResult(result);
      setStatus((current) => ({ ...current, credentialCount: typeof result === "boolean" ? current.credentialCount - (result ? 1 : 0) : current.credentialCount }));
      return result;
    } catch (operationError) {
      if (String(operationError?.message).includes("locked")) {
        const nextStatus = { ...await getClient().status(), mode: getClient().mode };
        setStatus(nextStatus);
        setCredentials([]);
      }
      setError(operationError instanceof Error ? operationError.message : "The credential change could not be saved.");
      throw operationError;
    }
  }, [getClient]);

  const addCredential = useCallback((values) => runCredentialOperation(
    (client) => client.create(values),
    (credential) => {
      setCredentials((current) => [credential, ...current]);
      setStatus((current) => ({ ...current, credentialCount: current.credentialCount + 1 }));
    },
  ), [runCredentialOperation]);

  const updateCredential = useCallback((id, changes) => runCredentialOperation(
    (client) => client.update(id, changes),
    (credential) => setCredentials((current) => current.map((item) => item.id === id ? credential : item)),
  ), [runCredentialOperation]);

  const deleteCredential = useCallback((id) => runCredentialOperation(
    (client) => client.delete(id),
    (deleted) => { if (deleted) setCredentials((current) => current.filter((item) => item.id !== id)); },
  ), [runCredentialOperation]);

  useEffect(() => {
    if (!status.unlocked || status.settings.autoLockMinutes === 0) return;
    let lockTimer;
    let lastActivityPing = 0;
    const resetTimer = () => {
      window.clearTimeout(lockTimer);
      lockTimer = window.setTimeout(() => { lockVault().catch(() => undefined); }, status.settings.autoLockMinutes * 60_000);
      if (Date.now() - lastActivityPing > 30_000) {
        lastActivityPing = Date.now();
        getClient().activity().catch(() => undefined);
      }
    };
    resetTimer();
    window.addEventListener("pointerdown", resetTimer, { passive: true });
    window.addEventListener("keydown", resetTimer);
    return () => {
      window.clearTimeout(lockTimer);
      window.removeEventListener("pointerdown", resetTimer);
      window.removeEventListener("keydown", resetTimer);
    };
  }, [getClient, lockVault, status.settings.autoLockMinutes, status.unlocked]);

  return <VaultContext.Provider value={{ credentials, status, isLoading, error, setupVault, unlockVault, lockVault, changeMasterPassword, updateVaultSettings, addCredential, updateCredential, deleteCredential }}>{children}</VaultContext.Provider>;
};

export const useVault = () => {
  const context = useContext(VaultContext);
  if (!context) throw new Error("useVault must be used inside VaultProvider");
  return context;
};
