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

const normalizePathname = (path) => path !== "/" ? path.replace(/\/+$/, "") : path;

const Navigation = () => {
  const pathname = normalizePathname(usePathname());
  const [profileName, setProfileName] = useState("Dusky");

  useEffect(() => {
    const timer = window.setTimeout(() => setProfileName(window.localStorage.getItem("keepit-profile-name") || "Dusky"), 0);
    const updateName = (event) => setProfileName(event.detail || "Dusky");
    window.addEventListener("keepit-profile-updated", updateName);
    return () => { window.clearTimeout(timer); window.removeEventListener("keepit-profile-updated", updateName); };
  }, []);

  const linkClass = (path) => {
    const isActive = pathname === path;
    return `relative flex h-11 min-w-0 items-center justify-center rounded-xl px-2 text-sm transition lg:h-auto lg:justify-start lg:gap-3 lg:px-3 lg:py-2.5 ${isActive ? "bg-slate-900 font-semibold text-white" : "font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-950"}`;
  };

  const label = (name) => <span className="hidden lg:block">{name}</span>;

  return (
    <aside className="sticky top-0 z-40 flex h-screen w-[72px] shrink-0 flex-col border-r border-slate-200 bg-white px-3 py-4 lg:w-60 lg:px-4 lg:py-5">
      <div className="flex items-center justify-center lg:justify-start">
        <Link href="/" title="Keep_it!" aria-label="Keep_it! dashboard" className="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-950">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-900 text-sm text-white">K</span>
          <span className="hidden lg:block">Keep_it!</span>
        </Link>
      </div>

      <div className="mt-8 hidden items-center gap-3 border-b border-slate-100 pb-6 lg:flex">
        <div className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">{profileName.charAt(0).toUpperCase()}</div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{profileName}</p>
          <p className="truncate text-xs text-slate-500">Personal workspace</p>
        </div>
      </div>

      <p className="mt-6 hidden px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 lg:block">Modules</p>

      <nav aria-label="Workspace modules" className="mt-6 flex flex-col gap-1 lg:mt-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.path} href={item.path} title={item.name} aria-label={item.name} aria-current={pathname === item.path ? "page" : undefined} className={linkClass(item.path)}>
              <Icon size={18} strokeWidth={2} />
              {label(item.name)}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-slate-100 pt-4">
        <Link href="/settings" title="Settings" aria-label="Settings" aria-current={pathname === "/settings" ? "page" : undefined} className={linkClass("/settings")}>
          <Settings size={18} />
          {label("Settings")}
        </Link>
      </div>
    </aside>
  );
};

export default Navigation;
