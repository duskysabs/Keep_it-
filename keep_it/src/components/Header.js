"use client";

import { usePathname } from "next/navigation";

const pageTitles = { "/": "Dashboard", "/notes": "Notes", "/tasks": "Tasks", "/calendar": "Calendar", "/wallet": "Wallet", "/vault": "Vault", "/settings": "Settings" };
const normalizePathname = (path) => path !== "/" ? path.replace(/\/+$/, "") : path;

const Header = () => {
  const pathname = normalizePathname(usePathname());
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-xl sm:px-5 lg:px-7">
      <div>
        <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">Workspace</p>
        <h1 className="text-sm font-semibold text-slate-900">{pageTitles[pathname] || "Keep_it!"}</h1>
      </div>
    </header>
  );
};

export default Header;
