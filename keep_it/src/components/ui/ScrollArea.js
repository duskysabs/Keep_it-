"use client";

import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";

const ScrollArea = ({ children, className = "", viewportClassName = "", type = "hover" }) => (
  <ScrollAreaPrimitive.Root type={type} scrollHideDelay={450} className={`relative overflow-hidden ${className}`}>
    <ScrollAreaPrimitive.Viewport className={`h-full w-full rounded-[inherit] ${viewportClassName}`}>
      {children}
    </ScrollAreaPrimitive.Viewport>
    <ScrollAreaPrimitive.Scrollbar orientation="vertical" className="flex w-2.5 touch-none select-none p-0.5 transition-colors">
      <ScrollAreaPrimitive.Thumb className="relative flex-1 rounded-full bg-slate-300/70 transition-colors hover:bg-slate-400/80" />
    </ScrollAreaPrimitive.Scrollbar>
  </ScrollAreaPrimitive.Root>
);

export default ScrollArea;
