"use client";

import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { DayPicker } from "react-day-picker";
import { CalendarDays, X } from "lucide-react";

const parseDate = (value) => value ? new Date(`${value}T12:00:00`) : undefined;

const toISODate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const displayDate = (value) => value
  ? new Intl.DateTimeFormat("en", { month: "long", day: "numeric", year: "numeric" }).format(parseDate(value))
  : "Choose a due date";

const DatePicker = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const selected = parseDate(value);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <div className="relative mt-2">
        <Popover.Trigger asChild>
          <button type="button" aria-label="Choose due date" className={`flex h-11 w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 pr-11 text-left text-sm outline-none transition hover:border-slate-300 focus:border-[#74aeb7] focus:ring-2 focus:ring-[#dceff1] ${value ? "text-slate-700" : "text-slate-400"}`}>
            <CalendarDays size={16} className="shrink-0 text-slate-400" />
            <span className="truncate">{displayDate(value)}</span>
          </button>
        </Popover.Trigger>
        {value && <button type="button" onClick={() => onChange("")} aria-label="Clear due date" title="Clear due date" className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={14} /></button>}
      </div>

      <Popover.Portal>
        <Popover.Content onEscapeKeyDown={(event) => event.stopPropagation()} sideOffset={8} align="start" collisionPadding={12} className="z-[90] rounded-xl border border-slate-200 bg-white p-3 shadow-xl outline-none">
          <DayPicker
            mode="single"
            animate
            showOutsideDays
            selected={selected}
            defaultMonth={selected}
            onSelect={(date) => {
              if (!date) return;
              onChange(toISODate(date));
              setOpen(false);
            }}
            className="keepit-calendar"
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

export default DatePicker;
