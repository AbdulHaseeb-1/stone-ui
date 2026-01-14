import * as React from "react";
import { cn } from "../utils/cn";

export const NeonBorder = React.forwardRef(function NeonBorder(
  { className, glowColor = "#6ee7ff", style, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border bg-slate-950/60 p-4 shadow-[0_0_18px_var(--stone-neon-color)] [border-color:var(--stone-neon-color)]",
        className
      )}
      style={{ ...style, ["--stone-neon-color"]: glowColor }}
      {...props}
    />
  );
});

NeonBorder.displayName = "NeonBorder";
