"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Copy, Eye, EyeOff, KeyRound, LockKeyhole, Pencil, Plus, Search, Trash2, UserRound, WandSparkles, X, XCircle } from "lucide-react";
import ScrollArea from "@/components/ui/ScrollArea";
import SelectField from "@/components/ui/SelectField";
import VaultAccessDialog from "@/components/VaultAccessDialog";
import { useVault } from "@/context/VaultContext";
import { useWorkspace } from "@/context/WorkspaceContext";

const emptyForm = { name: "", username: "", password: "", url: "", notes: "" };

const VaultPage = () => {
  const { recordActivity } = useWorkspace();
  const { credentials, status, isLoading, error: vaultError, setupVault, unlockVault, addCredential, updateCredential, deleteCredential: removeCredential } = useVault();
  const [visible, setVisible] = useState([]);
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState("");
  const [toast, setToast] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [originalForm, setOriginalForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [editingId, setEditingId] = useState("");
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [generator, setGenerator] = useState({ length: 18, uppercase: true, lowercase: true, numbers: true, symbols: true });
  const [accessMode, setAccessMode] = useState("");
  const [setupSkipped, setSetupSkipped] = useState(false);
  const [pendingNewCredential, setPendingNewCredential] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!status.configured) setAccessMode(setupSkipped ? "" : "setup");
    else if (!status.unlocked) {
      setAccessMode("unlock");
      setShowForm(false);
      setConfirmation("");
      setVisible([]);
      setForm(emptyForm);
      setOriginalForm(emptyForm);
    }
    else setAccessMode("");
  }, [isLoading, setupSkipped, status.configured, status.unlocked]);

  useEffect(() => {
    if (!showForm && !confirmation) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [showForm, confirmation]);

  const protectionChecks = [
    { label: "Master password configured", complete: status.configured },
    { label: "Auto-lock enabled", complete: status.settings.autoLockMinutes > 0 },
    { label: "Encrypted backup created", complete: Boolean(status.settings.backupCreatedAt) },
  ];
  const protectionScore = protectionChecks.filter((check) => check.complete).length;
  const protectionStatus = protectionScore === 3 ? "Healthy" : protectionScore === 2 ? "Needs attention" : "At risk";
  const formIsDirty = JSON.stringify(form) !== JSON.stringify(originalForm);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(""), 1800);
  };

  const toggleVisible = (id) => setVisible(visible.includes(id) ? visible.filter((item) => item !== id) : [...visible, id]);

  const copyValue = async (credential, field) => {
    const copiedValue = credential[field];
    await navigator.clipboard.writeText(copiedValue);
    const copyId = `${credential.id}-${field}`;
    setCopied(copyId);
    showToast(field === "password" ? "Password copied" : "Username copied");
    setTimeout(() => setCopied(""), 1200);
    if (field === "password" && status.settings.clearClipboardSeconds > 0) {
      setTimeout(async () => {
        try {
          if (await navigator.clipboard.readText() === copiedValue) await navigator.clipboard.writeText("");
        } catch { /* Clipboard access may be unavailable after the window loses focus. */ }
      }, status.settings.clearClipboardSeconds * 1000);
    }
  };

  const updateForm = (field, value) => {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
    if (errors[field]) setErrors((currentErrors) => ({ ...currentErrors, [field]: "" }));
  };

  const updateGenerator = (field, value) => setGenerator((currentGenerator) => ({ ...currentGenerator, [field]: value }));

  const generatePassword = () => {
    const selectedGroups = [
      generator.uppercase && "ABCDEFGHJKLMNPQRSTUVWXYZ",
      generator.lowercase && "abcdefghijkmnopqrstuvwxyz",
      generator.numbers && "23456789",
      generator.symbols && "!@#$%&*?",
    ].filter(Boolean);

    if (selectedGroups.length === 0) {
      setErrors({ ...errors, password: "Select at least one character type." });
      return;
    }

    const allCharacters = selectedGroups.join("");
    const passwordLength = Number(generator.length) || 18;
    let randomHex = "";
    while (randomHex.length < passwordLength * 2) randomHex += window.crypto.randomUUID().replaceAll("-", "");
    let generatedPassword = "";
    for (let index = 0; index < passwordLength; index += 1) {
      const randomValue = Number.parseInt(randomHex.slice(index * 2, index * 2 + 2), 16);
      generatedPassword += allCharacters[randomValue % allCharacters.length];
    }
    setForm((currentForm) => ({ ...currentForm, password: generatedPassword }));
    setErrors((currentErrors) => ({ ...currentErrors, password: "" }));
    showToast("Strong password generated");
  };

  const validateForm = () => {
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = "Enter the website or service name.";
    if (!form.username.trim()) nextErrors.username = "Enter a username or email.";
    if (!form.password) nextErrors.password = "Enter or generate a password.";
    if (form.url && !/^https?:\/\//i.test(form.url)) nextErrors.url = "Start the address with http:// or https://.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const closeForm = () => {
    setShowForm(false);
    setConfirmation("");
    setErrors({});
  };

  const requestClose = () => formIsDirty ? setConfirmation("discard") : closeForm();

  const saveCredential = async (event) => {
    event.preventDefault();
    if (!validateForm()) return;
    const cleanedForm = { ...form, name: form.name.trim(), username: form.username.trim(), url: form.url.trim(), notes: form.notes.trim() };

    try {
      if (editingId) {
        await updateCredential(editingId, cleanedForm);
        recordActivity("credential", "Updated a credential", cleanedForm.name);
        showToast("Credential updated");
      } else {
        await addCredential(cleanedForm);
        recordActivity("credential", "Added a credential", cleanedForm.name);
        showToast("Credential added");
      }
      closeForm();
    } catch (saveError) {
      setErrors((current) => ({ ...current, form: saveError instanceof Error ? saveError.message : "The credential could not be saved." }));
    }
  };

  const openNewCredential = () => {
    if (!status.configured) {
      setPendingNewCredential(true);
      setAccessMode("setup");
      return;
    }
    setEditingId("");
    setForm(emptyForm);
    setOriginalForm(emptyForm);
    setErrors({});
    setShowFormPassword(false);
    setShowForm(true);
  };

  const submitAccess = async (value) => {
    if (accessMode === "setup") await setupVault(value);
    else await unlockVault(value);
    setAccessMode("");
    if (pendingNewCredential) {
      setPendingNewCredential(false);
      setEditingId("");
      setForm(emptyForm);
      setOriginalForm(emptyForm);
      setErrors({});
      setShowFormPassword(false);
      setShowForm(true);
    }
  };

  const closeAccess = () => {
    if (accessMode === "setup") setSetupSkipped(true);
    setPendingNewCredential(false);
    setAccessMode("");
  };

  const openCredential = (credential) => {
    const credentialForm = { name: credential.name, username: credential.username, password: credential.password, url: credential.url || "", notes: credential.notes || "" };
    setEditingId(credential.id);
    setForm(credentialForm);
    setOriginalForm(credentialForm);
    setErrors({});
    setShowFormPassword(false);
    setShowForm(true);
  };

  const deleteCredential = async () => {
    try {
      await removeCredential(editingId);
      recordActivity("credential", "Deleted a credential", form.name);
      setVisible(visible.filter((id) => id !== editingId));
      closeForm();
      showToast("Credential deleted");
    } catch (deleteError) {
      setErrors((current) => ({ ...current, form: deleteError instanceof Error ? deleteError.message : "The credential could not be deleted." }));
      setConfirmation("");
    }
  };

  const filtered = credentials.filter((item) => `${item.name} ${item.username} ${item.url} ${item.notes}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <main className="mx-auto max-w-[1400px] p-4 sm:p-5 lg:p-8">
      {toast && <div role="status" className="fixed right-5 top-5 z-[70] flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-xl"><CheckCircle2 size={16} className="text-emerald-400" />{toast}</div>}
      {vaultError && status.unlocked && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{vaultError}</p>}
      {accessMode && <VaultAccessDialog mode={accessMode} onSubmit={submitAccess} onClose={accessMode === "setup" ? closeAccess : undefined} secondaryLabel="Skip for now" externalError={vaultError} />}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><h2 className="text-2xl font-bold text-slate-950">Your vault</h2><p className="mt-1 text-sm text-slate-500">Track all of your accounts and passwords.</p></div>
        <button onClick={openNewCredential} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white sm:w-auto sm:self-start"><Plus size={16} /> New credential</button>
      </div>

      {showForm && <div className="fixed inset-0 z-50 grid place-items-center overflow-hidden bg-slate-950/40 p-4 backdrop-blur-sm" role="presentation" onMouseDown={requestClose}>
        <form onSubmit={saveCredential} onMouseDown={(event) => event.stopPropagation()} className="w-full max-w-xl">
          <ScrollArea className="h-[calc(100vh-2rem)] max-h-[760px] rounded-3xl border border-slate-200 bg-white shadow-2xl">
          <div className="p-4 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div><h3 className="text-xl font-bold text-slate-950">{editingId ? "Edit credential" : "Add a credential"}</h3><p className="mt-1 text-sm text-slate-500">{editingId ? "Update this login or remove it from your vault." : "Save a login now or generate a strong password first."}</p></div>
            <button type="button" onClick={requestClose} aria-label="Close credential form" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-400 hover:bg-slate-100"><X size={18} /></button>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2"><span className="text-xs font-bold uppercase tracking-wider text-slate-500">Website or service</span><input value={form.name} onChange={(event) => updateForm("name", event.target.value)} placeholder="Example: GitHub" className={`mt-2 h-11 w-full rounded-xl border px-3 text-sm outline-none focus:ring-2 focus:ring-[#dceff1] ${errors.name ? "border-rose-400" : "border-slate-200 focus:border-[#74aeb7]"}`} />{errors.name && <p className="mt-1 text-xs text-rose-600">{errors.name}</p>}</label>
            <label className="block sm:col-span-2"><span className="text-xs font-bold uppercase tracking-wider text-slate-500">Username or email</span><input value={form.username} onChange={(event) => updateForm("username", event.target.value)} placeholder="you@example.com" className={`mt-2 h-11 w-full rounded-xl border px-3 text-sm outline-none focus:ring-2 focus:ring-[#dceff1] ${errors.username ? "border-rose-400" : "border-slate-200 focus:border-[#74aeb7]"}`} />{errors.username && <p className="mt-1 text-xs text-rose-600">{errors.username}</p>}</label>
            <label className="block sm:col-span-2"><span className="text-xs font-bold uppercase tracking-wider text-slate-500">Website address <span className="font-normal normal-case text-slate-400">(optional)</span></span><input value={form.url} onChange={(event) => updateForm("url", event.target.value)} placeholder="https://example.com" className={`mt-2 h-11 w-full rounded-xl border px-3 text-sm outline-none focus:ring-2 focus:ring-[#dceff1] ${errors.url ? "border-rose-400" : "border-slate-200 focus:border-[#74aeb7]"}`} />{errors.url && <p className="mt-1 text-xs text-rose-600">{errors.url}</p>}</label>

            <div className="sm:col-span-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Password</span>
              <div className="mt-2 flex gap-2"><div className="relative min-w-0 flex-1"><input type={showFormPassword ? "text" : "password"} value={form.password} onChange={(event) => updateForm("password", event.target.value)} placeholder="Enter or generate a password" className={`h-11 w-full rounded-xl border px-3 pr-11 font-mono text-sm outline-none focus:ring-2 focus:ring-[#dceff1] ${errors.password ? "border-rose-400" : "border-slate-200 focus:border-[#74aeb7]"}`} /><button type="button" onClick={() => setShowFormPassword(!showFormPassword)} aria-label={showFormPassword ? "Hide password" : "Show password"} className="absolute right-1 top-1 grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-100">{showFormPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div><button type="button" onClick={generatePassword} className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-[#b9dadd] bg-[#edf7f8] px-3 text-xs font-bold text-[#116b78]"><WandSparkles size={15} /><span className="hidden sm:inline">Generate</span></button></div>
              {errors.password && <p className="mt-1 text-xs text-rose-600">{errors.password}</p>}
              <div className="mt-3 rounded-xl bg-slate-50 p-3"><div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-2"><div className="col-span-2 flex items-center gap-2 text-xs font-semibold text-slate-600 sm:col-span-1">Length <SelectField value={String(generator.length)} onValueChange={(length) => updateGenerator("length", Number(length))} options={["12", "18", "24", "32"]} ariaLabel="Password length" compact /></div>{[["uppercase", "A–Z"], ["lowercase", "a–z"], ["numbers", "0–9"], ["symbols", "Symbols"]].map(([field, label]) => <label key={field} className="flex items-center gap-1.5 text-xs text-slate-500"><input type="checkbox" checked={generator[field]} onChange={(event) => updateGenerator(field, event.target.checked)} className="accent-[#167d8d]" />{label}</label>)}</div></div>
            </div>

            <label className="block sm:col-span-2"><span className="text-xs font-bold uppercase tracking-wider text-slate-500">Notes <span className="font-normal normal-case text-slate-400">(optional)</span></span><textarea value={form.notes} onChange={(event) => updateForm("notes", event.target.value)} placeholder="Add anything helpful about this account" rows={3} className="mt-2 w-full resize-none rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-[#74aeb7] focus:ring-2 focus:ring-[#dceff1]" /></label>
          </div>

          {errors.form && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{errors.form}</p>}
          <div className="mt-7 flex items-center gap-2">{editingId && <button type="button" onClick={() => setConfirmation("delete")} aria-label="Delete credential" title="Delete credential" className="grid h-10 w-10 place-items-center rounded-xl text-rose-600 transition hover:bg-rose-50"><Trash2 size={17} /></button>}<div className="ml-auto flex gap-2"><button type="button" onClick={requestClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-100">Cancel</button><button type="submit" className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">{editingId ? "Save changes" : "Add credential"}</button></div></div>
          </div>
          </ScrollArea>
        </form>
      </div>}

      {confirmation && <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/50 p-4" role="presentation"><div role="alertdialog" aria-modal="true" className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"><div className={`grid h-10 w-10 place-items-center rounded-xl ${confirmation === "delete" ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"}`}>{confirmation === "delete" ? <Trash2 size={18} /> : <AlertCircle size={18} />}</div><h3 className="mt-4 font-bold text-slate-950">{confirmation === "delete" ? `Delete ${form.name}?` : "Discard unsaved changes?"}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{confirmation === "delete" ? "This credential will be removed from your vault. This cannot be undone." : "The changes you made to this credential will be lost."}</p><div className="mt-5 flex justify-end gap-2"><button onClick={() => setConfirmation("")} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-100">Keep editing</button><button onClick={confirmation === "delete" ? deleteCredential : closeForm} className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white ${confirmation === "delete" ? "bg-rose-600" : "bg-slate-900"}`}>{confirmation === "delete" ? "Delete" : "Discard"}</button></div></div></div>}

      <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div>
          <label className="relative block"><span className="sr-only">Search vault</span><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search credentials" className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 text-sm outline-none focus:border-[#74aeb7]" /></label>
          <div className="mt-3 space-y-3">
            {filtered.map((credential) => <article key={credential.id} onClick={() => openCredential(credential)} className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-[#b9dadd] hover:shadow-sm"><div className="flex min-w-0 flex-wrap items-center gap-3 sm:gap-4"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-100 text-sm font-bold text-slate-600">{credential.name[0]}</div><div className="min-w-0 flex-1"><h3 className="truncate font-bold text-slate-900">{credential.name}</h3><p className="truncate text-xs text-slate-400">{credential.username}</p></div><div className="flex shrink-0 items-center gap-1"><code className="mr-2 hidden min-w-32 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 md:block">{visible.includes(credential.id) ? credential.password : "••••••••••••"}</code><button onClick={(event) => { event.stopPropagation(); toggleVisible(credential.id); }} aria-label={visible.includes(credential.id) ? `Hide password for ${credential.name}` : `Show password for ${credential.name}`} className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 hover:bg-slate-100">{visible.includes(credential.id) ? <EyeOff size={17} /> : <Eye size={17} />}</button><button onClick={(event) => { event.stopPropagation(); copyValue(credential, "username"); }} aria-label={`Copy username for ${credential.name}`} className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 hover:bg-slate-100">{copied === `${credential.id}-username` ? <CheckCircle2 size={17} className="text-emerald-600" /> : <UserRound size={17} />}</button><button onClick={(event) => { event.stopPropagation(); copyValue(credential, "password"); }} aria-label={`Copy password for ${credential.name}`} className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 hover:bg-slate-100">{copied === `${credential.id}-password` ? <CheckCircle2 size={17} className="text-emerald-600" /> : <Copy size={17} />}</button><span className="grid h-9 w-9 place-items-center rounded-xl text-slate-300 group-hover:text-slate-500"><Pencil size={16} /></span></div></div></article>)}

            {credentials.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#edf7f8] text-[#167d8d]"><KeyRound size={21} /></div><h3 className="mt-4 font-bold text-slate-900">Your vault is empty</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">Add your first credential to keep an account, username, and password together.</p><button onClick={openNewCredential} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"><Plus size={16} /> Add first credential</button></div>}
            {credentials.length > 0 && filtered.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center"><Search size={22} className="mx-auto text-slate-400" /><h3 className="mt-4 font-bold text-slate-900">No credentials found</h3><p className="mt-2 text-sm text-slate-500">Nothing matches “{search}”. Try a different search.</p><button onClick={() => setSearch("")} className="mt-4 text-sm font-bold text-[#167d8d]">Clear search</button></div>}
          </div>
        </div>

        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between"><h3 className="font-bold text-slate-900">Protection</h3><LockKeyhole size={18} className={protectionScore === 3 ? "text-emerald-600" : "text-amber-500"} /></div>
          <div className="mt-5 flex items-end justify-between"><p className="text-3xl font-bold">{protectionScore}/3</p><span className={`text-xs font-bold ${protectionScore === 3 ? "text-emerald-600" : protectionScore === 2 ? "text-amber-600" : "text-rose-600"}`}>{protectionStatus}</span></div>
          <div className="mt-3 h-2 rounded-full bg-slate-100"><div className={`h-full rounded-full ${protectionScore === 3 ? "bg-emerald-500" : "bg-amber-400"}`} style={{ width: `${(protectionScore / 3) * 100}%` }} /></div>
          <div className="mt-5 space-y-3 text-xs text-slate-500">{protectionChecks.map((check) => <div key={check.label} className="flex items-center gap-2">{check.complete ? <CheckCircle2 size={14} className="text-emerald-600" /> : <XCircle size={14} className="text-amber-500" />}{check.label}</div>)}</div>
          <Link href="/settings#security" className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"><KeyRound size={15} /> Security settings</Link>
        </aside>
      </section>
    </main>
  );
};

export default VaultPage;
