"use client";

import { useEffect, useState } from "react";
import { Check, Clipboard, Database, Download, Laptop, Lock, LockKeyhole, Moon, Palette, RefreshCw, ShieldCheck, Sparkles, Sun, UserRound, X } from "lucide-react";
import SelectField from "@/components/ui/SelectField";

const SettingToggle = ({ label, description, enabled, onChange }) => (
  <div className="flex items-center justify-between gap-4 py-4">
    <div><p className="text-sm font-semibold text-slate-800">{label}</p><p className="mt-1 text-xs leading-5 text-slate-400">{description}</p></div>
    <button type="button" role="switch" aria-checked={enabled} onClick={onChange} className={`relative h-6 w-11 shrink-0 rounded-full transition ${enabled ? "bg-[#167d8d]" : "bg-slate-200"}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${enabled ? "left-6" : "left-1"}`} /></button>
  </div>
);

const SecuritySettings = () => {
  const [autoLock, setAutoLock] = useState(true);
  const [lockOnClose, setLockOnClose] = useState(true);
  const [clearClipboard, setClearClipboard] = useState(true);

  return (
    <div className="space-y-4" id="security">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><ShieldCheck size={19} /></div><div><h3 className="font-bold text-slate-900">Vault access</h3><p className="mt-1 text-xs leading-5 text-slate-400">Your master password protects access to encrypted credentials.</p></div></div>
          <span className="w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Configured</span>
        </div>
        <div className="mt-5 flex flex-wrap gap-2"><button className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-700">Change master password</button><button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"><Lock size={14} /> Lock vault now</button></div>
        <p className="mt-3 text-xs text-slate-400">Last changed: Never</p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white px-5">
        <div className="border-b border-slate-100 py-5"><div className="flex items-center gap-2"><LockKeyhole size={17} className="text-slate-400" /><h3 className="font-bold text-slate-900">Auto-lock</h3></div><p className="mt-1 text-xs text-slate-400">Control when Keep_it! asks for your master password again.</p></div>
        <SettingToggle label="Auto-lock vault" description="Lock the vault after a period without activity." enabled={autoLock} onChange={() => setAutoLock(!autoLock)} />
        {autoLock && <div className="flex items-center justify-between gap-4 border-t border-slate-100 py-4"><span className="text-sm font-semibold text-slate-800">Lock after</span><SelectField defaultValue="5 minutes" options={["1 minute", "5 minutes", "15 minutes", "30 minutes", "1 hour"]} ariaLabel="Lock after" compact /></div>}
        <div className="border-t border-slate-100"><SettingToggle label="Lock when app closes" description="Require your master password each time the app starts." enabled={lockOnClose} onChange={() => setLockOnClose(!lockOnClose)} /></div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white px-5">
        <div className="border-b border-slate-100 py-5"><div className="flex items-center gap-2"><Clipboard size={17} className="text-slate-400" /><h3 className="font-bold text-slate-900">Clipboard privacy</h3></div></div>
        <SettingToggle label="Clear copied passwords" description="Remove copied passwords from the clipboard automatically." enabled={clearClipboard} onChange={() => setClearClipboard(!clearClipboard)} />
        {clearClipboard && <div className="flex items-center justify-between gap-4 border-t border-slate-100 py-4"><span className="text-sm font-semibold text-slate-800">Clear after</span><SelectField defaultValue="30 seconds" options={["15 seconds", "30 seconds", "60 seconds"]} ariaLabel="Clear clipboard after" compact /></div>}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2"><Sparkles size={17} className="text-slate-400" /><h3 className="font-bold text-slate-900">Password generator</h3></div><p className="mt-1 text-xs text-slate-400">Defaults used when you generate a new password.</p>
        <div className="mt-5 flex items-center justify-between gap-4"><span className="text-sm font-semibold text-slate-800">Default length</span><SelectField defaultValue="18 characters" options={["12 characters", "18 characters", "24 characters", "32 characters"]} ariaLabel="Default password length" compact /></div>
        <p className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">Includes uppercase and lowercase letters, numbers, and symbols while avoiding similar-looking characters.</p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2"><Database size={17} className="text-slate-400" /><h3 className="font-bold text-slate-900">Backup and recovery</h3></div><p className="mt-1 text-xs leading-5 text-slate-400">Create an encrypted copy of your local data or restore a previous copy.</p>
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">Your master password cannot be recovered. Keep it somewhere safe or you may lose access to encrypted data.</div>
        <div className="mt-4 flex flex-wrap gap-2"><button className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white"><Download size={14} /> Create backup</button><button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600"><RefreshCw size={14} /> Restore backup</button></div>
        <p className="mt-3 text-xs text-slate-400">Most recent backup: No backup created yet</p>
      </section>
    </div>
  );
};

const SettingsPage = () => {
  const [activeSection, setActiveSection] = useState("Profile");
  const [name, setName] = useState("Dusky");
  const [draftName, setDraftName] = useState("Dusky");
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [theme, setTheme] = useState("system");
  const sections = [["Profile", UserRound], ["Appearance", Palette], ["Security", LockKeyhole]];

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (window.location.hash === "#security") setActiveSection("Security");
      const savedName = window.localStorage.getItem("keepit-profile-name") || "Dusky";
      const savedTheme = window.localStorage.getItem("keepit-theme") || "system";
      setName(savedName);
      setDraftName(savedName);
      setTheme(savedTheme);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!editingProfile) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event) => { if (event.key === "Escape") setEditingProfile(false); };
    document.addEventListener("keydown", closeOnEscape);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", closeOnEscape); };
  }, [editingProfile]);

  const chooseTheme = (nextTheme) => {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", nextTheme === "dark" || (nextTheme === "system" && prefersDark));
    window.localStorage.setItem("keepit-theme", nextTheme);
    setTheme(nextTheme);
  };

  const saveProfile = (event) => {
    event.preventDefault();
    const nextName = draftName.trim();
    if (!nextName) return setProfileError("Enter a name.");
    setName(nextName);
    window.localStorage.setItem("keepit-profile-name", nextName);
    window.dispatchEvent(new CustomEvent("keepit-profile-updated", { detail: nextName }));
    setEditingProfile(false);
    setProfileError("");
  };

  const themeOptions = [
    ["light", "Light", "Bright and clear", Sun],
    ["dark", "Dark", "Comfortable in low light", Moon],
    ["system", "System", "Match your computer", Laptop],
  ];

  return (
    <main className="mx-auto max-w-[1400px] p-4 sm:p-5 lg:p-8">
      <div><h2 className="text-2xl font-bold text-slate-950">Settings</h2><p className="mt-1 text-sm text-slate-500">Make Keep_it! feel right for the way you work.</p></div>
      <div className="mt-7 grid gap-4 lg:grid-cols-[220px_1fr]">
        <nav className="grid h-fit grid-cols-3 rounded-2xl border border-slate-200 bg-white p-2 lg:block">{sections.map(([name, Icon]) => <button key={name} onClick={() => setActiveSection(name)} className={`flex w-full items-center justify-center gap-2 rounded-xl px-2 py-2.5 text-sm font-semibold lg:justify-start lg:gap-3 lg:px-3 lg:text-left ${activeSection === name ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50"}`}><Icon size={16} />{name}</button>)}</nav>
        {activeSection === "Security" ? <SecuritySettings /> : activeSection === "Profile" ? <section className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="font-bold text-slate-900">Profile</h3><p className="mt-1 text-xs text-slate-400">The name shown across your personal workspace.</p><div className="mt-5 flex flex-col gap-4 rounded-2xl bg-slate-50 p-4 sm:flex-row sm:items-center"><div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#e4f2f4] text-xl font-bold text-[#116b78] dark:text-cyan-200">{name.charAt(0).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="truncate font-bold text-slate-900">{name}</p><p className="text-sm text-slate-400">Personal workspace</p></div><button onClick={() => { setDraftName(name); setProfileError(""); setEditingProfile(true); }} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50">Edit profile</button></div></section> : <section className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="font-bold text-slate-900">Appearance</h3><p className="mt-1 text-xs text-slate-400">Choose how Keep_it! looks on this device.</p><div className="mt-5 grid gap-3 sm:grid-cols-3">{themeOptions.map(([value, label, description, Icon]) => <button key={value} onClick={() => chooseTheme(value)} className={`relative rounded-2xl border p-4 text-left transition ${theme === value ? "border-[#167d8d] bg-[#edf7f8] dark:border-[#4f95a1] dark:bg-[#15323a]" : "border-slate-200 hover:border-slate-300"}`}><span className={`grid h-10 w-10 place-items-center rounded-xl ${theme === value ? "bg-[#167d8d] text-white" : "bg-slate-100 text-slate-500"}`}><Icon size={18} /></span><p className="mt-4 text-sm font-bold text-slate-900">{label}</p><p className="mt-1 text-xs leading-5 text-slate-400">{description}</p>{theme === value && <span className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full bg-[#167d8d] text-white"><Check size={13} /></span>}</button>)}</div></section>}
      </div>

      {editingProfile && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm" onMouseDown={() => setEditingProfile(false)}><form onSubmit={saveProfile} onMouseDown={(event) => event.stopPropagation()} className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl sm:p-6"><div className="flex items-start justify-between gap-4"><div><h3 className="text-xl font-bold text-slate-950">Edit profile</h3><p className="mt-1 text-sm text-slate-500">Change the name shown in your workspace.</p></div><button type="button" onClick={() => setEditingProfile(false)} aria-label="Close profile editor" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-400 hover:bg-slate-100"><X size={18} /></button></div><label className="mt-6 block"><span className="text-xs font-bold uppercase tracking-wider text-slate-500">Name</span><input autoFocus value={draftName} onChange={(event) => { setDraftName(event.target.value); setProfileError(""); }} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#74aeb7] focus:ring-2 focus:ring-[#dceff1]" /></label>{profileError && <p role="alert" className="mt-2 text-xs font-semibold text-rose-600">{profileError}</p>}<div className="mt-7 flex justify-end gap-2"><button type="button" onClick={() => setEditingProfile(false)} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-100">Cancel</button><button className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">Save</button></div></form></div>}
    </main>
  );
};

export default SettingsPage;
