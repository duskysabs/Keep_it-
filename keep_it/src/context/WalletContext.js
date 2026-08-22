"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { getWalletClient } from "@/data/wallets/walletClient";

const emptyWalletData = { wallets: [], transactions: [] };

const WalletContext = createContext(null);

export const WalletProvider = ({ children }) => {
  const [wallets, setWallets] = useState(emptyWalletData.wallets);
  const [transactions, setTransactions] = useState(emptyWalletData.transactions);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const clientRef = useRef(null);

  useEffect(() => {
    let active = true;
    const walletClient = getWalletClient(emptyWalletData);
    clientRef.current = walletClient;
    Promise.all([walletClient.listWallets(), walletClient.listTransactions()])
      .then(([storedWallets, storedTransactions]) => {
        if (!active) return;
        setWallets(storedWallets);
        setTransactions(storedTransactions);
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Wallet data could not be loaded.");
      })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, []);

  const getClient = useCallback(() => {
    if (!clientRef.current) clientRef.current = getWalletClient(emptyWalletData);
    return clientRef.current;
  }, []);

  const runMutation = useCallback(async (operation, applyResult) => {
    setError("");
    try {
      const result = await operation(getClient());
      applyResult(result);
      return result;
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : "The wallet change could not be saved.");
      throw mutationError;
    }
  }, [getClient]);

  const addWallet = useCallback((values) => runMutation(
    (client) => client.createWallet(values),
    (wallet) => setWallets((current) => [...current, wallet]),
  ), [runMutation]);

  const updateWallet = useCallback((id, changes) => runMutation(
    (client) => client.updateWallet(id, changes),
    (wallet) => setWallets((current) => current.map((item) => item.id === id ? wallet : item)),
  ), [runMutation]);

  const deleteWallet = useCallback((id) => runMutation(
    (client) => client.deleteWallet(id),
    (deleted) => {
      if (!deleted) return;
      setWallets((current) => current.filter((wallet) => wallet.id !== id));
      setTransactions((current) => current.filter((transaction) => transaction.walletId !== id && transaction.targetWalletId !== id));
    },
  ), [runMutation]);

  const addTransaction = useCallback((values) => runMutation(
    (client) => client.createTransaction(values),
    (transaction) => setTransactions((current) => [transaction, ...current]),
  ), [runMutation]);

  const updateTransaction = useCallback((id, changes) => runMutation(
    (client) => client.updateTransaction(id, changes),
    (transaction) => setTransactions((current) => current.map((item) => item.id === id ? transaction : item)),
  ), [runMutation]);

  const deleteTransaction = useCallback((id) => runMutation(
    (client) => client.deleteTransaction(id),
    (deleted) => { if (deleted) setTransactions((current) => current.filter((transaction) => transaction.id !== id)); },
  ), [runMutation]);

  return (
    <WalletContext.Provider value={{
      wallets,
      transactions,
      isLoading,
      error,
      addWallet,
      updateWallet,
      deleteWallet,
      addTransaction,
      updateTransaction,
      deleteTransaction,
    }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallets = () => {
  const context = useContext(WalletContext);
  if (!context) throw new Error("useWallets must be used inside WalletProvider");
  return context;
};
