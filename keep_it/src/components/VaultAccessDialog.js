"use client";

import { useState } from "react";
import { KeyRound, LockKeyhole, X } from "lucide-react";

const modeCopy = {
  setup: {
    title: "Create your master password",
    description: "This password unlocks your encrypted credentials on this device.",
    submit: "Create vault",
  },
  unlock: {
    title: "Unlock your vault",
    description: "Enter your master password to decrypt your credentials for this session.",
    submit: "Unlock vault",
  },
  change: {
    title: "Change master password",
    description: "Your encrypted vault key will be protected by the new password.",
    submit: "Change password",
  },
};

const VaultAccessDialog = ({ mode, onSubmit, onClose, secondaryLabel = "Cancel", externalError = "" }) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const copy = modeCopy[mode];
  const canClose = mode === "setup" || Boolean(onClose);

  const submit = async (event) => {
    event.preventDefault();
    const candidate = mode === "unlock" ? currentPassword : newPassword;
    if (!candidate) return setError("Enter your master password.");
    if (mode !== "unlock" && candidate.length < 12) return setError("Use at least 12 characters.");
    if (mode !== "unlock" && candidate !== confirmation) return setError("The new passwords do not match.");
    setSubmitting(true);
    setError("");
    try {
      if (mode === "change") await onSubmit({ currentPassword, newPassword });
      else await onSubmit(candidate);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "The vault operation failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm" role="presentation" onMouseDown={() => onClose?.()}>
      <form onSubmit={submit} onMouseDown={(event) => event.stopPropagation()} className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#edf7f8] text-[#167d8d]">{mode === "unlock" ? <LockKeyhole size={18} /> : <KeyRound size={18} />}</span>
            <div><h3 className="text-lg font-bold text-slate-950">{copy.title}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{copy.description}</p></div>
          </div>
          {canClose && <button type="button" onClick={() => onClose?.()} aria-label="Close master password dialog" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-400 hover:bg-slate-100"><X size={18} /></button>}
        </div>

        <div className="mt-6 space-y-4">
          {(mode === "unlock" || mode === "change") && <label className="block"><span className="text-xs font-bold uppercase tracking-wider text-slate-500">{mode === "change" ? "Current master password" : "Master password"}</span><input autoFocus type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => { setCurrentPassword(event.target.value); setError(""); }} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#74aeb7] focus:ring-2 focus:ring-[#dceff1]" /></label>}
          {mode !== "unlock" && <><label className="block"><span className="text-xs font-bold uppercase tracking-wider text-slate-500">New master password</span><input autoFocus={mode === "setup"} type="password" autoComplete="new-password" value={newPassword} onChange={(event) => { setNewPassword(event.target.value); setError(""); }} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#74aeb7] focus:ring-2 focus:ring-[#dceff1]" /><span className="mt-1.5 block text-[11px] text-slate-400">At least 12 characters. It cannot be recovered if forgotten.</span></label><label className="block"><span className="text-xs font-bold uppercase tracking-wider text-slate-500">Confirm new password</span><input type="password" autoComplete="new-password" value={confirmation} onChange={(event) => { setConfirmation(event.target.value); setError(""); }} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#74aeb7] focus:ring-2 focus:ring-[#dceff1]" /></label></>}
        </div>

        {(error || externalError) && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{error || externalError}</p>}
        <div className="mt-6 flex justify-end gap-2">{canClose && <button type="button" onClick={() => onClose?.()} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-100">{mode === "setup" ? "Skip for now" : secondaryLabel}</button>}<button disabled={submitting} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60">{submitting ? "Working…" : copy.submit}</button></div>
      </form>
    </div>
  );
};

export default VaultAccessDialog;
