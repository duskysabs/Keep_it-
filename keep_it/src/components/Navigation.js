"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CalendarDays, LayoutDashboard, LockKeyhole, NotebookPen, Settings, SquareCheckBig, WalletCards } from "lucide-react";

const navigationItems = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard },
  { name: "Vault", path: "/vault", icon: LockKeyhole },
  { name: "Notes", path: "/notes", icon: NotebookPen },
  { name: "Tasks", path: "/tasks", icon: SquareCheckBig },
  { name: "Calendar", path: "/calendar", icon: CalendarDays },
  { name: "Wallet", path: "/wallet", icon: WalletCards },
];

const Navigation = () => {
  const pathname = usePathname();
  const [profileName, setProfileName] = useState("Dusky");

  useEffect(() => {
    const timer = window.setTimeout(() => setProfileName(window.localStorage.getItem("keepit-profile-name") || "Dusky"), 0);
    const updateName = (event) => setProfileName(event.detail || "Dusky");
    window.addEventListener("keepit-profile-updated", updateName);
    return () => { window.clearTimeout(timer); window.removeEventListener("keepit-profile-updated", updateName); };
  }, []);

  const linkClass = (path) => {
    const isActive = pathname === path;
    return `flex min-w-0 items-center justify-center gap-2 rounded-lg px-2 py-2.5 text-sm transition lg:justify-start lg:gap-3 lg:px-3 ${isActive ? "bg-slate-900 font-semibold text-white" : "font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-950"}`;
  };

  return (
    <aside className="border-b border-slate-200 bg-white px-4 py-4 lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-60 lg:flex-col lg:border-b-0 lg:border-r lg:px-4 lg:py-5">
      <div className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-950">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-900 text-sm text-white">K</span>
          Keep_it!
        </Link>
        <span className="rounded-full border border-slate-200 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 lg:hidden">Personal</span>
      </div>

      <div className="mt-8 hidden items-center gap-3 border-b border-slate-100 pb-6 lg:flex">
        <div className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">{profileName.charAt(0).toUpperCase()}</div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{profileName}</p>
          <p className="truncate text-xs text-slate-500">Personal workspace</p>
        </div>
      </div>

      <p className="mt-6 hidden px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 lg:block">Modules</p>

      <nav className="mt-4 grid grid-cols-3 gap-1 sm:grid-cols-4 lg:mt-2 lg:flex lg:flex-col lg:overflow-visible lg:pb-0">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.path} href={item.path} className={linkClass(item.path)}>
              <Icon size={17} strokeWidth={2} />
              <span>{item.name}</span>
            </Link>
          );
        })}
        <Link href="/settings" className={`${linkClass("/settings")} lg:hidden`}>
          <Settings size={17} />
          <span>Settings</span>
        </Link>
      </nav>

      <div className="mt-auto hidden border-t border-slate-100 pt-4 lg:block">
        <Link href="/settings" className={linkClass("/settings")}>
          <Settings size={17} />
          <span>Settings</span>
        </Link>
      </div>
    </aside>
  );
};

export default Navigation;
