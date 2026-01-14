import * as React from "react";
import { cn } from "../utils/cn";

export const Button = React.forwardRef(function Button(
  { className, variant = "solid", ...props },
  ref
) {
  const variantClasses = {
    solid: "border-slate-800 bg-slate-50 text-slate-900 hover:bg-white",
    outline:
      "border-slate-700 bg-transparent text-slate-100 hover:bg-slate-900/40",
    ghost:
      "border-transparent bg-transparent text-slate-100 hover:bg-slate-900/40",
  };

  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-semibold transition-shadow transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:pointer-events-none disabled:opacity-60 hover:-translate-y-0.5 hover:shadow-[0_10px_25px_rgba(56,189,248,0.2)]",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
});

Button.displayName = "Button";
