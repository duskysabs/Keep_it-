"use client";

import * as Select from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";

const SelectField = ({ value, defaultValue, onValueChange, options, ariaLabel, className = "", compact = false }) => (
  <Select.Root value={value} defaultValue={defaultValue} onValueChange={onValueChange}>
    <Select.Trigger aria-label={ariaLabel} className={`flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white text-left text-slate-700 outline-none transition hover:border-slate-300 focus:border-[#74aeb7] focus:ring-2 focus:ring-[#dceff1] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:ring-[#23434a] ${compact ? "h-9 min-w-28 px-3 text-xs" : "h-11 w-full px-3 text-sm"} ${className}`}>
      <Select.Value />
      <Select.Icon className="text-slate-400"><ChevronDown size={16} /></Select.Icon>
    </Select.Trigger>
    <Select.Portal>
      <Select.Content position="popper" sideOffset={6} collisionPadding={12} className="z-[110] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <Select.ScrollUpButton className="grid h-7 place-items-center text-slate-400"><ChevronUp size={15} /></Select.ScrollUpButton>
        <Select.Viewport>
          {options.map((option) => {
            const item = typeof option === "string" ? { value: option, label: option } : option;
            return <Select.Item key={item.value} value={item.value} className="relative flex cursor-pointer select-none items-center rounded-lg py-2 pl-3 pr-9 text-sm text-slate-600 outline-none data-[highlighted]:bg-slate-100 data-[highlighted]:text-slate-950 dark:text-slate-300 dark:data-[highlighted]:bg-slate-800 dark:data-[highlighted]:text-white"><Select.ItemText>{item.label}</Select.ItemText><Select.ItemIndicator className="absolute right-3 text-[#167d8d] dark:text-cyan-300"><Check size={14} /></Select.ItemIndicator></Select.Item>;
          })}
        </Select.Viewport>
        <Select.ScrollDownButton className="grid h-7 place-items-center text-slate-400"><ChevronDown size={15} /></Select.ScrollDownButton>
      </Select.Content>
    </Select.Portal>
  </Select.Root>
);

export default SelectField;
