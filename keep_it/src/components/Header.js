"use client";

import { Search } from "lucide-react";
import { usePathname } from "next/navigation";

const pageTitles = { "/": "Dashboard", "/notes": "Notes", "/tasks": "Tasks", "/calendar": "Calendar", "/wallet": "Wallet", "/vault": "Vault", "/settings": "Settings" };

const Header = () => {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/90 sm:px-5 lg:px-7">
      <div>
        <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">Workspace</p>
        <h1 className="text-sm font-semibold text-slate-900">{pageTitles[pathname] || "Keep_it!"}</h1>
      </div>
      <div className="flex items-center gap-2">
        <label className="relative block">
          <span className="sr-only">Search workspace</span>
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="search" placeholder="Search" className="h-9 w-32 rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#74aeb7] focus:bg-white focus:ring-2 focus:ring-[#dceff1] sm:w-48 md:w-60 md:placeholder:text-transparent md:focus:placeholder:text-slate-400" />
        </label>
      </div>
    </header>
  );
};

export default Header;
